/**
 * 응급 워크플로우 자동화 관리 API
 */

const express = require('express');
const router = express.Router();
const emergencyWorkflowService = require('../services/emergencyWorkflowService');
const realtimeTrackingService = require('../services/realtimeTrackingService');
const resourceManagementService = require('../services/resourceManagementService');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/emergency-workflow/start:
 *   post:
 *     summary: 응급 워크플로우 시작
 *     tags: [EmergencyWorkflow]
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
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, critical]
 *                 description: 우선순위
 *               options:
 *                 type: object
 *                 properties:
 *                   autoEscalation:
 *                     type: boolean
 *                     default: true
 *                   notifyGuardian:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: 워크플로우 시작됨
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 이미 진행 중인 워크플로우
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { emergencyCaseId, priority = 'normal', options = {} } = req.body;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    // 이미 진행 중인지 확인
    const existingWorkflow = emergencyWorkflowService.getWorkflowStatus(emergencyCaseId);
    if (existingWorkflow) {
      return res.status(409).json({
        success: false,
        message: '이미 진행 중인 워크플로우가 있습니다.',
        currentState: existingWorkflow.state
      });
    }

    // 워크플로우 시작
    const result = await emergencyWorkflowService.initiateEmergencyWorkflow(emergencyCaseId, {
      priority,
      ...options,
      initiatedBy: req.user?.id
    });

    res.json({
      success: true,
      message: '응급 워크플로우가 시작되었습니다.',
      data: result
    });

  } catch (error) {
    logger.error('워크플로우 시작 실패', error);
    res.status(500).json({
      success: false,
      message: '워크플로우를 시작할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/status/{caseId}:
 *   get:
 *     summary: 워크플로우 상태 조회
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: 응급 케이스 ID
 *     responses:
 *       200:
 *         description: 워크플로우 상태
 */
router.get('/status/:caseId', authenticateToken, (req, res) => {
  try {
    const { caseId } = req.params;
    
    const workflow = emergencyWorkflowService.getWorkflowStatus(caseId);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '워크플로우를 찾을 수 없습니다.'
      });
    }

    // 추가 정보 계산
    const elapsedTime = new Date() - workflow.startTime;
    const elapsedMinutes = Math.round(elapsedTime / (1000 * 60));

    res.json({
      success: true,
      data: {
        ...workflow,
        elapsedTime: elapsedMinutes,
        isOnTrack: workflow.slaStatus.onTrack,
        nextMilestone: this.getNextMilestone(workflow.state)
      }
    });

  } catch (error) {
    logger.error('워크플로우 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '워크플로우 상태를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/tracking/{caseId}:
 *   get:
 *     summary: 실시간 추적 상태 조회
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: 응급 케이스 ID
 *     responses:
 *       200:
 *         description: 추적 상태
 */
router.get('/tracking/:caseId', authenticateToken, (req, res) => {
  try {
    const { caseId } = req.params;
    
    const trackingStatus = realtimeTrackingService.getTrackingStatus();
    const caseTracking = trackingStatus.trackings.find(t => t.trackingKey === caseId);

    if (!caseTracking) {
      return res.status(404).json({
        success: false,
        message: '활성 추적을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: caseTracking
    });

  } catch (error) {
    logger.error('추적 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '추적 상태를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/escalate:
 *   post:
 *     summary: 수동 에스컬레이션
 *     tags: [EmergencyWorkflow]
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
 *               reason:
 *                 type: string
 *               escalationType:
 *                 type: string
 *                 enum: [paramedic, hospital, air_ambulance, regional_support]
 *     responses:
 *       200:
 *         description: 에스컬레이션 완료
 */
router.post('/escalate', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { emergencyCaseId, reason, escalationType } = req.body;

    if (!emergencyCaseId || !escalationType) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.'
      });
    }

    let escalationResult;

    switch (escalationType) {
      case 'paramedic':
        escalationResult = await emergencyWorkflowService.escalateParamedicMatching(emergencyCaseId);
        break;
      case 'hospital':
        escalationResult = await emergencyWorkflowService.escalateHospitalMatching(emergencyCaseId);
        break;
      case 'air_ambulance':
        escalationResult = await emergencyWorkflowService.requestAirAmbulance(emergencyCaseId);
        break;
      case 'regional_support':
        escalationResult = await resourceManagementService.requestRegionalSupport();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '지원되지 않는 에스컬레이션 타입입니다.'
        });
    }

    res.json({
      success: true,
      message: `${escalationType} 에스컬레이션이 실행되었습니다.`,
      data: escalationResult,
      reason,
      escalatedBy: req.user?.id
    });

  } catch (error) {
    logger.error('수동 에스컬레이션 실패', error);
    res.status(500).json({
      success: false,
      message: '에스컬레이션에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/resources:
 *   get:
 *     summary: 전체 리소스 상태 조회
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 리소스 상태
 */
router.get('/resources', authenticateToken, (req, res) => {
  try {
    const trackingStatus = realtimeTrackingService.getTrackingStatus();
    
    res.json({
      success: true,
      data: {
        tracking: trackingStatus,
        workflow: {
          activeWorkflows: emergencyWorkflowService.activeWorkflows.size,
          escalationQueue: emergencyWorkflowService.escalationQueue.length
        },
        lastUpdate: new Date()
      }
    });

  } catch (error) {
    logger.error('리소스 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '리소스 상태를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/performance:
 *   get:
 *     summary: 워크플로우 성능 리포트
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: 분석 기간
 *     responses:
 *       200:
 *         description: 성능 리포트
 */
router.get('/performance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const report = await resourceManagementService.generatePerformanceReport(period);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '성능 리포트를 생성할 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: report,
      generatedAt: new Date(),
      period
    });

  } catch (error) {
    logger.error('성능 리포트 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '성능 리포트를 생성할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/backup-matching:
 *   post:
 *     summary: 백업 매칭 실행
 *     tags: [EmergencyWorkflow]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 백업 매칭 완료
 */
router.post('/backup-matching', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { emergencyCaseId, reason = 'manual_request' } = req.body;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    const result = await resourceManagementService.executeBackupMatching(emergencyCaseId, reason);

    if (result.success) {
      res.json({
        success: true,
        message: '백업 매칭이 완료되었습니다.',
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: '백업 매칭에 실패했습니다.',
        reason: result.reason
      });
    }

  } catch (error) {
    logger.error('백업 매칭 실패', error);
    res.status(500).json({
      success: false,
      message: '백업 매칭에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/complete:
 *   post:
 *     summary: 워크플로우 완료 처리
 *     tags: [EmergencyWorkflow]
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
 *               completionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 워크플로우 완료
 */
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { emergencyCaseId, completionNotes } = req.body;

    if (!emergencyCaseId) {
      return res.status(400).json({
        success: false,
        message: '응급 케이스 ID가 필요합니다.'
      });
    }

    await emergencyWorkflowService.completeWorkflow(emergencyCaseId, {
      completionNotes,
      completedBy: req.user?.id
    });

    res.json({
      success: true,
      message: '워크플로우가 완료되었습니다.'
    });

  } catch (error) {
    logger.error('워크플로우 완료 실패', error);
    res.status(500).json({
      success: false,
      message: '워크플로우를 완료할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/active:
 *   get:
 *     summary: 활성 워크플로우 목록
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 활성 워크플로우 목록
 */
router.get('/active', authenticateToken, (req, res) => {
  try {
    const activeWorkflows = [];
    
    for (const [caseId, workflow] of emergencyWorkflowService.activeWorkflows) {
      const elapsedTime = new Date() - workflow.startTime;
      const elapsedMinutes = Math.round(elapsedTime / (1000 * 60));
      
      activeWorkflows.push({
        caseId,
        state: workflow.state,
        startTime: workflow.startTime,
        elapsedMinutes,
        escalationLevel: workflow.escalationLevel,
        resources: workflow.resources,
        isOnTrack: workflow.slaStatus.onTrack
      });
    }

    res.json({
      success: true,
      data: {
        totalActive: activeWorkflows.length,
        workflows: activeWorkflows.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes),
        lastUpdate: new Date()
      }
    });

  } catch (error) {
    logger.error('활성 워크플로우 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '활성 워크플로우를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/timeline/{caseId}:
 *   get:
 *     summary: 워크플로우 타임라인 조회
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: 응급 케이스 ID
 *     responses:
 *       200:
 *         description: 워크플로우 타임라인
 */
router.get('/timeline/:caseId', authenticateToken, (req, res) => {
  try {
    const { caseId } = req.params;
    
    const workflow = emergencyWorkflowService.getWorkflowStatus(caseId);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '워크플로우를 찾을 수 없습니다.'
      });
    }

    // 타임라인 이벤트에 경과 시간 추가
    const timelineWithElapsed = workflow.timeline.map((event, index) => {
      const elapsedTime = index === 0 ? 0 : 
        event.timestamp - workflow.timeline[0].timestamp;
      
      return {
        ...event,
        elapsedMinutes: Math.round(elapsedTime / (1000 * 60)),
        relativeTime: this.formatRelativeTime(elapsedTime)
      };
    });

    res.json({
      success: true,
      data: {
        caseId,
        timeline: timelineWithElapsed,
        totalEvents: timelineWithElapsed.length,
        currentState: workflow.state
      }
    });

  } catch (error) {
    logger.error('타임라인 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '타임라인을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/emergency-workflow/system-status:
 *   get:
 *     summary: 전체 시스템 상태
 *     tags: [EmergencyWorkflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 시스템 전체 상태
 */
router.get('/system-status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const systemStatus = {
      workflow: {
        activeWorkflows: emergencyWorkflowService.activeWorkflows.size,
        escalationQueue: emergencyWorkflowService.escalationQueue.length,
        slaViolations: this.countSLAViolations()
      },
      tracking: realtimeTrackingService.getTrackingStatus(),
      resources: await this.getResourceSummary(),
      performance: await resourceManagementService.generatePerformanceReport('24h'),
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
      }
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    logger.error('시스템 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '시스템 상태를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * 헬퍼 함수들
 */
function getNextMilestone(currentState) {
  const milestones = {
    'initiated': '응급구조사 매칭 중',
    'paramedic_matching': '응급구조사 출동 대기',
    'paramedic_dispatched': '현장 도착 예정',
    'paramedic_enroute': '현장 응급처치',
    'paramedic_arrived': '병원 이송 준비',
    'hospital_matching': '병원 이송 중',
    'transport_started': '병원 도착',
    'hospital_arrived': '환자 인수인계',
    'completed': '완료됨'
  };

  return milestones[currentState] || '알 수 없음';
}

function formatRelativeTime(milliseconds) {
  const minutes = Math.round(milliseconds / (1000 * 60));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  return `${hours}시간 전`;
}

function countSLAViolations() {
  let violations = 0;
  for (const [caseId, workflow] of emergencyWorkflowService.activeWorkflows) {
    violations += workflow.slaStatus?.violations?.length || 0;
  }
  return violations;
}

async function getResourceSummary() {
  try {
    const paramedicsAvailable = await Paramedic.countDocuments({ status: 'available' });
    const paramedicsDispatched = await Paramedic.countDocuments({ status: 'dispatched' });
    const hospitalsAvailable = await Hospital.countDocuments({ 
      status: 'active', 
      canAcceptTransfer: true,
      'emergencyRoom.isAvailable': true 
    });

    return {
      paramedics: {
        available: paramedicsAvailable,
        dispatched: paramedicsDispatched,
        utilization: Math.round((paramedicsDispatched / (paramedicsAvailable + paramedicsDispatched)) * 100)
      },
      hospitals: {
        available: hospitalsAvailable,
        totalCapacity: hospitalsAvailable * 15, // 평균 15병상 가정
        currentLoad: await this.getCurrentHospitalLoad()
      }
    };
  } catch (error) {
    logger.warn('리소스 요약 생성 실패', error);
    return {};
  }
}

module.exports = router;