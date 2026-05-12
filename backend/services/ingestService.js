const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const { analyzeBiometricAndMaybeOpenCase } = require('./analyzerService');
const { emitBiometricDataUpdated } = require('./socketService');

const amazfitWearRef = new Map();
const amazfitLocationRef = new Map();

function isValidLocation(loc) {
  /**
   * GPS 좌표가 0,0 이거나 비정상 범위면 미수집으로 처리합니다.
   */
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  if (loc.lat === 0 && loc.lng === 0) return false;
  const inKorea = loc.lat >= 33.0 && loc.lat <= 38.9 && loc.lng >= 124.0 && loc.lng <= 132.0;
  return inKorea;
}

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
 * - raw: 원문(선택)
 */
function normalizeIncomingPayload(payload, meta) {
  requireField(payload, 'userId', 'userId가 필요합니다.');

  const isWear = typeof payload.isWear === 'boolean' ? payload.isWear : undefined;

  /**
   * Amazfit 워치 시간이 실제 서버 시간과 크게 어긋나면 최근 window 조회에서 누락되므로,
   * 수신 시각 기준으로 수집 시간을 보정합니다.
   */
  const receivedAt = meta?.receivedAt || new Date();
  let collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : receivedAt;
  if (Number.isNaN(collectedAt.getTime())) {
    const err = new Error('collectedAt 형식이 올바르지 않습니다.');
    err.statusCode = 400;
    throw err;
  }
  if (payload?.source === 'amazfit') {
    const skewMs = Math.abs(collectedAt.getTime() - receivedAt.getTime());
    if (skewMs > 10 * 60 * 1000) {
      collectedAt = receivedAt;
    }
  }

  const lat = asNumberOrUndefined(payload?.location?.lat);
  const lng = asNumberOrUndefined(payload?.location?.lng);
  if ((lat === undefined || lng === undefined) && payload?.source !== 'amazfit') {
    const err = new Error('location.lat, location.lng가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }

  const rawBase = payload.raw || payload;
  const rawData = isWear === undefined ? rawBase : { ...rawBase, isWear };

  return {
    userId: payload.userId,
    collectedAt,
    isWear,
    heartRate: asNumberOrUndefined(payload.heartRate),
    stressLevel: asNumberOrUndefined(payload.stressLevel),
    spO2: asNumberOrUndefined(payload.spO2 ?? payload.spo2),
    bodyTemperature: asNumberOrUndefined(payload.bodyTemperature ?? payload.bodyTemp ?? payload.temperature),
    steps: asNumberOrUndefined(payload.steps),
    hrv: asNumberOrUndefined(payload.hrv),
    noiseDb: asNumberOrUndefined(payload.noiseDb ?? payload.noise_db),
    batteryLevel: asNumberOrUndefined(payload.batteryLevel ?? payload.battery),
    movementStatus: payload.movementStatus,
    acceleration: payload.acceleration,
    gyroscope: payload.gyroscope,
    barometer: payload.barometer,
    location:
      typeof lat === 'number' && typeof lng === 'number'
        ? {
            lat,
            lng,
            accuracy: asNumberOrUndefined(payload?.location?.accuracy),
            altitude: asNumberOrUndefined(payload?.location?.altitude),
            timestamp: payload?.location?.timestamp ? new Date(payload.location.timestamp) : collectedAt,
          }
        : undefined,
    rawData,
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

  if (sourceLabel === 'amazfit' && typeof normalized.isWear === 'boolean') {
    amazfitWearRef.set(String(normalized.userId || ''), { isWear: normalized.isWear, atMs: Date.now() });
  }

  if (sourceLabel === 'amazfit' && typeof normalized.isWear !== 'boolean') {
    const userKey = String(normalized.userId || '');
    const nowMs = Date.now();
    const hr = normalized.heartRate;
    const last = amazfitWearRef.get(userKey);
    const lastWearTrue =
      last && last.isWear === true && typeof last.atMs === 'number' && nowMs - last.atMs <= 8000;

    if (lastWearTrue && typeof hr === 'number' && Number.isFinite(hr) && hr > 0) {
      normalized.isWear = true;
      normalized.rawData = { ...(normalized.rawData || {}), isWear: true };
    } else {
      normalized.isWear = false;
      normalized.heartRate = 0;
      normalized.rawData = { ...(normalized.rawData || {}), isWear: false, heartRate: 0 };
    }
  }

  if (sourceLabel === 'amazfit' && typeof normalized.bodyTemperature === 'number' && Number.isFinite(normalized.bodyTemperature)) {
    if (normalized.bodyTemperature < 20 || normalized.bodyTemperature > 45) {
      normalized.bodyTemperature = undefined;
    }
  }

  if (sourceLabel === 'amazfit') {
    if (normalized.isWear === false && typeof normalized.heartRate === 'number' && normalized.heartRate > 0) {
      normalized.heartRate = 0;
      normalized.rawData = { ...(normalized.rawData || {}), heartRate: 0 };
    }
  }

  const user = await User.findById(normalized.userId).select('_id status hospitalMode settings baselineBiometric wearableDevice');
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

  if (sourceLabel === 'amazfit') {
    const userKey = String(normalized.userId || '');
    const hasValid = isValidLocation(normalized.location);

    if (hasValid) {
      amazfitLocationRef.set(userKey, { location: normalized.location, atMs: Date.now() });
    } else {
      normalized.location = undefined;
      const cached = amazfitLocationRef.get(userKey);
      const phoneLoc = user?.wearableDevice?.lastKnownLocation;
      const phoneValid = isValidLocation(phoneLoc);
      const phoneAtMs =
        phoneLoc && phoneLoc.updatedAt ? new Date(phoneLoc.updatedAt).getTime() : 0;
      const cachedAtMs = cached && typeof cached.atMs === 'number' ? cached.atMs : 0;

      if (phoneValid && phoneAtMs >= cachedAtMs) {
        normalized.location = {
          lat: phoneLoc.lat,
          lng: phoneLoc.lng,
          accuracy: typeof phoneLoc.accuracyM === 'number' ? phoneLoc.accuracyM : undefined,
          timestamp: phoneLoc.updatedAt ? new Date(phoneLoc.updatedAt) : normalized.collectedAt,
        };
        amazfitLocationRef.set(userKey, { location: normalized.location, atMs: Date.now() });
      } else if (cached && cached.location) {
        normalized.location = cached.location;
      } else {
        const last = await BiometricData.findOne({ userId: normalized.userId })
          .sort({ collectedAt: -1 })
          .select('location')
          .lean()
          .catch(() => null);
        if (last && isValidLocation(last.location)) {
          normalized.location = last.location;
          amazfitLocationRef.set(userKey, { location: normalized.location, atMs: Date.now() });
        } else {
          normalized.location = { lat: 37.5665, lng: 126.978, timestamp: normalized.collectedAt };
        }
      }
      normalized.rawData = { ...(normalized.rawData || {}), location: normalized.location };
    }
  }

  const doc = await BiometricData.create({
    userId: normalized.userId,
    collectedAt: normalized.collectedAt,
    heartRate: normalized.heartRate,
    stressLevel: normalized.stressLevel,
    spO2: normalized.spO2,
    bodyTemperature: normalized.bodyTemperature,
    steps: normalized.steps,
    hrv: normalized.hrv,
    noiseDb: normalized.noiseDb,
    batteryLevel: normalized.batteryLevel,
    movementStatus: normalized.movementStatus || 'unknown',
    acceleration: normalized.acceleration,
    gyroscope: normalized.gyroscope,
    barometer: normalized.barometer,
    location: normalized.location,
    rawData: normalized.rawData,
  });

  const quickStressLevel = (() => {
    const hr = typeof doc.heartRate === 'number' && Number.isFinite(doc.heartRate) ? doc.heartRate : 0;
    const spO2 = typeof doc.spO2 === 'number' && Number.isFinite(doc.spO2) ? doc.spO2 : null;
    const temp = typeof doc.bodyTemperature === 'number' && Number.isFinite(doc.bodyTemperature) ? doc.bodyTemperature : null;
    const baseline = typeof user?.baselineBiometric?.heartRate?.avg === 'number' && Number.isFinite(user.baselineBiometric.heartRate.avg)
      ? user.baselineBiometric.heartRate.avg
      : 70;
    const movement = String(doc.movementStatus || 'unknown');

    let score = 20;
    const hrDelta = hr > 0 ? hr - baseline : 0;
    if (hrDelta > 0) score += Math.min(40, hrDelta * 1.2);
    if (movement === 'running') score += 10;
    if (movement === 'fall_detected') score += 20;
    if (typeof spO2 === 'number' && spO2 > 0 && spO2 < 95) score += (95 - spO2) * 1.5;
    if (typeof temp === 'number' && temp > 0 && temp >= 37.6) score += Math.min(15, (temp - 37.5) * 10);
    return Math.round(Math.min(100, Math.max(0, score)));
  })();

  await User.updateOne(
    { _id: normalized.userId },
    {
      $set: {
        'wearableDevice.lastSyncAt': normalized.collectedAt,
        'wearableDevice.connectionStatus': 'connected',
      },
    },
  );

  emitBiometricDataUpdated(String(normalized.userId), {
    collectedAt: doc.collectedAt,
    heartRate: doc.heartRate,
    isWear: normalized.isWear,
    spO2: doc.spO2,
    bodyTemperature: doc.bodyTemperature,
    stressLevel: doc.stressLevel,
    steps: doc.steps,
    movementStatus: doc.movementStatus,
    batteryLevel: doc.batteryLevel,
    acceleration: doc.acceleration,
    gyroscope: doc.gyroscope,
    barometer: doc.barometer,
    location: doc.location,
  });

  const analysisPromise = analyzeBiometricAndMaybeOpenCase({
    user,
    biometricDoc: doc,
  }).catch(() => null);
  const analysis = await Promise.race([
    analysisPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 500)),
  ]);
  if (analysis === null) {
    analysisPromise.catch(() => null);
  }

  return {
    biometricId: doc._id,
    analyzed: Boolean(analysis),
    analysis: analysis || { stressLevel: quickStressLevel },
  };
}

async function ingestMockPayload(payload, meta) {
  return ingestCommon(payload, meta, 'mock');
}

async function ingestAmazfitPayload(payload, meta) {
  return ingestCommon(payload, meta, 'amazfit');
}

module.exports = {
  ingestMockPayload,
  ingestAmazfitPayload,
};
