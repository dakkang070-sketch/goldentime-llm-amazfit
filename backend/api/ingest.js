const express = require('express');
const crypto = require('crypto');
const { ingestMockPayload, ingestAmazfitPayload } = require('../services/ingestService');
const logger = require('../utils/logger');
const BiometricData = require('../models/BiometricData');
const cacheService = require('../services/cacheService');

/**
 * mock/Amazfit 생체 업로드와 최근 데이터 조회 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();

/**
 * 사용자별 Amazfit 요약 로그 스로틀 키를 생성합니다.
 */
function buildAmazfitLogThrottleKey(userId) {
  return `throttle:/api/ingest/amazfit/log:${String(userId || '').trim()}`;
}

/**
 * 프록시/클라우드플레어 환경을 포함해 실제 클라이언트 IP를 우선 추출합니다.
 */
function getRequestClientIp(req) {
  const cfConnectingIp = String(req.headers['cf-connecting-ip'] || '').trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = String(req.headers['x-forwarded-for'] || '').trim();
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return String(req.ip || '').trim();
}

/**
 * 동일한 Amazfit 업로드 재전송을 짧은 시간 안에서만 같은 키로 묶습니다.
 */
function buildAmazfitIdempotencyKey(body = {}) {
  const fingerprint = {
    userId: String(body?.userId || ''),
    collectedAt: String(body?.collectedAt || ''),
    heartRate: body?.heartRate ?? null,
    spO2: body?.spO2 ?? null,
    bodyTemperature: body?.bodyTemperature ?? null,
    steps: body?.steps ?? null,
    stressLevel: body?.stressLevel ?? null,
    batteryLevel: body?.batteryLevel ?? null,
    isWear: body?.isWear ?? null,
  };
  const digest = crypto.createHash('sha1').update(JSON.stringify(fingerprint)).digest('hex');
  return `idempotency:/api/ingest/amazfit:${digest}`;
}

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
/**
 * 개발용 Mock 생체 데이터를 공통 ingest 서비스로 전달합니다.
 */
router.post('/mock', async (req, res, next) => {
  try {
    const result = await ingestMockPayload(req.body, {
      sourceIp: getRequestClientIp(req),
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
 * /api/ingest/amazfit:
 *   post:
 *     summary: Amazfit(Zepp Side Service) 생체 데이터 업로드
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
 *               collectedAt:
 *                 type: string
 *               heartRate:
 *                 type: number
 *               spO2:
 *                 type: number
 *               bodyTemperature:
 *                 type: number
 *               steps:
 *                 type: number
 *               stressLevel:
 *                 type: number
 *               movementStatus:
 *                 type: string
 *               acceleration:
 *                 type: object
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       200:
 *         description: 업로드 성공
 */
/**
 * Amazfit 워치/브리지에서 전송한 생체 payload를 수집하고 저장합니다.
 */
router.post('/amazfit', async (req, res, next) => {
  try {
    const idempotencyKey = buildAmazfitIdempotencyKey(req.body);
    const cachedResponse = await cacheService.get(idempotencyKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    if (req.body?.isWear === true) {
      const userId = String(req.body?.userId || '');
      const now = Date.now();
      const last = Number((await cacheService.get(buildAmazfitLogThrottleKey(userId))) || 0);
      // 워치 생체 업로드는 빈도가 높아 사용자별 5초 간격으로만 요약 로그를 남깁니다.
      if (now - last >= 5000) {
        await cacheService.set(buildAmazfitLogThrottleKey(userId), now, 10);
        logger.info('ingest:amazfit', {
          userId: req.body?.userId,
          collectedAt: req.body?.collectedAt,
          heartRate: req.body?.heartRate,
        });
      }
    }
    // #region debug-point D:amazfit-ingest-input
    (()=>{const _b=req.body||{};if(_b&&(_b.isWear===false||(typeof _b.heartRate==='number'&&_b.heartRate>0))){const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='location-input-stall';try{const e=fs.readFileSync('.dbg/location-input-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'D',location:'backend/api/ingest.js:112',msg:'[DEBUG] amazfit ingest payload received',data:{userId:_b.userId||null,source:_b.source||null,collectedAt:_b.collectedAt||null,isWear:_b.isWear,heartRate:_b.heartRate,spO2:_b.spO2,bodyTemperature:_b.bodyTemperature,steps:_b.steps,batteryLevel:_b.batteryLevel,movementStatus:_b.movementStatus||null,location:_b.location||null},ts:Date.now()})}).catch(()=>{});}})();
    // #endregion
    const result = await ingestAmazfitPayload(req.body, {
      sourceIp: getRequestClientIp(req),
      userAgent: req.get('user-agent'),
      receivedAt: new Date(),
    });
    const responsePayload = { success: true, ...result };
    await cacheService.set(idempotencyKey, responsePayload, 30);
    res.json(responsePayload);
  } catch (err) {
    next(err);
  }
});

/**
 * 최근 지정 시간 범위 안의 최신 Amazfit 생체 데이터를 조회합니다.
 */
router.get('/amazfit/latest', async (req, res, next) => {
  try {
    const userId = String(req.query?.userId || '').trim();
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
    }

    const minutesRaw = Number(req.query?.minutes);
    // 모바일/관제에서 최근 N분 창 안의 최신 1건만 빠르게 가져올 수 있게 제한합니다.
    const minutes = Number.isFinite(minutesRaw) ? Math.min(24 * 60, Math.max(1, Math.floor(minutesRaw))) : 60;
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const doc = await BiometricData.findOne({
      userId,
      collectedAt: { $gte: since },
    })
      .sort({ collectedAt: -1 })
      .lean();

    if (!doc) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        biometricId: doc._id,
        userId: doc.userId,
        collectedAt: doc.collectedAt,
        heartRate: doc.heartRate,
        spO2: doc.spO2,
        bodyTemperature: doc.bodyTemperature,
        steps: doc.steps,
        stressLevel: doc.stressLevel,
        batteryLevel: doc.batteryLevel,
        movementStatus: doc.movementStatus,
        acceleration: doc.acceleration,
        gyroscope: doc.gyroscope,
        barometer: doc.barometer,
        location: doc.location,
        analysis: doc.analysis,
        rawData: doc.rawData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ingest API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
