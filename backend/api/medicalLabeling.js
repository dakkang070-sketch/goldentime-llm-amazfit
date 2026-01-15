/**
 * 의료 라벨링 관리 API
 */

const express = require('express');
const router = express.Router();
const autoLabelingService = require('../services/autoLabelingService');
const MedicalLabeling = require('../models/MedicalLabeling');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/medical-labeling/labels/{id}:
 *   get:
 *     summary: 특정 의료 라벨링 조회
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 라벨링 ID
 *     responses:
 *       200:
 *         description: 라벨링 정보
 */
router.get('/labels/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const labeling = await MedicalLabeling.findById(id)
      .populate('emergencyCaseId', 'emergencyLevel detectedAnomalies')
      .populate('biometricDataId', 'heartRate stressLevel movementStatus')
      .lean();

    if (!labeling) {
      return res.status(404).json({
        success: false,
        message: '라벨링 데이터를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: labeling
    });
  } catch (error) {
    logger.error('라벨링 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '라벨링 데이터를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/case/{caseId}/labels:
 *   get:
 *     summary: 응급 케이스의 모든 라벨링 조회
 *     tags: [MedicalLabeling]
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
 *         description: 라벨링 목록
 */
router.get('/case/:caseId/labels', authenticateToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const labelings = await MedicalLabeling.find({ emergencyCaseId: caseId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: labelings,
      count: labelings.length
    });
  } catch (error) {
    logger.error('케이스 라벨링 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '케이스 라벨링을 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/batch-label:
 *   post:
 *     summary: 배치 라벨링 실행
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyCaseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               concurrency:
 *                 type: number
 *                 default: 5
 *     responses:
 *       200:
 *         description: 배치 라벨링 완료
 */
router.post('/batch-label', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { emergencyCaseIds, concurrency = 5 } = req.body;

    if (!Array.isArray(emergencyCaseIds) || emergencyCaseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 응급 케이스 ID 목록을 제공해야 합니다.'
      });
    }

    // 백그라운드에서 배치 라벨링 실행
    const results = await autoLabelingService.batchLabel(emergencyCaseIds, { concurrency });

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `배치 라벨링 완료: ${successCount}/${results.length} 성공`,
      data: {
        totalCases: results.length,
        successfulCases: successCount,
        failedCases: results.length - successCount,
        results: results
      }
    });
  } catch (error) {
    logger.error('배치 라벨링 실패', error);
    res.status(500).json({
      success: false,
      message: '배치 라벨링에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/validate/{id}:
 *   post:
 *     summary: 라벨링 의료진 검증
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 라벨링 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: 검증 점수 (1-5)
 *               notes:
 *                 type: string
 *                 description: 검증 의견
 *               corrections:
 *                 type: object
 *                 description: 수정 사항
 *     responses:
 *       200:
 *         description: 검증 완료
 */
router.post('/validate/:id', authenticateToken, requireRole('medical'), async (req, res) => {
  try {
    const { id } = req.params;
    const { score, notes, corrections } = req.body;
    const validatorId = req.user.id;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: '유효한 검증 점수(1-5)를 제공해야 합니다.'
      });
    }

    const validatedLabeling = await autoLabelingService.validateLabeling(id, validatorId, {
      score,
      notes,
      corrections
    });

    res.json({
      success: true,
      message: '라벨링 검증이 완료되었습니다.',
      data: {
        labelingId: validatedLabeling._id,
        validationScore: score,
        validatedAt: validatedLabeling.qualityMetrics.medicalValidation.validatedAt
      }
    });
  } catch (error) {
    logger.error('라벨링 검증 실패', error);
    res.status(500).json({
      success: false,
      message: '라벨링 검증에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/stats:
 *   get:
 *     summary: 라벨링 통계 조회
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 7
 *         description: 통계 기간 (일)
 *     responses:
 *       200:
 *         description: 라벨링 통계
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const timeRange = parseInt(days);

    const stats = await autoLabelingService.getLabelingStats(timeRange);

    // 추가 통계 계산
    const categoryStats = {};
    const urgencyStats = {};

    stats.categoryDistribution.forEach(category => {
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    stats.urgencyDistribution.forEach(urgency => {
      urgencyStats[urgency] = (urgencyStats[urgency] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        ...stats,
        categoryDistribution: categoryStats,
        urgencyDistribution: urgencyStats,
        validationRate: stats.totalLabels > 0 ? (stats.validatedLabels / stats.totalLabels) * 100 : 0,
        timeRange: `${timeRange}일간`
      }
    });
  } catch (error) {
    logger.error('라벨링 통계 조회 실패', error);
    res.status(500).json({
      success: false,
      message: '라벨링 통계를 조회할 수 없습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/search:
 *   post:
 *     summary: 라벨링 검색
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               primaryCategory:
 *                 type: string
 *               triageLevel:
 *                 type: string
 *               responseUrgency:
 *                 type: string
 *               validated:
 *                 type: boolean
 *               minAccuracy:
 *                 type: number
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *               limit:
 *                 type: number
 *                 default: 50
 *     responses:
 *       200:
 *         description: 검색 결과
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const {
      primaryCategory,
      triageLevel,
      responseUrgency,
      validated,
      minAccuracy,
      dateFrom,
      dateTo,
      limit = 50
    } = req.body;

    const query = {};

    // 검색 조건 구성
    if (primaryCategory) {
      query['emergencyClassification.primaryCategory'] = primaryCategory;
    }
    if (triageLevel) {
      query['emergencyClassification.triageLevel'] = triageLevel;
    }
    if (responseUrgency) {
      query['responseLabels.responseUrgency'] = responseUrgency;
    }
    if (typeof validated === 'boolean') {
      query['qualityMetrics.medicalValidation.validated'] = validated;
    }
    if (minAccuracy) {
      query['qualityMetrics.labelingAccuracy'] = { $gte: minAccuracy };
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const labelings = await MedicalLabeling.find(query)
      .populate('emergencyCaseId', 'emergencyLevel userId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: labelings,
      count: labelings.length,
      query: query
    });
  } catch (error) {
    logger.error('라벨링 검색 실패', error);
    res.status(500).json({
      success: false,
      message: '라벨링 검색에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/medical-labeling/export:
 *   get:
 *     summary: 라벨링 데이터 내보내기 (CSV)
 *     tags: [MedicalLabeling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 30
 *     responses:
 *       200:
 *         description: 내보내기 파일
 */
router.get('/export', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { format = 'csv', days = 30 } = req.query;
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const labelings = await MedicalLabeling.find({
      createdAt: { $gte: startDate }
    }).populate('emergencyCaseId biometricDataId').lean();

    if (format === 'csv') {
      // CSV 형태로 변환
      const csvRows = labelings.map(labeling => ({
        id: labeling._id,
        emergencyCaseId: labeling.emergencyCaseId._id,
        primaryCategory: labeling.emergencyClassification.primaryCategory,
        triageLevel: labeling.emergencyClassification.triageLevel,
        responseUrgency: labeling.responseLabels.responseUrgency,
        mortalityRisk: labeling.riskAssessment.mortalityRisk,
        validated: labeling.qualityMetrics.medicalValidation.validated,
        accuracy: labeling.qualityMetrics.labelingAccuracy,
        confidence: labeling.qualityMetrics.aiConfidence.overall,
        createdAt: labeling.createdAt
      }));

      const csv = [
        Object.keys(csvRows[0]).join(','),
        ...csvRows.map(row => Object.values(row).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="medical_labelings_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: labelings,
        count: labelings.length,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('라벨링 내보내기 실패', error);
    res.status(500).json({
      success: false,
      message: '라벨링 데이터를 내보낼 수 없습니다.',
      error: error.message
    });
  }
});

module.exports = router;