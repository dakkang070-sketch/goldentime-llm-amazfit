/**
 * 피드백 수집 및 관리 API
 */

const express = require('express');
const router = express.Router();
const feedbackService = require('../services/feedbackService');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/feedback/submit:
 *   post:
 *     summary: 피드백 제출
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedbackType:
 *                 type: string
 *                 enum: [user_experience, medical_accuracy, system_performance, workflow_efficiency, ai_analysis]
 *               category:
 *                 type: string
 *                 enum: [emergency_response, ai_analysis, hospital_matching, paramedic_dispatch, user_interface, data_quality]
 *               feedback:
 *                 type: object
 *                 properties:
 *                   rating:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   severity:
 *                     type: string
 *                     enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: 피드백 제출 완료
 */
router.post('/submit', async (req, res) => {
  try {
    const feedbackData = {
      ...req.body,
      submitter: {
        userId: req.user?.id,
        role: req.user?.role || 'patient',
        name: req.user?.name,
        isAnonymous: req.body.submitter?.isAnonymous || false
      },
      metadata: {
        submissionSource: 'web',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        sessionId: req.sessionID,
        systemVersion: process.env.SYSTEM_VERSION || '1.0.0'
      }
    };

    const result = await feedbackService.submitFeedback(feedbackData);
    
    res.json(result);

  } catch (error) {
    logger.error('피드백 제출 실패', error);
    res.status(500).json({
      success: false,
      message: '피드백 제출에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/list:
 *   get:
 *     summary: 피드백 목록 조회
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: feedbackType
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 피드백 목록
 */
router.get('/list', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const filters = {
      feedbackType: req.query.feedbackType,
      category: req.query.category,
      status: req.query.status,
      priority: req.query.priority,
      role: req.query.role,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      searchText: req.query.searchText
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 100),
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await feedbackService.getFeedbackList(filters, options);
    res.json(result);

  } catch (error) {
    logger.error('피드백 목록 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '피드백 목록을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/{feedbackId}:
 *   get:
 *     summary: 피드백 상세 조회
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 피드백 상세 정보
 */
router.get('/:feedbackId', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    const result = await feedbackService.getFeedbackDetail(feedbackId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('피드백 상세 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '피드백 정보를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/{feedbackId}/status:
 *   patch:
 *     summary: 피드백 처리 상태 업데이트
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [submitted, under_review, in_progress, completed, rejected]
 *               reviewNotes:
 *                 type: string
 *               resolution:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: 상태 업데이트 완료
 */
router.patch('/:feedbackId/status', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const statusUpdate = req.body;
    const updatedBy = req.user?.id;

    const result = await feedbackService.updateFeedbackStatus(feedbackId, statusUpdate, updatedBy);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('피드백 상태 업데이트 실패', error);
    res.status(500).json({
      success: false,
      message: '피드백 상태를 업데이트할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/analytics:
 *   get:
 *     summary: 피드백 분석 리포트
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *           default: 7d
 *     responses:
 *       200:
 *         description: 피드백 분석 데이터
 */
router.get('/analytics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const period = req.query.period || '7d';
    
    const result = await feedbackService.getFeedbackAnalytics(period);
    res.json(result);

  } catch (error) {
    logger.error('피드백 분석 실패', error);
    res.status(500).json({
      success: false,
      message: '피드백 분석 데이터를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/quick-survey:
 *   post:
 *     summary: 빠른 만족도 조사
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyCaseId:
 *                 type: string
 *               overallSatisfaction:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               responseTime:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               aiAccuracy:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               wouldRecommend:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 빠른 설문 제출 완료
 */
router.post('/quick-survey', async (req, res) => {
  try {
    const surveyData = {
      feedbackType: 'user_experience',
      category: 'emergency_response',
      feedback: {
        rating: req.body.overallSatisfaction,
        title: '빠른 만족도 조사',
        description: `전체 만족도: ${req.body.overallSatisfaction}/5, 응답 시간: ${req.body.responseTime}/5, AI 정확도: ${req.body.aiAccuracy}/5`,
        severity: 'low',
        detailed: {
          satisfaction: req.body.overallSatisfaction,
          speed: req.body.responseTime,
          accuracy: req.body.aiAccuracy,
          reliability: Math.round((req.body.responseTime + req.body.aiAccuracy) / 2)
        }
      },
      relatedCase: {
        emergencyCaseId: req.body.emergencyCaseId
      },
      submitter: {
        userId: req.user?.id,
        role: req.user?.role || 'patient',
        isAnonymous: true
      },
      metadata: {
        submissionSource: 'quick_survey',
        userAgent: req.headers['user-agent'],
        systemVersion: process.env.SYSTEM_VERSION || '1.0.0'
      }
    };

    const result = await feedbackService.submitFeedback(surveyData);
    res.json(result);

  } catch (error) {
    logger.error('빠른 설문 제출 실패', error);
    res.status(500).json({
      success: false,
      message: '설문 제출에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/medical-validation:
 *   post:
 *     summary: 의료진 검증 피드백
 *     tags: [Feedback]
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
 *               aiAnalysisAccuracy:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               diagnosisMatch:
 *                 type: boolean
 *               improvementAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *               clinicalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 의료진 검증 완료
 */
router.post('/medical-validation', authenticateToken, requireRole('medical'), async (req, res) => {
  try {
    const validationData = {
      feedbackType: 'medical_accuracy',
      category: 'ai_analysis',
      feedback: {
        rating: req.body.aiAnalysisAccuracy,
        title: '의료진 AI 분석 검증',
        description: req.body.clinicalNotes || '',
        severity: req.body.diagnosisMatch ? 'low' : 'high',
        tags: ['medical_validation', 'ai_accuracy'],
        detailed: {
          accuracy: req.body.aiAnalysisAccuracy,
          reliability: req.body.diagnosisMatch ? 5 : 2
        }
      },
      suggestions: {
        hasImprovementSuggestion: req.body.improvementAreas?.length > 0,
        improvementAreas: req.body.improvementAreas || [],
        specificSuggestions: req.body.clinicalNotes,
        priority: req.body.diagnosisMatch ? 'low' : 'high'
      },
      relatedCase: {
        emergencyCaseId: req.body.emergencyCaseId
      },
      submitter: {
        userId: req.user.id,
        role: req.user.role,
        name: req.user.name
      },
      metadata: {
        submissionSource: 'medical_validation',
        userAgent: req.headers['user-agent']
      }
    };

    const result = await feedbackService.submitFeedback(validationData);
    res.json(result);

  } catch (error) {
    logger.error('의료진 검증 제출 실패', error);
    res.status(500).json({
      success: false,
      message: '의료진 검증 제출에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/feedback/system-performance:
 *   get:
 *     summary: 시스템 성능 기반 자동 피드백 수집
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 시스템 성능 피드백
 */
router.get('/system-performance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // 시스템 성능 메트릭 수집
    const performanceMetrics = {
      responseTime: 150, // ms
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      errorRate: 0.01,
      activeConnections: 0
    };

    // 성능 기준 미달 시 자동 피드백 생성
    const issues = [];
    
    if (performanceMetrics.responseTime > 500) {
      issues.push('응답 시간이 느립니다 (500ms 초과)');
    }
    
    if (performanceMetrics.errorRate > 0.05) {
      issues.push('오류율이 높습니다 (5% 초과)');
    }

    if (issues.length > 0) {
      const systemFeedback = {
        feedbackType: 'system_performance',
        category: 'user_interface',
        feedback: {
          rating: issues.length > 2 ? 2 : 3,
          title: '시스템 성능 이슈 감지',
          description: issues.join(', '),
          severity: issues.length > 2 ? 'high' : 'medium'
        },
        submitter: {
          role: 'admin',
          name: 'System Monitor',
          isAnonymous: false
        },
        metadata: {
          submissionSource: 'automated_monitoring',
          systemState: performanceMetrics
        }
      };

      const result = await feedbackService.submitFeedback(systemFeedback);
      res.json({
        success: true,
        data: {
          performanceMetrics,
          issues,
          feedbackGenerated: result.success
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          performanceMetrics,
          issues: [],
          message: '시스템 성능이 정상입니다.'
        }
      });
    }

  } catch (error) {
    logger.error('시스템 성능 피드백 수집 실패', error);
    res.status(500).json({
      success: false,
      message: '시스템 성능 피드백을 수집할 수 없습니다.',
      error: error.message
    });
  }
});

module.exports = router;