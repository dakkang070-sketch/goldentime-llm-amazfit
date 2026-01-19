const express = require('express');
const router = express.Router();
const Controller = require('../models/Controller');
const User = require('../models/User');
const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const Hospital = require('../models/Hospital');
const { authRequired: requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { cacheMiddleware } = require('../middleware/cache');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { autoMatchHospitalForCase } = require('../services/hospitalService');
const { emitParamedicMatched, emitHospitalMatched } = require('../services/socketService');

/**
 * 관제사 가입
 * POST /api/controllers/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '이름, 이메일, 비밀번호는 필수입니다.'
      });
    }

    const existing = await Controller.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '이미 등록된 이메일입니다.'
      });
    }

    const controller = await Controller.create({
      name,
      email,
      password,
      phone,
      role: role || 'controller'
    });

    res.status(201).json({
      success: true,
      message: '관제사 가입이 완료되었습니다.',
      controller: {
        id: controller._id,
        name: controller.name,
        email: controller.email,
        role: controller.role
      }
    });
  } catch (error) {
    console.error('관제사 가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '관제사 가입 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 관제사 로그인
 * POST /api/controllers/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    const controller = await Controller.findOne({ email });
    if (!controller) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const isMatch = await controller.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const { signControllerToken } = require('../services/jwtService');
    const token = signControllerToken(controller);

    controller.status = 'online';
    controller.lastActivity = new Date();
    await controller.save();

    res.json({
      success: true,
      message: '로그인 성공',
      token,
      controller: {
        id: controller._id,
        name: controller.name,
        email: controller.email,
        role: controller.role
      }
    });
  } catch (error) {
    console.error('관제사 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 배정된 회원 목록 조회
 * GET /api/controllers/me/users
 */
router.get('/me/users', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const controllerId = req.user.userId;
    const controller = await Controller.findById(controllerId).populate('assignedUsers', 'name phone status hospitalMode');
    
    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      users: controller.assignedUsers || []
    });
  } catch (error) {
    console.error('배정 회원 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배정 회원 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 활성 응급 상황 목록 조회
 * GET /api/controllers/emergency-cases
 */
router.get('/emergency-cases', requireAuth, requireRole('controller'), cacheMiddleware(10), async (req, res) => {
  try {
    const { status, emergencyLevel } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      // 기본: 진행 중인 케이스만
      query.status = { $in: ['detected', 'matched', 'in_progress', 'transporting'] };
    }

    if (emergencyLevel) {
      query.emergencyLevel = parseInt(emergencyLevel);
    }

    const cases = await EmergencyCase.find(query)
      .populate('userId', 'name phone age gender baselineBiometric')
      .populate('paramedic.paramedicId', 'name phone currentLocation')
      .populate('hospital.hospitalId', 'name location emergencyRoom')
      .select('+llmAnalysis +detectedAnomalies') // LLM 분석 결과 포함
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      cases
    });
  } catch (error) {
    console.error('응급 상황 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 상황 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 케이스의 생체 데이터 조회
 * GET /api/controllers/emergency-cases/:caseId/biometric
 */
router.get('/emergency-cases/:caseId/biometric', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const BiometricData = require('../models/BiometricData');
    
    const emergencyCase = await EmergencyCase.findById(caseId).populate('userId', '_id');
    if (!emergencyCase) {
      return res.status(404).json({
        success: false,
        message: '응급 케이스를 찾을 수 없습니다.'
      });
    }

    // 케이스 감지 시간 기준으로 생체 데이터 조회 (감지 시간 ±5분)
    const detectedTime = new Date(emergencyCase.detectedAt || emergencyCase.createdAt);
    const startTime = new Date(detectedTime.getTime() - 5 * 60 * 1000);
    const endTime = new Date(detectedTime.getTime() + 5 * 60 * 1000);

    // 최근 생체 데이터 (최대 50개)
    const biometricData = await BiometricData.find({
      userId: emergencyCase.userId._id,
      collectedAt: {
        $gte: startTime,
        $lte: endTime
      }
    })
      .sort({ collectedAt: -1 })
      .limit(50)
      .select('collectedAt heartRate stressLevel movementStatus')
      .lean();

    // 최신 생체 데이터
    const latestBiometric = await BiometricData.findOne({
      userId: emergencyCase.userId._id
    })
      .sort({ collectedAt: -1 })
      .select('heartRate stressLevel movementStatus collectedAt')
      .lean();

    res.json({
      success: true,
      biometric: latestBiometric,
      history: biometricData.reverse(), // 시간순 정렬
      baseline: emergencyCase.userId?.baselineBiometric
    });
  } catch (error) {
    console.error('생체 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '생체 데이터 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 수동 응급구조사 매칭
 * POST /api/controllers/emergency-cases/:caseId/match-paramedic
 */
router.post('/emergency-cases/:caseId/match-paramedic', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { paramedicId } = req.body;

    const ec = await EmergencyCase.findById(caseId);
    if (!ec) {
      return res.status(404).json({
        success: false,
        message: '응급 상황을 찾을 수 없습니다.'
      });
    }

    if (paramedicId) {
      // 특정 응급구조사 지정
      const Paramedic = require('../models/Paramedic');
      const paramedic = await Paramedic.findById(paramedicId);
      if (!paramedic) {
        return res.status(404).json({
          success: false,
          message: '응급구조사를 찾을 수 없습니다.'
        });
      }

      ec.paramedic = {
        paramedicId,
        matchedAt: new Date(),
        status: 'pending'
      };
      ec.matchingType = 'manual';
      ec.status = 'matched';
      await ec.save();

      // 응급구조사에게 알림 추가
      await Paramedic.findByIdAndUpdate(paramedicId, {
        $push: {
          pendingCases: {
            caseId: ec._id,
            receivedAt: new Date(),
            distance: 0 // 수동 매칭이므로 거리 정보 없음
          }
        }
      });

      // Socket.IO 알림
      emitParamedicMatched(ec._id, paramedicId, ec);

      res.json({
        success: true,
        message: '응급구조사가 매칭되었습니다.',
        case: ec
      });
    } else {
      // 자동 매칭 재시도
      const result = await autoMatchParamedicForCase(caseId);
      if (result.matched) {
        res.json({
          success: true,
          message: '자동 매칭이 완료되었습니다.',
          result
        });
      } else {
        res.status(400).json({
          success: false,
          message: '매칭할 수 있는 응급구조사가 없습니다.',
          reason: result.reason
        });
      }
    }
  } catch (error) {
    console.error('수동 매칭 오류:', error);
    res.status(500).json({
      success: false,
      message: '매칭 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 수동 병원 매칭
 * POST /api/controllers/emergency-cases/:caseId/match-hospital
 */
router.post('/emergency-cases/:caseId/match-hospital', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { hospitalId } = req.body;

    const ec = await EmergencyCase.findById(caseId);
    if (!ec) {
      return res.status(404).json({
        success: false,
        message: '응급 상황을 찾을 수 없습니다.'
      });
    }

    if (hospitalId) {
      // 특정 병원 지정
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: '병원을 찾을 수 없습니다.'
        });
      }

      const estimatedMinutes = 30; // 기본값
      const estimatedArrival = new Date(Date.now() + estimatedMinutes * 60 * 1000);

      ec.hospital = {
        hospitalId,
        matchedAt: new Date(),
        estimatedArrivalTime: estimatedArrival,
        status: 'matched'
      };
      ec.locations.hospital = {
        lat: hospital.location.lat,
        lng: hospital.location.lng,
        address: hospital.location.address || ''
      };
      await ec.save();

      // Socket.IO 알림
      emitHospitalMatched(ec._id, hospitalId, ec);

      res.json({
        success: true,
        message: '병원이 매칭되었습니다.',
        case: ec
      });
    } else {
      // 자동 매칭 재시도
      const result = await autoMatchHospitalForCase(caseId);
      if (result.matched) {
        res.json({
          success: true,
          message: '자동 병원 매칭이 완료되었습니다.',
          result
        });
      } else {
        res.status(400).json({
          success: false,
          message: '매칭할 수 있는 병원이 없습니다.',
          reason: result.reason
        });
      }
    }
  } catch (error) {
    console.error('병원 매칭 오류:', error);
    res.status(500).json({
      success: false,
      message: '병원 매칭 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 사용 가능한 응급구조사 목록 조회
 * GET /api/controllers/paramedics/available
 */
router.get('/paramedics/available', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const paramedics = await Paramedic.find({
      status: { $in: ['available', 'off_duty'] }
    })
      .select('name phone email status currentLocation licenseNumber')
      .lean();

    res.json({
      success: true,
      paramedics
    });
  } catch (error) {
    console.error('응급구조사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급구조사 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 병원 목록 조회
 * GET /api/controllers/hospitals
 */
router.get('/hospitals', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const hospitals = await Hospital.find({})
      .select('name location emergencyRoom phone')
      .lean();

    res.json({
      success: true,
      hospitals
    });
  } catch (error) {
    console.error('병원 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '병원 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
