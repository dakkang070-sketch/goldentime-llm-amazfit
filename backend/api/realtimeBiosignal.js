/**
 * 실시간 생체신호 분석 엔진 관리 API
 */

const express = require('express');
const router = express.Router();
const realtimeBiosignalEngine = require('../services/realtimeBiosignalEngine');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/realtime-biosignal/start:
 *   post:
 *     summary: 사용자 실시간 생체신호 모니터링 시작
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *               deviceId:
 *                 type: string
 *                 description: 착용 기기 ID
 *               signalTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ecg, ppg, accelerometer, temperature, spo2]
 *                 description: 모니터링할 생체신호 타입들
 *     responses:
 *       200:
 *         description: 실시간 모니터링 시작됨
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { userId, deviceId, signalTypes = ['ecg', 'ppg', 'accelerometer'] } = req.body;

    if (!userId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID와 기기 ID가 필요합니다.'
      });
    }

    const result = await realtimeBiosignalEngine.startUserStream(userId, deviceId, signalTypes);

    res.json({
      success: true,
      message: '실시간 생체신호 모니터링이 시작되었습니다.',
      data: result
    });

  } catch (error) {
    logger.error('실시간 모니터링 시작 실패', error);
    res.status(500).json({
      success: false,
      message: '실시간 모니터링을 시작할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/stop:
 *   post:
 *     summary: 사용자 실시간 생체신호 모니터링 중단
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *     responses:
 *       200:
 *         description: 실시간 모니터링 중단됨
 */
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }

    const result = await realtimeBiosignalEngine.stopUserStream(userId);

    res.json({
      success: true,
      message: '실시간 생체신호 모니터링이 중단되었습니다.',
      data: result
    });

  } catch (error) {
    logger.error('실시간 모니터링 중단 실패', error);
    res.status(500).json({
      success: false,
      message: '실시간 모니터링을 중단할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/status:
 *   get:
 *     summary: 실시간 생체신호 엔진 상태 조회
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 엔진 상태 정보
 */
router.get('/status', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const performanceMetrics = realtimeBiosignalEngine.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        engineStatus: performanceMetrics.status,
        activeStreams: performanceMetrics.activeStreams,
        performance: {
          samplesPerSecond: performanceMetrics.samplesPerSecond,
          averageLatency: performanceMetrics.averageLatency,
          emergencyDetectionRate: performanceMetrics.emergencyDetectionRate,
          uptime: performanceMetrics.uptime
        },
        resources: {
          memoryUsage: performanceMetrics.memoryUsage,
          totalStreamsStarted: performanceMetrics.totalStreamsStarted
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('엔진 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '엔진 상태를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/active-streams:
 *   get:
 *     summary: 활성 스트림 목록 조회
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 활성 스트림 목록
 */
router.get('/active-streams', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const activeStreams = [];
    
    // 활성 스트림 정보 수집
    for (const [userId, streamProcessor] of realtimeBiosignalEngine.activeStreams) {
      activeStreams.push({
        userId,
        deviceId: streamProcessor.deviceId,
        signalTypes: streamProcessor.signalTypes,
        startTime: streamProcessor.startTime || new Date(),
        status: streamProcessor.isRunning ? 'active' : 'stopped'
      });
    }

    res.json({
      success: true,
      data: {
        totalActiveStreams: activeStreams.length,
        streams: activeStreams.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('활성 스트림 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '활성 스트림을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/emergency-history:
 *   get:
 *     summary: 실시간 응급상황 감지 기록
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d]
 *           default: 24h
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 특정 사용자 필터링
 *     responses:
 *       200:
 *         description: 응급상황 감지 기록
 */
router.get('/emergency-history', authenticateToken, requireRole('medical'), async (req, res) => {
  try {
    const { period = '24h', userId } = req.query;
    
    // 실제 구현에서는 응급상황 감지 기록을 DB에서 조회
    // 여기서는 Mock 데이터
    const emergencyHistory = [
      {
        id: 'emergency_001',
        userId: userId || 'user_123',
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
        severity: 4,
        alertType: 'arrhythmia',
        description: '심방세동 감지',
        resolved: true,
        responseTime: '3분 12초'
      },
      {
        id: 'emergency_002', 
        userId: userId || 'user_456',
        detectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8시간 전
        severity: 5,
        alertType: 'fall_detected',
        description: '낙상 감지 (강도: 3.2g)',
        resolved: true,
        responseTime: '1분 45초'
      }
    ];

    // 기간별 필터링
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoffTime = new Date(Date.now() - periodMs[period]);
    const filteredHistory = emergencyHistory.filter(event => 
      new Date(event.detectedAt) >= cutoffTime
    );

    // 통계 계산
    const stats = {
      totalEmergencies: filteredHistory.length,
      resolvedCount: filteredHistory.filter(e => e.resolved).length,
      severityDistribution: {
        critical: filteredHistory.filter(e => e.severity === 5).length,
        high: filteredHistory.filter(e => e.severity === 4).length,
        medium: filteredHistory.filter(e => e.severity === 3).length,
        low: filteredHistory.filter(e => e.severity <= 2).length
      },
      averageResponseTime: '2분 28초'
    };

    res.json({
      success: true,
      data: {
        period,
        stats,
        emergencies: filteredHistory,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('응급상황 기록 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '응급상황 기록을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/signal-quality:
 *   get:
 *     summary: 생체신호 품질 모니터링
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 특정 사용자의 신호 품질
 *     responses:
 *       200:
 *         description: 신호 품질 정보
 */
router.get('/signal-quality', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;

    if (userId) {
      // 특정 사용자의 신호 품질
      const streamProcessor = realtimeBiosignalEngine.activeStreams.get(userId);
      
      if (!streamProcessor) {
        return res.status(404).json({
          success: false,
          message: '해당 사용자의 활성 스트림을 찾을 수 없습니다.'
        });
      }

      // Mock 신호 품질 데이터
      const signalQuality = {
        userId,
        overall: 'good',
        signals: {
          ecg: { quality: 'excellent', score: 8.5, issues: [] },
          ppg: { quality: 'good', score: 7.2, issues: ['약간의 모션 아티팩트'] },
          accelerometer: { quality: 'excellent', score: 9.1, issues: [] }
        },
        batteryLevel: 78,
        connectionStrength: -42,
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: signalQuality
      });

    } else {
      // 전체 시스템 신호 품질 요약
      const totalStreams = realtimeBiosignalEngine.activeStreams.size;
      
      const qualitySummary = {
        totalActiveStreams: totalStreams,
        overallQuality: 'good',
        qualityDistribution: {
          excellent: Math.floor(totalStreams * 0.6),
          good: Math.floor(totalStreams * 0.3),
          fair: Math.floor(totalStreams * 0.08),
          poor: Math.floor(totalStreams * 0.02)
        },
        commonIssues: [
          { issue: '모션 아티팩트', frequency: 15 },
          { issue: '연결 불안정', frequency: 8 },
          { issue: '배터리 부족', frequency: 3 }
        ],
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: qualitySummary
      });
    }

  } catch (error) {
    logger.error('신호 품질 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '신호 품질을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/config:
 *   get:
 *     summary: 실시간 분석 설정 조회
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 현재 분석 설정
 */
router.get('/config', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const config = realtimeBiosignalEngine.config;

    res.json({
      success: true,
      data: {
        samplingRates: config.samplingRates,
        windowSizes: config.windowSizes,
        emergencyThresholds: config.emergencyThresholds,
        qualityThresholds: config.qualityThresholds,
        description: {
          samplingRates: '각 생체신호의 샘플링 주파수 (Hz)',
          windowSizes: '분석 윈도우 크기 (초)',
          emergencyThresholds: '응급상황 감지 임계치',
          qualityThresholds: '신호 품질 기준'
        }
      }
    });

  } catch (error) {
    logger.error('설정 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '설정을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/config:
 *   patch:
 *     summary: 실시간 분석 설정 업데이트
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyThresholds:
 *                 type: object
 *                 description: 응급상황 임계치 업데이트
 *               qualityThresholds:
 *                 type: object
 *                 description: 신호 품질 기준 업데이트
 *     responses:
 *       200:
 *         description: 설정 업데이트 완료
 */
router.patch('/config', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    
    // 설정 검증
    if (updates.emergencyThresholds) {
      // 임계치 유효성 검사
      const thresholds = updates.emergencyThresholds;
      
      if (thresholds.heartRate) {
        if (thresholds.heartRate.min >= thresholds.heartRate.max) {
          return res.status(400).json({
            success: false,
            message: '심박수 최소값이 최대값보다 클 수 없습니다.'
          });
        }
      }
    }

    // 설정 업데이트 적용
    if (updates.emergencyThresholds) {
      Object.assign(realtimeBiosignalEngine.config.emergencyThresholds, updates.emergencyThresholds);
    }
    
    if (updates.qualityThresholds) {
      Object.assign(realtimeBiosignalEngine.config.qualityThresholds, updates.qualityThresholds);
    }

    logger.info('실시간 분석 설정 업데이트', {
      updatedBy: req.user?.id,
      changes: Object.keys(updates)
    });

    res.json({
      success: true,
      message: '설정이 업데이트되었습니다.',
      updatedConfig: {
        emergencyThresholds: realtimeBiosignalEngine.config.emergencyThresholds,
        qualityThresholds: realtimeBiosignalEngine.config.qualityThresholds
      }
    });

  } catch (error) {
    logger.error('설정 업데이트 실패', error);
    res.status(500).json({
      success: false,
      message: '설정을 업데이트할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/realtime-biosignal/test-alert:
 *   post:
 *     summary: 테스트용 응급 알림 발생
 *     tags: [RealtimeBiosignal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               alertType:
 *                 type: string
 *                 enum: [critical_heart_rate, arrhythmia, hypoxia, fall_detected, high_risk_pattern]
 *               severity:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: 테스트 알림 발생됨
 */
router.post('/test-alert', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId, alertType = 'critical_heart_rate', severity = 4 } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }

    // 테스트용 응급상황 생성
    const testEmergency = {
      isEmergency: true,
      maxSeverity: severity,
      alerts: [{
        type: alertType,
        value: alertType === 'critical_heart_rate' ? 180 : 'test_value',
        severity,
        message: `테스트 알림: ${alertType}`,
        timestamp: Date.now()
      }],
      status: severity >= 5 ? 'critical' : severity >= 4 ? 'emergency' : 'warning',
      riskLevel: severity,
      confidence: 0.95
    };

    // 테스트 응급상황 트리거
    await realtimeBiosignalEngine.triggerEmergencyResponse(userId, testEmergency);

    res.json({
      success: true,
      message: '테스트 응급 알림이 발생되었습니다.',
      data: {
        userId,
        alertType,
        severity,
        triggeredAt: new Date()
      }
    });

  } catch (error) {
    logger.error('테스트 알림 발생 실패', error);
    res.status(500).json({
      success: false,
      message: '테스트 알림을 발생시킬 수 없습니다.',
      error: error.message
    });
  }
});

module.exports = router;