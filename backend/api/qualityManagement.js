/**
 * 품질 관리 및 KPI 모니터링 API
 */

const express = require('express');
const router = express.Router();
const qualityManagementService = require('../services/qualityManagementService');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/quality/dashboard:
 *   get:
 *     summary: 품질 관리 대시보드
 *     tags: [QualityManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 품질 지표 대시보드 데이터
 */
router.get('/dashboard', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const dashboardData = await qualityManagementService.getQualityDashboard();
    res.json(dashboardData);

  } catch (error) {
    logger.error('품질 대시보드 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '품질 대시보드를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/quality/metrics:
 *   get:
 *     summary: 실시간 품질 지표 수집
 *     tags: [QualityManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 현재 품질 지표
 */
router.get('/metrics', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    await qualityManagementService.collectQualityMetrics();
    const dashboardData = await qualityManagementService.getQualityDashboard();
    
    res.json({
      success: true,
      message: '품질 지표가 업데이트되었습니다.',
      data: dashboardData.data
    });

  } catch (error) {
    logger.error('품질 지표 수집 실패', error);
    res.status(500).json({
      success: false,
      message: '품질 지표를 수집할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/quality/report/daily:
 *   get:
 *     summary: 일일 품질 리포트
 *     tags: [QualityManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 일일 품질 분석 리포트
 */
router.get('/report/daily', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const report = await qualityManagementService.generateDailyQualityReport();
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '일일 리포트를 생성할 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('일일 품질 리포트 생성 실패', error);
    res.status(500).json({
      success: false,
      message: '일일 품질 리포트를 생성할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/quality/improvements:
 *   get:
 *     summary: 개선 작업 대기열 조회
 *     tags: [QualityManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 개선 작업 목록
 */
router.get('/improvements', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const improvementQueue = qualityManagementService.improvementQueue || [];
    
    const activeImprovements = improvementQueue.filter(task => task.status !== 'completed');
    const completedImprovements = improvementQueue.filter(task => task.status === 'completed');

    res.json({
      success: true,
      data: {
        total: improvementQueue.length,
        active: activeImprovements.length,
        completed: completedImprovements.length,
        improvements: {
          active: activeImprovements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
          completed: completedImprovements.slice(-10) // 최근 완료된 10개
        }
      }
    });

  } catch (error) {
    logger.error('개선 작업 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '개선 작업을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/quality/kpi-targets:
 *   get:
 *     summary: KPI 목표치 조회
 *     tags: [QualityManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 현재 KPI 목표치
 */
router.get('/kpi-targets', authenticateToken, requireRole('controller'), async (req, res) => {
  try {
    const kpiTargets = qualityManagementService.kpiTargets;
    
    res.json({
      success: true,
      data: {
        targets: kpiTargets,
        description: {
          aiAnalysisAccuracy: 'AI 분석 정확도 (%)',
          medicalValidationScore: '의료진 검증 점수 (%)', 
          responseTimeCompliance: '골든타임 준수율 (%)',
          workflowEfficiency: '워크플로우 효율성 (%)',
          userSatisfaction: '사용자 만족도 (5점 만점)',
          medicalStaffSatisfaction: '의료진 만족도 (5점 만점)',
          systemUptime: '시스템 가동률 (%)',
          averageResponseTime: '평균 응답 시간 (ms)',
          errorRate: '시스템 오류율 (%)',
          dataCompleteness: '데이터 완전성 (%)',
          labelingAccuracy: '라벨링 정확도 (%)'
        }
      }
    });

  } catch (error) {
    logger.error('KPI 목표치 조회 실패', error);
    res.status(500).json({
      success: false,
      message: 'KPI 목표치를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

module.exports = router;