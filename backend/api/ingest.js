const express = require('express');
const { ingestZeppPayload, ingestMockPayload } = require('../services/ingestService');
const { authRequired } = require('../middleware/auth');
const { biometricLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * /api/ingest/zepp:
 *   post:
 *     summary: Zepp 생체 데이터 업로드
 *     tags: [Ingest]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               heartRate:
 *                 type: number
 *               stressLevel:
 *                 type: number
 *               movementStatus:
 *                 type: string
 *               location:
 *                 type: object
 *     responses:
 *       200:
 *         description: 데이터 업로드 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/zepp', authRequired, biometricLimiter, async (req, res, next) => {
  try {
    // 토큰의 주체(userId)를 강제 (클라이언트 위/변조 방지)
    const body = { ...req.body, userId: req.user.sub };
    const result = await ingestZeppPayload(body, {
      sourceIp: req.ip,
      userAgent: req.get('user-agent'),
      receivedAt: new Date(),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/ingest/mock:
 *   post:
 *     summary: Mock 생체 데이터 업로드 (개발용)
 *     tags: [Ingest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               heartRate:
 *                 type: number
 *               stressLevel:
 *                 type: number
 *     responses:
 *       200:
 *         description: Mock 데이터 업로드 성공
 */
router.post('/mock', async (req, res, next) => {
  try {
    const result = await ingestMockPayload(req.body, {
      sourceIp: req.ip,
      userAgent: req.get('user-agent'),
      receivedAt: new Date(),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

