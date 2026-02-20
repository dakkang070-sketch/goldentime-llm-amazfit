const express = require('express');
const router = express.Router();
const aiAnalysisService = require('../services/aiAnalysisService');
const { requireAdmin } = require('../middleware/auth'); // 관리자 권한 필요 시

/**
 * @swagger
 * /api/ai-analysis/member-report/{memberId}:
 *   post:
 *     summary: 회원의 AI 건강 리포트 생성
 *     tags: [AI Analysis]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 생성된 리포트 텍스트
 */
router.post('/member-report/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const report = await aiAnalysisService.generateMemberReport(memberId);
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai-analysis/incident-report:
 *   post:
 *     summary: 응급 상황 AI 리포트 생성
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 생성된 리포트 텍스트
 */
router.post('/incident-report', async (req, res, next) => {
  try {
    const incidentData = req.body;
    const report = await aiAnalysisService.generateIncidentReport(incidentData);
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai-analysis/realtime-comment:
 *   post:
 *     summary: 실시간 건강 코멘트 생성
 *     tags: [AI Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               heartRate:
 *                 type: number
 *               stress:
 *                 type: number
 *               steps:
 *                 type: number
 *               sleep:
 *                 type: number
 *     responses:
 *       200:
 *         description: 생성된 코멘트
 */
router.post('/realtime-comment', async (req, res, next) => {
  try {
    const biometricData = req.body;
    const comment = await aiAnalysisService.generateRealtimeComment(biometricData);
    res.json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
