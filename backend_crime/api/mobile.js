/**
 * 응급 사용자앱 전용 API
 * STARMAX BLE 기기 연동 및 실시간 데이터 처리
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const { signUserToken } = require('../services/jwtService');
const { authenticateToken } = require('../middleware/auth');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { generateNonDiagnosticSummary } = require('../services/ollamaService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/mobile/signup:
 *   post:
 *     summary: 응급 사용자 회원가입
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - password
 *               - birthDate
 *               - age
 *               - height
 *               - weight
 *               - bloodType
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               age:
 *                 type: number
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               bloodType:
 *                 type: string
 *                 enum: [A, B, AB, O]
 *               emergencyContacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     relationship:
 *                       type: string
 *               medicalHistory:
 *                 type: object
 *                 properties:
 *                   medications:
 *                     type: array
 *                   allergies:
 *                     type: array
 *                   chronicDiseases:
 *                     type: array
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/signup', async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      height,
      weight,
      bloodType,
      emergencyContacts = [],
      medicalHistory = {},
      consents = {}
    } = req.body;

    // 필수 필드 검증
    const requiredFields = [
      { field: 'name', label: '이름' },
      { field: 'email', label: '이메일' },
      { field: 'password', label: '비밀번호' },
      { field: 'birthDate', label: '생년월일' },
      { field: 'age', label: '나이' },
      { field: 'height', label: '신장' },
      { field: 'weight', label: '체중' },
      { field: 'bloodType', label: '혈액형' }
    ];
    
    const missingFields = requiredFields.filter(({ field }) => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `필수 정보가 누락되었습니다: ${missingFields.map(({ label }) => label).join(', ')}`,
        missingFields: missingFields.map(({ field }) => field)
      });
    }
    
    // 데이터 형식 검증
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '나이는 1세에서 120세 사이여야 합니다.'
      });
    }
    
    if (height < 50 || height > 250) {
      return res.status(400).json({
        success: false,
        message: '신장은 50cm에서 250cm 사이여야 합니다.'
      });
    }
    
    if (weight < 10 || weight > 300) {
      return res.status(400).json({
        success: false,
        message: '체중은 10kg에서 300kg 사이여야 합니다.'
      });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일 형식을 입력해주세요.'
      });
    }
    
    // 전화번호 형식 검증 (한국식) - 입력된 경우에만 검증
    const phoneRegex = /^01[0-9]{8,9}$/;
    let cleanPhone;
    
    if (phone && phone.trim()) {
      cleanPhone = phone.replace(/[^0-9]/g, '');
      
      if (cleanPhone.length > 0) {
        if (cleanPhone.startsWith('82')) {
          const rest = cleanPhone.slice(2);
          cleanPhone = rest.startsWith('0') ? rest : `0${rest}`;
        }
        if (!phoneRegex.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: '올바른 전화번호 형식을 입력해주세요. (예: 01012345678)'
          });
        }
      } else {
        cleanPhone = undefined;
      }
    }
    
    // 비밀번호 길이 검증 (제거됨)
    /*
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 6자 이상이어야 합니다.'
      });
    }
    */

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 가입된 이메일입니다.'
      });
    }

    // 전화번호 중복 확인
    if (cleanPhone) {
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: '이미 가입된 전화번호입니다.'
        });
      }
    }

    // 생년월일로 나이 자동 계산 (만약 나이가 없거나 0이면)
    let calculatedAge = age;
    if (!calculatedAge || calculatedAge === 0) {
      const birthDateObj = new Date(birthDate);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
      const monthDiff = today.getMonth() - birthDateObj.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        calculatedAge--;
      }
    }

    // 새 사용자 생성
    const user = new User({
      name,
      phone: cleanPhone || undefined,
      email,
      password,
      birthDate: new Date(birthDate),
      age: calculatedAge,
      height,
      weight,
      bloodType,
      medicalHistory,
      emergencySettings: {
        emergencyContacts: emergencyContacts.slice(0, 3), // 최대 3개
        autoReportEnabled: true,
        alertSensitivity: 2
      },
      consents: {
        emergencyAutoReport: consents.emergencyAutoReport !== false,
        personalInfoCollection: consents.personalInfoCollection !== false,
        preciseLocation: consents.preciseLocation !== false,
        emergencyAlgorithm: consents.emergencyAlgorithm !== false
      },
      isEmergencyAppUser: true,
      status: 'active'
    });

    await user.save();

    // JWT 토큰 생성
    const token = signUserToken(user._id);

    logger.info(`응급 사용자 회원가입 완료: ${email}`);

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        token
      }
    });
  } catch (error) {
    logger.error('응급 사용자 회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/login:
 *   post:
 *     summary: 응급 사용자 로그인
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 이메일 정규화 (공백 제거 및 소문자 변환)
    email = email.trim().toLowerCase();

    // 사용자 찾기 (응급앱 사용자만)
    const user = await User.findOne({ 
      email, 
      isEmergencyAppUser: true,
      status: 'active' 
    });

    if (!user) {
      // Debug logging
      const debugUser = await User.findOne({ email });
      if (debugUser) {
        logger.warn(`Login failed for ${email}: User exists but conditions mismatch`, {
          isEmergencyAppUser: debugUser.isEmergencyAppUser,
          status: debugUser.status
        });
      } else {
        logger.warn(`Login failed for ${email}: User not found`);
      }

      return res.status(401).json({
        success: false,
        message: '등록되지 않은 사용자입니다.'
      });
    }

    // 비밀번호 확인
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.'
      });
    }

    // 마지막 활동 업데이트
    user.lastActivity = new Date();
    await user.save();

    // JWT 토큰 생성
    const token = signUserToken(user._id);

    logger.info(`응급 사용자 로그인: ${email}`);

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          starmaxDevice: user.starmaxDevice,
          emergencySettings: user.emergencySettings
        },
        token
      }
    });
  } catch (error) {
    logger.error('응급 사용자 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
      .select('-password')
      .populate('assignedController', 'name phone');

    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          birthDate: user.birthDate,
          age: user.age,
          height: user.height,
          weight: user.weight,
          bloodType: user.bloodType,
          medicalHistory: user.medicalHistory,
          emergencySettings: user.emergencySettings,
          starmaxDevice: user.starmaxDevice,
          baselineBiometric: user.baselineBiometric,
          assignedController: user.assignedController,
          status: user.status,
          lastActivity: user.lastActivity
        }
      }
    });
  } catch (error) {
    logger.error('사용자 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/profile:
 *   put:
 *     summary: 사용자 프로필 수정
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               emergencyContacts:
 *                 type: array
 *               medicalHistory:
 *                 type: object
 *               emergencySettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 *       400:
 *         description: 잘못된 요청
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const allowedUpdates = ['name', 'phone', 'emergencyContacts', 'medicalHistory', 'emergencySettings'];
    const updates = {};

    // 허용된 필드만 업데이트
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'emergencyContacts') {
          updates['emergencySettings.emergencyContacts'] = req.body[field].slice(0, 3);
        } else if (field === 'emergencySettings') {
          Object.assign(user.emergencySettings, req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // 업데이트 적용
    if (Object.keys(updates).length > 0) {
      Object.assign(user, updates);
    }

    await user.save();

    logger.info(`사용자 프로필 수정: ${user.email}`);

    res.json({
      success: true,
      message: '프로필이 수정되었습니다.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          emergencySettings: user.emergencySettings
        }
      }
    });
  } catch (error) {
    logger.error('사용자 프로필 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/starmax/connect:
 *   post:
 *     summary: STARMAX BLE 기기 연결
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - deviceType
 *             properties:
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [watch, band]
 *               firmwareVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: 기기 연결 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/starmax/connect', authenticateToken, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, firmwareVersion } = req.body;

    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        message: '기기 정보를 입력해주세요.'
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // STARMAX 기기 정보 업데이트
    user.starmaxDevice = {
      deviceId,
      deviceName,
      deviceType,
      firmwareVersion: firmwareVersion || 'unknown',
      connectionStatus: 'connected',
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };

    await user.save();

    logger.info(`STARMAX 기기 연결: ${user.email} - ${deviceName}`);

    res.json({
      success: true,
      message: 'STARMAX 기기가 연결되었습니다.',
      data: {
        starmaxDevice: user.starmaxDevice
      }
    });
  } catch (error) {
    logger.error('STARMAX 기기 연결 오류:', error);
    res.status(500).json({
      success: false,
      message: '기기 연결 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/starmax/disconnect:
 *   post:
 *     summary: STARMAX BLE 기기 연결 해제
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 기기 연결 해제 성공
 */
router.post('/starmax/disconnect', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (!user.starmaxDevice || user.starmaxDevice.connectionStatus === 'disconnected') {
      return res.status(400).json({
        success: false,
        message: '연결된 기기가 없습니다.'
      });
    }

    // 기기 연결 상태 업데이트
    user.starmaxDevice.connectionStatus = 'disconnected';
    user.starmaxDevice.lastSyncAt = new Date();

    await user.save();

    logger.info(`STARMAX 기기 연결 해제: ${user.email}`);

    res.json({
      success: true,
      message: 'STARMAX 기기 연결이 해제되었습니다.'
    });
  } catch (error) {
    logger.error('STARMAX 기기 연결 해제 오류:', error);
    res.status(500).json({
      success: false,
      message: '기기 연결 해제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/biometric:
 *   post:
 *     summary: 실시간 생체 데이터 저장 (STARMAX BLE)
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - heartRate
 *               - bloodPressureSys
 *               - bloodPressureDia
 *               - spO2
 *               - temperature
 *             properties:
 *               heartRate:
 *                 type: number
 *               bloodPressureSys:
 *                 type: number
 *               bloodPressureDia:
 *                 type: number
 *               spO2:
 *                 type: number
 *               temperature:
 *                 type: number
 *               steps:
 *                 type: number
 *               sleep:
 *                 type: number
 *               stress:
 *                 type: number
 *               respiratoryRate:
 *                 type: number
 *               hrv:
 *                 type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 데이터 저장 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/biometric', authenticateToken, async (req, res) => {
  try {
    const {
      heartRate,
      bloodPressureSys,
      bloodPressureDia,
      spO2,
      temperature,
      steps = 0,
      sleep = 0,
      stress = 0,
      respiratoryRate = 16,
      hrv = 50,
      location,
      timestamp = new Date().toISOString()
    } = req.body;

    // 필수 필드 검증
    if (heartRate === undefined || bloodPressureSys === undefined || 
        bloodPressureDia === undefined || spO2 === undefined || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: '필수 생체 데이터를 입력해주세요.'
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // STARMAX 기기 동기화 시간 업데이트
    if (user.starmaxDevice) {
      user.starmaxDevice.lastSyncAt = new Date();
      await user.save();
    }

    // 생체 데이터 저장
    const biometricData = new BiometricData({
      userId: req.user.sub,
      collectedAt: new Date(timestamp),
      heartRate,
      bloodPressure: {
        systolic: bloodPressureSys,
        diastolic: bloodPressureDia
      },
      spO2,
      bodyTemperature: temperature,
      steps,
      sleepStatus: sleep > 0 ? 'light_sleep' : 'awake',
      stressLevel: stress,
      respiratoryRate,
      location: location || {
        lat: 37.5665, // 기본 위치 (서울)
        lng: 126.9780,
        timestamp: new Date()
      },
      rawData: req.body // 원본 데이터 저장
    });

    await biometricData.save();

    // 응급 상황 자동 감지
    let emergencyLevel = 1;
    const anomalies = [];

    // 심박수 이상 감지
    if (heartRate < 40 || heartRate > 150) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 이상: ${heartRate} bpm`,
        severity: heartRate < 40 ? 'critical' : 'high'
      });
    } else if (heartRate > 120) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 증가: ${heartRate} bpm`,
        severity: 'medium'
      });
    }

    // 산소포화도 이상 감지
    if (spO2 < 90) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'other',
        description: `산소포화도 위험: ${spO2}%`,
        severity: 'critical'
      });
    } else if (spO2 < 95) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'other',
        description: `산소포화도 저하: ${spO2}%`,
        severity: 'medium'
      });
    }

    // 혈압 이상 감지
    if (bloodPressureSys > 180 || bloodPressureDia > 110) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'other',
        description: `혈압 위험: ${bloodPressureSys}/${bloodPressureDia} mmHg`,
        severity: 'critical'
      });
    }

    // 체온 이상 감지
    if (temperature < 35 || temperature > 39) {
      emergencyLevel = Math.max(emergencyLevel, 3);
      anomalies.push({
        type: 'other',
        description: `체온 이상: ${temperature}°C`,
        severity: 'high'
      });
    }

    // 응급 상황 자동 생성 (레벨 3 이상)
    if (emergencyLevel >= 3) {
      // 최근 5분 내 동일한 응급 상황이 있는지 확인
      const recentEmergency = await EmergencyCase.findOne({
        userId: req.user.sub,
        status: { $in: ['detected', 'matched', 'in_progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (!recentEmergency) {
        // AI 분석 수행
        const aiAnalysis = await generateNonDiagnosticSummary({
          heartRate,
          bloodPressure: { systolic: bloodPressureSys, diastolic: bloodPressureDia },
          spO2,
          temperature,
          stressLevel: stress
        });

        // 응급 케이스 생성
        const emergencyCase = new EmergencyCase({
          userId: req.user.sub,
          emergencyLevel,
          detectedAnomalies: anomalies,
          llmAnalysis: {
            analysisText: aiAnalysis,
            confidence: 0.85,
            analyzedAt: new Date(),
            model: 'llama3.1'
          },
          locations: {
            detectedAt: {
              lat: location?.lat || 37.5665,
              lng: location?.lng || 126.9780,
              address: '현재 위치'
            },
            current: {
              lat: location?.lat || 37.5665,
              lng: location?.lng || 126.9780,
              address: '현재 위치',
              updatedAt: new Date()
            }
          },
          status: 'detected',
          detectedAt: new Date(timestamp)
        });

        await emergencyCase.save();

        // 자동 매칭 시작
        autoMatchParamedicForCase(emergencyCase._id);

        logger.warn(`응급 상황 자동 감지: 사용자 ${req.user.sub} - 레벨 ${emergencyLevel}`);
      }
    }

    logger.info(`생체 데이터 저장: 사용자 ${req.user.sub} - HR:${heartRate} BP:${bloodPressureSys}/${bloodPressureDia} SpO2:${spO2}`);

    res.status(201).json({
      success: true,
      message: '생체 데이터가 저장되었습니다.',
      data: {
        biometricData: {
          id: biometricData._id,
          heartRate,
          bloodPressure: { systolic: bloodPressureSys, diastolic: bloodPressureDia },
          spO2,
          temperature,
          emergencyLevel,
          hasAnomaly: anomalies.length > 0
        }
      }
    });
  } catch (error) {
    logger.error('생체 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 저장 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/emergency:
 *   post:
 *     summary: 응급 상황 수동 신고
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyLevel:
 *                 type: number
 *                 enum: [1, 2, 3, 4, 5]
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: 응급 신고 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/emergency', authenticateToken, async (req, res) => {
  try {
    const { emergencyLevel = 3, description, location } = req.body;

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 최근 1분 내 동일한 응급 신고가 있는지 확인
    const recentEmergency = await EmergencyCase.findOne({
      userId: req.user.sub,
      status: { $in: ['detected', 'matched', 'in_progress'] },
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) }
    });

    if (recentEmergency) {
      return res.status(400).json({
        success: false,
        message: '이미 처리 중인 응급 상황이 있습니다.'
      });
    }

    // 응급 케이스 생성
    const emergencyCase = new EmergencyCase({
      userId: req.user.sub,
      emergencyLevel,
      detectedAnomalies: [{
        type: 'other',
        description: description || '사용자 수동 응급 신고',
        severity: emergencyLevel >= 4 ? 'critical' : emergencyLevel >= 3 ? 'high' : 'medium'
      }],
      locations: {
        detectedAt: {
          lat: location?.lat || 37.5665,
          lng: location?.lng || 126.9780,
          address: '신고 위치'
        },
        current: {
          lat: location?.lat || 37.5665,
          lng: location?.lng || 126.9780,
          address: '현재 위치',
          updatedAt: new Date()
        }
      },
      status: 'detected',
      detectedAt: new Date(),
      matchingType: 'manual'
    });

    await emergencyCase.save();

    // 자동 매칭 시작
    autoMatchParamedicForCase(emergencyCase._id);

    logger.warn(`응급 상황 수동 신고: 사용자 ${req.user.sub} - 레벨 ${emergencyLevel}`);

    res.status(201).json({
      success: true,
      message: '응급 상황이 신고되었습니다.',
      data: {
        emergencyCase: {
          id: emergencyCase._id,
          emergencyLevel: emergencyCase.emergencyLevel,
          status: emergencyCase.status,
          detectedAt: emergencyCase.detectedAt
        }
      }
    });
  } catch (error) {
    logger.error('응급 상황 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 신고 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/emergency/history:
 *   get:
 *     summary: 응급 상황 이력 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [detected, matched, in_progress, transporting, completed, cancelled]
 *     responses:
 *       200:
 *         description: 응급 이력 조회 성공
 */
router.get('/emergency/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = { userId: req.user.sub };
    if (status) {
      query.status = status;
    }

    const emergencyCases = await EmergencyCase.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('paramedic.paramedicId', 'name phone')
      .populate('hospital.hospitalId', 'name address phone')
      .lean();

    res.json({
      success: true,
      data: {
        emergencyCases: emergencyCases.map(ec => ({
          id: ec._id,
          emergencyLevel: ec.emergencyLevel,
          status: ec.status,
          detectedAt: ec.detectedAt,
          detectedAnomalies: ec.detectedAnomalies,
          paramedic: ec.paramedic,
          hospital: ec.hospital,
          locations: ec.locations
        })),
        total: emergencyCases.length
      }
    });
  } catch (error) {
    logger.error('응급 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 이력 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/biometric/recent:
 *   get:
 *     summary: 최근 생체 데이터 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: 생체 데이터 조회 성공
 */
router.get('/biometric/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const hours = parseInt(req.query.hours) || 24;

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const biometricData = await BiometricData.find({
      userId: req.user.sub,
      collectedAt: { $gte: startTime }
    })
      .sort({ collectedAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        biometricData: biometricData.map(data => ({
          id: data._id,
          collectedAt: data.collectedAt,
          heartRate: data.heartRate,
          bloodPressure: data.bloodPressure,
          spO2: data.spO2,
          bodyTemperature: data.bodyTemperature,
          steps: data.steps,
          stressLevel: data.stressLevel,
          location: data.location,
          analysis: data.analysis
        })),
        total: biometricData.length,
        timeRange: `${hours}시간`
      }
    });
  } catch (error) {
    logger.error('생체 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '생체 데이터 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
