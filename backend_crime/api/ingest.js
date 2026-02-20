const express = require('express');
const { ingestMockPayload } = require('../services/ingestService');

const router = express.Router();

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
