const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const { analyzeBiometricAndMaybeOpenCase } = require('./analyzerService');

function asNumberOrUndefined(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function requireField(obj, key, message) {
  if (obj?.[key] === undefined || obj?.[key] === null) {
    const err = new Error(message || `필수 필드 누락: ${key}`);
    err.statusCode = 400;
    throw err;
  }
}

/**
 * 표준화된 업로드 페이로드(우리 서버 기준)
 * - userId: Mongo ObjectId (가입 후 발급)
 * - collectedAt: ISO8601 (없으면 서버 수신시간)
 * - heartRate, stressLevel, movementStatus, location{lat,lng,accuracy}
 * - raw: Zepp 원문(선택)
 */
function normalizeIncomingPayload(payload, meta) {
  requireField(payload, 'userId', 'userId가 필요합니다.');

  const collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : (meta?.receivedAt || new Date());
  if (Number.isNaN(collectedAt.getTime())) {
    const err = new Error('collectedAt 형식이 올바르지 않습니다.');
    err.statusCode = 400;
    throw err;
  }

  const lat = asNumberOrUndefined(payload?.location?.lat);
  const lng = asNumberOrUndefined(payload?.location?.lng);
  if (lat === undefined || lng === undefined) {
    const err = new Error('location.lat, location.lng가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }

  return {
    userId: payload.userId,
    collectedAt,
    heartRate: asNumberOrUndefined(payload.heartRate),
    stressLevel: asNumberOrUndefined(payload.stressLevel),
    movementStatus: payload.movementStatus,
    acceleration: payload.acceleration,
    location: {
      lat,
      lng,
      accuracy: asNumberOrUndefined(payload?.location?.accuracy),
      altitude: asNumberOrUndefined(payload?.location?.altitude),
      timestamp: payload?.location?.timestamp ? new Date(payload.location.timestamp) : collectedAt,
    },
    rawData: payload.raw || payload,
    _meta: {
      source: payload.source || 'unknown',
      sourceIp: meta?.sourceIp,
      userAgent: meta?.userAgent,
      receivedAt: meta?.receivedAt,
    },
  };
}

async function ingestCommon(payload, meta, sourceLabel) {
  const normalized = normalizeIncomingPayload({ ...payload, source: sourceLabel }, meta);

  const user = await User.findById(normalized.userId).select('_id status hospitalMode settings baselineBiometric').lean();
  if (!user) {
    const err = new Error('존재하지 않는 userId 입니다.');
    err.statusCode = 404;
    throw err;
  }
  if (user.status !== 'active' && user.status !== 'hospitalized') {
    const err = new Error('비활성 사용자입니다.');
    err.statusCode = 403;
    throw err;
  }

  const doc = await BiometricData.create({
    userId: normalized.userId,
    collectedAt: normalized.collectedAt,
    heartRate: normalized.heartRate,
    stressLevel: normalized.stressLevel,
    movementStatus: normalized.movementStatus || 'unknown',
    acceleration: normalized.acceleration,
    location: normalized.location,
    rawData: normalized.rawData,
  });

  // 입원모드인 경우: “응급 출동” 로직을 제한하는 방향으로 이후 analyzerService에서 처리
  const analysis = await analyzeBiometricAndMaybeOpenCase({
    user,
    biometricDoc: doc,
  });

  return {
    biometricId: doc._id,
    analyzed: Boolean(analysis),
    analysis,
  };
}

async function ingestZeppPayload(payload, meta) {
  return ingestCommon(payload, meta, 'zepp');
}

async function ingestMockPayload(payload, meta) {
  return ingestCommon(payload, meta, 'mock');
}

module.exports = {
  ingestZeppPayload,
  ingestMockPayload,
};

