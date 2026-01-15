/**
 * 국립중앙의료원 API 기반 지능형 병원 매칭 및 수용 확약 API
 */

const express = require('express');
const router = express.Router();
const hospitalService = require('../services/hospitalService');
const nedcApiService = require('../services/nedcApiService');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/hospital-matching/status:
 *   get:
 *     summary: 병원 매칭 시스템 상태 확인 (공개)
 *     tags: [Hospital Matching]
 *     responses:
 *       200:
 *         description: 시스템 상태 정보
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: '병원 매칭 시스템 정상 작동',
    timestamp: new Date().toISOString(),
    nedcApiConnected: !!process.env.NEDC_API_SERVICE_KEY,
    lastSync: null
  });
});

/**
 * @swagger
 * /api/hospital-matching/bed-status:
 *   get:
 *     summary: 실시간 병상 현황 (공개)
 *     tags: [Hospital Matching]
 *     responses:
 *       200:
 *         description: 병상 현황 정보
 */
router.get('/bed-status', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const bedInfo = await nedcApiService.getRealTimeEmergencyBeds([], true);
    
    res.json({
      success: true,
      hospitals: bedInfo.slice(0, limit),
      total: bedInfo.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('실시간 병상 현황 조회 오류', { error: error.message });
    res.status(500).json({
      success: false,
      message: '병상 현황 조회 실패',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/sync:
 *   post:
 *     summary: 국립중앙의료원 API 병원 데이터 동기화
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 동기화 완료
 */
router.post('/sync', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await hospitalService.syncHospitalsFromMedicalCenter();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        syncedCount: result.synced
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('병원 데이터 동기화 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 데이터 동기화에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/realtime-beds:
 *   get:
 *     summary: 실시간 응급실 가용 병상 현황
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hospitalIds
 *         schema:
 *           type: string
 *         description: 쉼표로 구분된 병원 ID 목록
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 캐시 무시하고 강제 새로고침
 *     responses:
 *       200:
 *         description: 실시간 병상 현황
 */
router.get('/realtime-beds', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { hospitalIds, forceRefresh } = req.query;
    
    const hospitalIdArray = hospitalIds ? 
      hospitalIds.split(',').map(id => id.trim()) : [];
    
    const bedStatus = await hospitalService.getRealTimeEmergencyRoomStatus(hospitalIdArray);
    
    res.json({
      success: bedStatus.success,
      data: bedStatus.data,
      totalHospitals: bedStatus.totalHospitals || 0,
      lastUpdated: bedStatus.lastUpdated,
      cached: !forceRefresh
    });

  } catch (error) {
    logger.error('실시간 병상 현황 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '실시간 병상 현황을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/match:
 *   post:
 *     summary: 응급 케이스 병원 매칭
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyCaseId:
 *                 type: string
 *                 description: 응급 케이스 ID
 *               forceRematch:
 *                 type: boolean
 *                 default: false
 *                 description: 기존 매칭 무시하고 재매칭
 *               requiredSpecialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 필요한 전문 진료과
 *     responses:
 *       200:
 *         description: 매칭 결과
 */
router.post('/match', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { emergencyCaseId, forceRematch = false, requiredSpecialties = [] } = req.body;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    const options = {
      forceRematch,
      requiredSpecialties
    };

    const result = await hospitalService.autoMatchHospitalForCase(emergencyCaseId, options);

    if (result.matched) {
      res.json({
        success: true,
        message: '병원 매칭이 완료되었습니다.',
        data: {
          hospitalId: result.hospitalId,
          hospitalName: result.hospitalName,
          confirmed: result.confirmed,
          confirmationId: result.confirmationId,
          distance: result.distance,
          suitabilityScore: result.suitabilityScore,
          estimatedArrival: result.estimatedArrival,
          backupCount: result.backupCount
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '적합한 병원을 찾을 수 없습니다.',
        reason: result.reason,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('병원 매칭 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 매칭에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/rematch:
 *   post:
 *     summary: 병원 재매칭
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyCaseId:
 *                 type: string
 *                 description: 응급 케이스 ID
 *               reason:
 *                 type: string
 *                 description: 재매칭 사유
 *     responses:
 *       200:
 *         description: 재매칭 결과
 */
router.post('/rematch', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { emergencyCaseId, reason = 'manual_request' } = req.body;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    const result = await hospitalService.rematchHospitalIfNeeded(emergencyCaseId, reason);

    res.json({
      success: true,
      data: {
        rematched: result.rematched,
        reason: result.reason,
        previousHospital: result.previousHospital,
        newHospital: result.newHospital,
        improvement: result.improvement
      }
    });

  } catch (error) {
    logger.error('병원 재매칭 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 재매칭에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/confirmation-status:
 *   get:
 *     summary: 병원 수용 확약 상태 확인
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: emergencyCaseId
 *         required: true
 *         schema:
 *           type: string
 *         description: 응급 케이스 ID
 *     responses:
 *       200:
 *         description: 확약 상태
 */
router.get('/confirmation-status', authenticateToken, async (req, res) => {
  try {
    const { emergencyCaseId } = req.query;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    const result = await hospitalService.updateHospitalConfirmationStatus(emergencyCaseId);

    res.json({
      success: result.updated,
      data: {
        updated: result.updated,
        statusChanged: result.statusChanged,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        rematchAttempted: result.rematchAttempted,
        rematchResult: result.rematchResult,
        availability: result.availability
      }
    });

  } catch (error) {
    logger.error('확약 상태 확인 실패', error);
    res.status(500).json({
      success: false,
      message: '확약 상태를 확인할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/hospital-availability:
 *   post:
 *     summary: 특정 병원의 수용 가능성 확인
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hospitalId:
 *                 type: string
 *                 description: 병원 ID
 *               patientInfo:
 *                 type: object
 *                 properties:
 *                   emergencyLevel:
 *                     type: number
 *                   age:
 *                     type: number
 *                   gender:
 *                     type: string
 *                   medicalHistory:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: 수용 가능성 분석 결과
 */
router.post('/hospital-availability', authenticateToken, requireRole('medical'), async (req, res) => {
  try {
    const { hospitalId, patientInfo = {} } = req.body;

    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: '병원 ID가 필요합니다.'
      });
    }

    const availability = await nedcApiService.getHospitalAvailability(hospitalId, patientInfo);

    res.json({
      success: true,
      data: {
        hospitalId,
        available: availability.available,
        confidence: availability.confidence,
        reasons: availability.reasons,
        recommendations: availability.recommendations,
        assignedBed: availability.assignedBed,
        assignedDepartment: availability.assignedDepartment,
        specialInstructions: availability.specialInstructions,
        checkedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('병원 수용 가능성 확인 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 수용 가능성을 확인할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/request-confirmation:
 *   post:
 *     summary: 병원 수용 확약 요청
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hospitalId:
 *                 type: string
 *                 description: 병원 ID
 *               emergencyCaseId:
 *                 type: string
 *                 description: 응급 케이스 ID
 *               estimatedArrival:
 *                 type: string
 *                 format: date-time
 *                 description: 예상 도착 시간
 *     responses:
 *       200:
 *         description: 확약 요청 결과
 */
router.post('/request-confirmation', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { hospitalId, emergencyCaseId, estimatedArrival } = req.body;

    if (!hospitalId || !emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '병원 ID와 응급 케이스 ID가 필요합니다.'
      });
    }

    // 응급 케이스 정보 조회
    const EmergencyCase = require('../models/EmergencyCase');
    const emergencyCase = await EmergencyCase.findById(emergencyCaseId);

    if (!emergencyCase) {
      return res.status(404).json({
        success: false,
        message: '응급 케이스를 찾을 수 없습니다.'
      });
    }

    const arrivalTime = estimatedArrival ? 
      new Date(estimatedArrival) : 
      new Date(Date.now() + 20 * 60 * 1000); // 기본 20분 후

    const confirmation = await nedcApiService.requestAdmissionConfirmation(
      hospitalId,
      emergencyCase,
      arrivalTime
    );

    res.json({
      success: confirmation.confirmed,
      data: {
        confirmed: confirmation.confirmed,
        confirmationId: confirmation.confirmationId,
        hospitalId: confirmation.hospitalId,
        hospitalName: confirmation.hospitalName,
        assignedBed: confirmation.assignedBed,
        assignedDepartment: confirmation.assignedDepartment,
        estimatedArrival: confirmation.estimatedArrival,
        validUntil: confirmation.validUntil,
        specialInstructions: confirmation.specialInstructions,
        reason: confirmation.reason,
        message: confirmation.message
      }
    });

  } catch (error) {
    logger.error('병원 확약 요청 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 확약 요청에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/optimal-hospitals:
 *   post:
 *     summary: 최적 병원 후보 검색
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               patientInfo:
 *                 type: object
 *                 properties:
 *                   emergencyLevel:
 *                     type: number
 *                   age:
 *                     type: number
 *                   gender:
 *                     type: string
 *                   symptoms:
 *                     type: array
 *                     items:
 *                       type: string
 *               maxResults:
 *                 type: number
 *                 default: 5
 *     responses:
 *       200:
 *         description: 최적 병원 목록
 */
router.post('/optimal-hospitals', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { location, patientInfo = {}, maxResults = 5 } = req.body;

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: '환자 위치 정보가 필요합니다.'
      });
    }

    // 가짜 응급 케이스 객체 생성 (검색용)
    const mockEmergencyCase = {
      locations: { current: location },
      emergencyLevel: patientInfo.emergencyLevel || 3,
      detectedAnomalies: patientInfo.symptoms?.map(s => ({ type: s })) || []
    };

    const optimalHospitals = await nedcApiService.findOptimalHospitals(mockEmergencyCase, patientInfo);

    const limitedResults = optimalHospitals.slice(0, maxResults);

    res.json({
      success: true,
      data: {
        hospitals: limitedResults.map(hospital => ({
          hospitalId: hospital.hospitalId,
          hospitalName: hospital.hospitalName,
          distance: hospital.distance,
          suitabilityScore: hospital.suitabilityScore,
          available: hospital.available,
          confidence: hospital.confidence,
          emergencyBeds: hospital.emergencyBeds,
          icu: hospital.icu,
          specialties: hospital.specialties,
          estimatedTravelTime: hospital.estimatedTravelTime || Math.round((hospital.distance || 0) / 1000 / 60 * 60)
        })),
        totalFound: optimalHospitals.length,
        searchLocation: location,
        searchCriteria: patientInfo,
        searchedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('최적 병원 검색 실패', error);
    res.status(500).json({
      success: false,
      message: '최적 병원 검색에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/hospital-matching/statistics:
 *   get:
 *     summary: 병원 매칭 통계
 *     tags: [HospitalMatching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: 통계 기간
 *     responses:
 *       200:
 *         description: 매칭 통계
 */
router.get('/statistics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const fromDate = new Date(Date.now() - periodMs[period]);

    const EmergencyCase = require('../models/EmergencyCase');
    
    // 기본 통계
    const totalCases = await EmergencyCase.countDocuments({
      createdAt: { $gte: fromDate }
    });

    const matchedCases = await EmergencyCase.countDocuments({
      createdAt: { $gte: fromDate },
      'hospital.hospitalId': { $exists: true }
    });

    const confirmedCases = await EmergencyCase.countDocuments({
      createdAt: { $gte: fromDate },
      'hospital.status': 'confirmed'
    });

    const rematchedCases = await EmergencyCase.countDocuments({
      createdAt: { $gte: fromDate },
      'hospital.rematchCount': { $gt: 0 }
    });

    // 평균 매칭 시간 계산
    const averageMatchingTime = await EmergencyCase.aggregate([
      { $match: { 
        createdAt: { $gte: fromDate },
        'hospital.matchedAt': { $exists: true }
      }},
      { $project: {
        matchingTime: { $subtract: ['$hospital.matchedAt', '$createdAt'] }
      }},
      { $group: {
        _id: null,
        avgTime: { $avg: '$matchingTime' }
      }}
    ]);

    const avgMatchingTimeMs = averageMatchingTime[0]?.avgTime || 0;
    const avgMatchingTimeMinutes = Math.round(avgMatchingTimeMs / (1000 * 60));

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalCases,
          matchedCases,
          confirmedCases,
          rematchedCases,
          matchingRate: totalCases > 0 ? Math.round((matchedCases / totalCases) * 100) : 0,
          confirmationRate: matchedCases > 0 ? Math.round((confirmedCases / matchedCases) * 100) : 0,
          rematchRate: matchedCases > 0 ? Math.round((rematchedCases / matchedCases) * 100) : 0,
          averageMatchingTime: avgMatchingTimeMinutes
        },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('병원 매칭 통계 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '병원 매칭 통계를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

module.exports = router;