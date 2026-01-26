const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
// TODO: 여기에 substanceDetectionSystem 또는 관련 서비스 임포트

/**
 * @swagger
 * /api/zepp-biometrics:
 *   post:
 *     summary: Zepp OS 워치 앱에서 생체 데이터 수신
 *     tags: [Zepp Biometrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Zepp OS 디바이스에서 전송된 사용자 ID
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: 데이터 전송 시각
 *               data:
 *                 type: object
 *                 properties:
 *                   heartRate:
 *                     type: number
 *                     description: 심박수 (bpm)
 *                   oxygenLevel:
 *                     type: number
 *                     description: 산소포화도 (%)
 *                   accelerometer:
 *                     type: object
 *                     properties:
 *                       x:
 *                         type: number
 *                       y:
 *                         type: number
 *                       z:
 *                         type: number
 *                 description: 생체 데이터 객체
 *     responses:
 *       200:
 *         description: 데이터 성공적으로 수신 및 처리됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 receivedData:
 *                   type: object
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 오류
 */
router.post('/', async (req, res) => {
  try {
    const { userId, timestamp, data } = req.body;

    if (!userId || !timestamp || !data) {
      return res.status(400).json({ success: false, message: '필수 데이터(userId, timestamp, data)가 누락되었습니다.' });
    }

    logger.info('Zepp Biometric Data Received', { userId, timestamp, data });

    // TODO: 여기에 수신된 데이터를 LLM 분석 시스템으로 전달하는 로직 추가
    // 예: substanceDetectionSystem.analyzeBiometricData(userId, data);

    res.status(200).json({ success: true, message: '데이터 성공적으로 수신 및 처리됨', receivedData: req.body });
  } catch (error) {
    logger.error('Error receiving Zepp biometric data', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '서버 내부 오류', error: error.message });
  }
});

module.exports = router;
