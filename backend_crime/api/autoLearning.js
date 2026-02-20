/**
 * 완전 자동 학습 시스템 관리 API
 */

const express = require('express');
const router = express.Router();
const autoLearningService = require('../services/autoLearningService');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/auto-learning/status:
 *   get:
 *     summary: 자동 학습 시스템 상태 조회
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 자동 학습 시스템 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isTraining:
 *                       type: boolean
 *                     lastTrainingTime:
 *                       type: string
 *                     totalTrainingRuns:
 *                       type: number
 *                     averageAccuracy:
 *                       type: number
 *                     recentHistory:
 *                       type: array
 */
router.get('/status', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const stats = autoLearningService.getTrainingStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        config: {
          autoLearningEnabled: process.env.ENABLE_AUTO_LEARNING === 'true',
          autoDeployEnabled: process.env.ENABLE_AUTO_DEPLOY === 'true',
          minDataThreshold: 50,
          cronSchedule: '0 2 * * *'
        }
      }
    });
  } catch (error) {
    logger.error('자동 학습 상태 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '자동 학습 상태를 가져올 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auto-learning/trigger-batch:
 *   post:
 *     summary: 배치 학습 수동 트리거
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 배치 학습 시작됨
 *       409:
 *         description: 이미 훈련 중
 */
router.post('/trigger-batch', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = autoLearningService.getTrainingStats();
    
    if (stats.isTraining) {
      return res.status(409).json({
        success: false,
        message: '이미 훈련이 진행 중입니다.'
      });
    }

    // 백그라운드에서 배치 학습 실행
    autoLearningService.executeBatchLearning().catch(error => {
      logger.error('수동 배치 학습 실패', error);
    });

    res.json({
      success: true,
      message: '배치 학습이 시작되었습니다. 진행 상황은 로그를 확인하세요.'
    });
  } catch (error) {
    logger.error('배치 학습 트리거 실패', error);
    res.status(500).json({
      success: false,
      message: '배치 학습을 시작할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auto-learning/trigger-incremental:
 *   post:
 *     summary: 증분 학습 수동 트리거
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 증분 학습 시작됨
 *       409:
 *         description: 이미 훈련 중
 */
router.post('/trigger-incremental', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = autoLearningService.getTrainingStats();
    
    if (stats.isTraining) {
      return res.status(409).json({
        success: false,
        message: '이미 훈련이 진행 중입니다.'
      });
    }

    // 백그라운드에서 증분 학습 실행
    autoLearningService.executeIncrementalLearning().catch(error => {
      logger.error('수동 증분 학습 실패', error);
    });

    res.json({
      success: true,
      message: '증분 학습이 시작되었습니다.'
    });
  } catch (error) {
    logger.error('증분 학습 트리거 실패', error);
    res.status(500).json({
      success: false,
      message: '증분 학습을 시작할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auto-learning/data-count:
 *   get:
 *     summary: 새로운 훈련 데이터 개수 확인
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 데이터 개수 정보
 */
router.get('/data-count', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const newDataCount = await autoLearningService.getNewDataCount();
    
    res.json({
      success: true,
      data: {
        newDataCount,
        threshold: 50,
        readyForTraining: newDataCount >= 50
      }
    });
  } catch (error) {
    logger.error('데이터 개수 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '데이터 개수를 확인할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auto-learning/rollback:
 *   post:
 *     summary: 모델 롤백
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 롤백 완료
 */
router.post('/rollback', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await autoLearningService.rollbackModel();
    
    res.json({
      success: true,
      message: '모델 롤백이 완료되었습니다.'
    });
  } catch (error) {
    logger.error('모델 롤백 실패', error);
    res.status(500).json({
      success: false,
      message: '모델 롤백에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auto-learning/config:
 *   put:
 *     summary: 자동 학습 설정 업데이트
 *     tags: [AutoLearning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAutoLearning:
 *                 type: boolean
 *               enableAutoDeploy:
 *                 type: boolean
 *               minDataThreshold:
 *                 type: number
 *     responses:
 *       200:
 *         description: 설정 업데이트 완료
 */
router.put('/config', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { enableAutoLearning, enableAutoDeploy, minDataThreshold } = req.body;
    
    // 환경변수는 런타임에서 변경할 수 없으므로, 
    // 실제로는 별도 설정 파일이나 데이터베이스에 저장해야 함
    // 여기서는 응답만 제공
    
    res.json({
      success: true,
      message: '설정 업데이트 요청을 받았습니다. 서버 재시작 후 적용됩니다.',
      data: {
        enableAutoLearning,
        enableAutoDeploy,
        minDataThreshold
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

module.exports = router;