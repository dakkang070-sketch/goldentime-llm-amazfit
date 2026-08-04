const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const { analyzeBiometricAndMaybeOpenCase } = require('./analyzerService');
const { emitBiometricDataUpdated } = require('./socketService');
const { getIpLocationCache, setIpLocationCache } = require('./ipLocationCacheService');
const {
  setAmazfitWearEntry,
  getAmazfitWearEntry,
  setAmazfitLocationEntry,
} = require('./ingestRuntimeCacheService');

const PHONE_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
const CACHE_LOCATION_MAX_AGE_MS = 90 * 1000;
const LAST_BIOMETRIC_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;
const LAST_PHONE_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
const IP_LOCATION_CACHE_TTL_MS = 2 * 60 * 1000;
const IP_LOCATION_LOOKUP_TIMEOUT_MS = 2500;
const IP_LOCATION_CLUSTER_RADIUS_M = 15000;
const BLOCKED_LOCATION_POINTS = [
  { lat: 37.5665, lng: 126.9780 },
  { lat: 37.5560719, lng: 126.9723599 },
];

/**
 * 운영에서 금지한 서울 fallback 좌표와 사실상 같은 좌표인지 판별합니다.
 */
function isBlockedLocationPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return BLOCKED_LOCATION_POINTS.some(
    (point) => Math.abs(lat - point.lat) <= 0.0002 && Math.abs(lng - point.lng) <= 0.0002,
  );
}

/**
 * 관제 지도에 쓸 수 있는 실제 위치 좌표인지 판별합니다.
 * 0,0 좌표와 운영에서 금지한 fallback 좌표, 한국 영역 밖 좌표는 모두 제외합니다.
 */
function isValidLocation(loc) {
  /**
   * GPS 좌표가 0,0 이거나 비정상 범위면 미수집으로 처리합니다.
   */
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  if (loc.lat === 0 && loc.lng === 0) return false;
  if (isBlockedLocationPoint(loc.lat, loc.lng)) return false;
  const inKorea = loc.lat >= 33.0 && loc.lat <= 38.9 && loc.lng >= 124.0 && loc.lng <= 132.0;
  return inKorea;
}

/**
 * 숫자/문자 혼합 입력을 저장 전 숫자형으로 정규화합니다.
 */
function asNumberOrUndefined(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 위치 메타데이터를 표준화합니다.
 * 관제/모바일/분석 로직이 같은 형태의 source/provider/정확도 정보를 보도록 맞춥니다.
 */
function buildLocationMeta({ source, provider, accuracyM, timestamp, ageMs }) {
  return {
    source,
    provider: typeof provider === 'string' && provider.trim() ? provider.trim() : undefined,
    accuracyM: typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? accuracyM : undefined,
    timestamp: timestamp ? new Date(timestamp) : undefined,
    ageMs: typeof ageMs === 'number' && Number.isFinite(ageMs) && ageMs >= 0 ? Math.round(ageMs) : undefined,
  };
}

/**
 * 외부 위치 서비스로 해석 가능한 공개 IP만 남기고 내부망/루프백 주소는 제외합니다.
 */
function isPrivateOrLoopbackIp(rawIp) {
  const ip = String(rawIp || '').trim().replace(/^::ffff:/, '');
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('fe80:')) return true;
  return false;
}

/**
 * 두 좌표 사이의 대략적인 직선 거리를 meter 단위로 계산합니다.
 */
function getApproxDistanceMeters(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

/**
 * 외부 IP 위치 서비스 1곳을 조회해 표준 좌표 객체로 정규화합니다.
 */
async function fetchIpLocationCandidate(ip, provider, url, mapPayload) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IP_LOCATION_LOOKUP_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const mapped = mapPayload(payload);
    if (
      !mapped ||
      typeof mapped.lat !== 'number' ||
      typeof mapped.lng !== 'number' ||
      !Number.isFinite(mapped.lat) ||
      !Number.isFinite(mapped.lng)
    ) {
      return null;
    }
    return {
      lat: mapped.lat,
      lng: mapped.lng,
      accuracy: typeof mapped.accuracy === 'number' && Number.isFinite(mapped.accuracy) ? mapped.accuracy : 5000,
      provider,
    };
  } catch {
    return null;
  }
}

/**
 * 여러 IP 위치 후보 중 서로 가장 가깝게 일치하는 좌표를 선택합니다.
 */
function pickBestIpLocationCandidate(candidates) {
  const valid = candidates.filter(
    (candidate) =>
      candidate &&
      typeof candidate.lat === 'number' &&
      typeof candidate.lng === 'number' &&
      Number.isFinite(candidate.lat) &&
      Number.isFinite(candidate.lng),
  );
  if (valid.length === 0) {
    return null;
  }
  if (valid.length === 1) {
    return valid[0];
  }

  let best = valid[0];
  let bestNeighborCount = -1;
  let bestDistanceScore = Number.POSITIVE_INFINITY;

  for (const candidate of valid) {
    let neighborCount = 0;
    let distanceScore = 0;

    for (const other of valid) {
      const distance = getApproxDistanceMeters(candidate, other);
      if (distance <= IP_LOCATION_CLUSTER_RADIUS_M) {
        neighborCount += 1;
      }
      distanceScore += distance;
    }

    if (
      neighborCount > bestNeighborCount ||
      (neighborCount === bestNeighborCount && distanceScore < bestDistanceScore)
    ) {
      best = candidate;
      bestNeighborCount = neighborCount;
      bestDistanceScore = distanceScore;
    }
  }

  return best;
}

/**
 * 요청 IP 기준의 대략 위치를 조회해 워치/폰 위치가 모두 비었을 때 최후 fallback으로 사용합니다.
 */
async function resolveApproxLocationFromIp(rawIp) {
  const ip = String(rawIp || '').trim().replace(/^::ffff:/, '');
  if (!ip || isPrivateOrLoopbackIp(ip)) {
    return null;
  }

  const cached = await getIpLocationCache('ingest-ip', ip);
  if (cached) {
    return cached;
  }

  const candidates = (
    await Promise.all([
      fetchIpLocationCandidate(
        ip,
        'ipwho.is',
        `https://ipwho.is/${encodeURIComponent(ip)}`,
        (payload) => {
          const lat = Number(payload?.latitude);
          const lng = Number(payload?.longitude);
          if (!payload?.success || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          return { lat, lng, accuracy: 5000 };
        },
      ),
      fetchIpLocationCandidate(
        ip,
        'ipapi.co',
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        (payload) => {
          const lat = Number(payload?.latitude);
          const lng = Number(payload?.longitude);
          if (payload?.error || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          return { lat, lng, accuracy: 5000 };
        },
      ),
      fetchIpLocationCandidate(
        ip,
        'ipinfo.io',
        `https://ipinfo.io/${encodeURIComponent(ip)}/json`,
        (payload) => {
          const rawLoc = String(payload?.loc || '').trim();
          if (!rawLoc.includes(',')) {
            return null;
          }
          const [latText, lngText] = rawLoc.split(',');
          const lat = Number(latText);
          const lng = Number(lngText);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          return { lat, lng, accuracy: 5000 };
        },
      ),
    ])
  ).filter(Boolean);

  const bestCandidate = pickBestIpLocationCandidate(candidates);
  if (!bestCandidate) {
    return null;
  }

  const value = {
    lat: bestCandidate.lat,
    lng: bestCandidate.lng,
    accuracy: bestCandidate.accuracy,
    provider: bestCandidate.provider,
    timestamp: new Date(),
  };
  await setIpLocationCache('ingest-ip', ip, value, IP_LOCATION_CACHE_TTL_MS);
  return value;
}

/**
 * 폰 위치 provider/정확도를 기준으로 GPS·Wi-Fi·기지국 출처를 분류합니다.
 */
function resolvePhoneLocationSource(phoneLoc) {
  const provider =
    typeof phoneLoc?.provider === 'string' ? phoneLoc.provider.trim().toLowerCase() : '';
  const accuracyM =
    typeof phoneLoc?.accuracyM === 'number' && Number.isFinite(phoneLoc.accuracyM)
      ? phoneLoc.accuracyM
      : undefined;

  if (provider.includes('gps') || provider.includes('gnss')) {
    return 'phone_gps';
  }
  if (provider.includes('wifi') || provider.includes('wi-fi')) {
    return 'wifi_position';
  }
  if (
    provider.includes('cell') ||
    provider.includes('cellular') ||
    provider.includes('lte') ||
    provider.includes('nr') ||
    provider.includes('5g') ||
    provider.includes('4g') ||
    provider.includes('3g')
  ) {
    return 'cell_position';
  }
  if (
    provider.includes('browser_geolocation') ||
    provider.includes('fused') ||
    provider.includes('network')
  ) {
    // OS가 합성한 위치는 정확도를 기준으로 GPS/Wi-Fi/기지국에 가깝게 분류합니다.
    if (typeof accuracyM === 'number') {
      if (accuracyM <= 35) return 'phone_gps';
      if (accuracyM <= 120) return 'wifi_position';
      return 'cell_position';
    }
  }

  return 'mobile_app';
}

/**
 * 워치/앱에서 막 들어온 실측 좌표만 현재 포지셔닝 후보로 선택합니다.
 * 캐시, 직전 저장, IP fallback은 지도 오표시를 유발할 수 있어 여기서는 제외합니다.
 */
async function resolveAmazfitLocation({ normalized, user, meta }) {
  const userKey = String(normalized.userId || '');
  const nowMs = Date.now();
  const hasValid = isValidLocation(normalized.location);

  if (hasValid) {
    const watchLocation = {
      ...normalized.location,
      timestamp: normalized.location?.timestamp || normalized.collectedAt,
    };
    // 워치에서 직접 들어온 유효 좌표는 가장 신뢰도가 높으므로 바로 채택합니다.
    await setAmazfitLocationEntry(userKey, { location: watchLocation, atMs: nowMs });
    return {
      location: watchLocation,
      meta: buildLocationMeta({
        source: 'watch_gps',
        provider: 'watch_gnss',
        accuracyM: watchLocation.accuracy,
        timestamp: watchLocation.timestamp,
        ageMs:
          watchLocation.timestamp instanceof Date
            ? Math.max(0, nowMs - watchLocation.timestamp.getTime())
            : 0,
      }),
    };
  }

  const phoneLoc = user?.wearableDevice?.lastKnownLocation;
  const phoneValid = isValidLocation(phoneLoc);
  const phoneAtMs =
    phoneLoc && phoneLoc.updatedAt ? new Date(phoneLoc.updatedAt).getTime() : 0;
  // 폰 보조 위치는 provider 문자열과 정확도로 GPS/Wi-Fi/기지국 계열을 구분합니다.
  const phoneSource = resolvePhoneLocationSource(phoneLoc);
  // #region debug-point D:resolve-phone-location
  (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'D',location:'backend/services/ingestService.js:350',msg:'[DEBUG] resolve amazfit phone fallback inspected',data:{userId:userKey||null,watchLat:typeof normalized.location?.lat==='number'?normalized.location.lat:null,watchLng:typeof normalized.location?.lng==='number'?normalized.location.lng:null,hasValidWatchLocation:hasValid,phoneLat:typeof phoneLoc?.lat==='number'?phoneLoc.lat:null,phoneLng:typeof phoneLoc?.lng==='number'?phoneLoc.lng:null,phoneProvider:typeof phoneLoc?.provider==='string'?phoneLoc.provider:null,phoneSource,phoneValid,phoneAtMs,phoneAgeMs:phoneAtMs>0?nowMs-phoneAtMs:null},ts:Date.now()})}).catch(()=>{});})();
  // #endregion
  if (phoneValid && phoneAtMs > 0 && nowMs - phoneAtMs <= PHONE_LOCATION_MAX_AGE_MS) {
    const location = {
      lat: phoneLoc.lat,
      lng: phoneLoc.lng,
      accuracy: typeof phoneLoc.accuracyM === 'number' ? phoneLoc.accuracyM : undefined,
      timestamp: new Date(phoneAtMs),
    };
    await setAmazfitLocationEntry(userKey, { location, atMs: nowMs });
    return {
      location,
      meta: buildLocationMeta({
        source: phoneSource,
        provider: typeof phoneLoc.provider === 'string' ? phoneLoc.provider : 'phone_fused',
        accuracyM: typeof phoneLoc.accuracyM === 'number' ? phoneLoc.accuracyM : undefined,
        timestamp: phoneAtMs,
        ageMs: nowMs - phoneAtMs,
      }),
    };
  }

  return {
    location: undefined,
    meta: buildLocationMeta({
      source: 'unavailable',
      provider: 'none',
      timestamp: normalized.collectedAt,
      ageMs: undefined,
    }),
  };
}

/**
 * Amazfit 착용 중 미측정 0 값은 저장 전에 제거합니다.
 */
function clearAmazfitZeroWhileWorn(normalized) {
  if (!normalized || normalized.isWear !== true) return normalized;

  if (!(typeof normalized.heartRate === 'number' && Number.isFinite(normalized.heartRate) && normalized.heartRate > 0)) {
    normalized.heartRate = undefined;
  }

  if (!(typeof normalized.spO2 === 'number' && Number.isFinite(normalized.spO2) && normalized.spO2 > 0)) {
    normalized.spO2 = undefined;
  }

  if (!(typeof normalized.bodyTemperature === 'number' && Number.isFinite(normalized.bodyTemperature) && normalized.bodyTemperature > 0)) {
    normalized.bodyTemperature = undefined;
  }

  normalized.rawData = {
    ...(normalized.rawData || {}),
    heartRate: normalized.heartRate,
    spO2: normalized.spO2,
    bodyTemperature: normalized.bodyTemperature,
  };

  return normalized;
}

/**
 * Amazfit 손목 피부온도는 중심체온 절대값 대신 baseline 편차 중심으로만 가볍게 반영합니다.
 */
function getTemperatureStressBonus({ user, doc }) {
  const temp = typeof doc?.bodyTemperature === 'number' && Number.isFinite(doc.bodyTemperature) ? doc.bodyTemperature : null;
  if (typeof temp !== 'number' || temp <= 0) return 0;

  const source = String(doc?.rawData?.source || doc?.source || '').toLowerCase();
  if (source === 'amazfit') {
    const baseline =
      typeof user?.baselineBiometric?.wristTemperature?.avg === 'number' &&
      Number.isFinite(user.baselineBiometric.wristTemperature.avg)
        ? user.baselineBiometric.wristTemperature.avg
        : null;
    const delta = typeof baseline === 'number' ? temp - baseline : null;

    if (typeof delta === 'number' && delta >= 1.5) return 8;
    if (typeof delta === 'number' && delta >= 1.0) return 4;
    if (temp >= 36.1) return 2;
    return 0;
  }

  if (temp >= 37.6) return Math.min(15, (temp - 37.5) * 10);
  return 0;
}

/**
 * `requireField` 기능을 수행합니다.
 */
function requireField(obj, key, message) {
  if (obj?.[key] === undefined || obj?.[key] === null) {
    // 라우터별 개별 검증 대신 ingest 공통 진입점에서 필수 필드를 동일 규칙으로 막습니다.
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
    fallScore: asNumberOrUndefined(payload.fallScore),
    emergencyScore: asNumberOrUndefined(payload.emergencyScore),
    fallFeatures: payload.fallFeatures,
    responseState:
      typeof payload.responseState === 'string' &&
      ['unknown', 'responsive', 'delayed', 'no_response'].includes(payload.responseState)
        ? payload.responseState
        : undefined,
    ageRiskWeight: asNumberOrUndefined(payload.ageRiskWeight),
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

/**
 * `ingestCommon` 기능을 수행합니다.
 */
async function ingestCommon(payload, meta, sourceLabel) {
  const normalized = normalizeIncomingPayload({ ...payload, source: sourceLabel }, meta);
  // #region debug-point A:ingest-common-entry
  (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'A',location:'backend/services/ingestService.js:391',msg:'[DEBUG] ingestCommon entry',data:{sourceLabel,userId:String(normalized.userId||''),collectedAt:normalized.collectedAt instanceof Date?normalized.collectedAt.toISOString():null,heartRate:normalized.heartRate??null,spO2:normalized.spO2??null,isWear:normalized.isWear??null,metaReceivedAt:meta?.receivedAt instanceof Date?meta.receivedAt.toISOString():null},ts:Date.now()})}).catch(()=>{});})();
  // #endregion

  if (sourceLabel === 'amazfit' && typeof normalized.isWear === 'boolean') {
    // 워치가 직접 보낸 착용 여부는 다음 샘플의 보정 기준으로 짧게 메모리에 남깁니다.
    await setAmazfitWearEntry(String(normalized.userId || ''), {
      isWear: normalized.isWear,
      atMs: Date.now(),
    });
  }

  if (sourceLabel === 'amazfit' && typeof normalized.isWear !== 'boolean') {
    const userKey = String(normalized.userId || '');
    const nowMs = Date.now();
    const hr = normalized.heartRate;
    const last = await getAmazfitWearEntry(userKey);
    const lastWearTrue =
      last && last.isWear === true && typeof last.atMs === 'number' && nowMs - last.atMs <= 8000;

    if (lastWearTrue && typeof hr === 'number' && Number.isFinite(hr) && hr > 0) {
      // 직전 착용 true와 유효 심박이 이어지면 이번 샘플도 착용 상태로 추정합니다.
      normalized.isWear = true;
      normalized.rawData = { ...(normalized.rawData || {}), isWear: true };
    } else {
      // 착용 근거가 약하면 탈착으로 보고 잔류 심박을 0 처리해 오판을 줄입니다.
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

    clearAmazfitZeroWhileWorn(normalized);
  }

  const user = await User.findById(normalized.userId).select('_id status hospitalMode settings baselineBiometric wearableDevice');
  // #region debug-point B:user-lookup-result
  (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'B',location:'backend/services/ingestService.js:434',msg:'[DEBUG] user lookup result',data:{userId:String(normalized.userId||''),userFound:Boolean(user),userStatus:user?.status||null,lastSyncAt:user?.wearableDevice?.lastSyncAt instanceof Date?user.wearableDevice.lastSyncAt.toISOString():user?.wearableDevice?.lastSyncAt||null,connectionStatus:user?.wearableDevice?.connectionStatus||null},ts:Date.now()})}).catch(()=>{});})();
  // #endregion
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
    const resolvedLocation = await resolveAmazfitLocation({ normalized, user, meta });
    normalized.location = resolvedLocation.location;
    normalized.rawData = {
      ...(normalized.rawData || {}),
      location: normalized.location,
      locationMeta: resolvedLocation.meta,
    };
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
    fallScore: normalized.fallScore,
    emergencyScore: normalized.emergencyScore,
    fallFeatures: normalized.fallFeatures,
    responseState: normalized.responseState,
    ageRiskWeight: normalized.ageRiskWeight,
    location: normalized.location,
    rawData: normalized.rawData,
  });
  // #region debug-point C:biometric-doc-created
  (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/services/ingestService.js:455',msg:'[DEBUG] biometric doc created',data:{biometricId:String(doc._id||''),userId:String(doc.userId||''),collectedAt:doc.collectedAt instanceof Date?doc.collectedAt.toISOString():null,heartRate:doc.heartRate??null,spO2:doc.spO2??null,bodyTemperature:doc.bodyTemperature??null,steps:doc.steps??null},ts:Date.now()})}).catch(()=>{});})();
  // #endregion

  /**
   * `quickStressLevel` 기능을 수행합니다.
   */
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
    score += getTemperatureStressBonus({ user, doc });
    // LLM 분석이 아직 안 끝나도 응답에 최소 스트레스 요약을 넣기 위한 즉시 계산값입니다.
    return Math.round(Math.min(100, Math.max(0, score)));
  })();

  await User.updateOne(
    { _id: normalized.userId },
    {
      $set: {
        'wearableDevice.lastSyncAt': normalized.collectedAt,
        'wearableDevice.connectionStatus': 'connected',
        ...(isValidLocation(normalized.location)
          ? {
              'wearableDevice.lastKnownLocation': {
                lat: normalized.location.lat,
                lng: normalized.location.lng,
                accuracyM:
                  typeof normalized.location.accuracy === 'number' && Number.isFinite(normalized.location.accuracy)
                    ? normalized.location.accuracy
                    : undefined,
                provider:
                  typeof normalized.rawData?.locationMeta?.provider === 'string'
                    ? normalized.rawData.locationMeta.provider
                    : undefined,
                source:
                  normalized.rawData?.locationMeta?.source === 'watch_gps'
                    ? 'watch'
                    // 사용자 웨어러블 상태에는 폰 계열 위치를 하나로 묶어 저장합니다.
                    : normalized.rawData?.locationMeta?.source === 'mobile_app' ||
                        normalized.rawData?.locationMeta?.source === 'phone_fallback' ||
                        normalized.rawData?.locationMeta?.source === 'phone_gps' ||
                        normalized.rawData?.locationMeta?.source === 'wifi_position' ||
                        normalized.rawData?.locationMeta?.source === 'cell_position' ||
                        normalized.rawData?.locationMeta?.source === 'ip_position'
                      ? 'phone'
                      : 'unknown',
                updatedAt:
                  normalized.location.timestamp instanceof Date
                    ? normalized.location.timestamp
                    : normalized.collectedAt,
              },
            }
          : {}),
      },
      ...(sourceLabel === 'amazfit' && !isValidLocation(normalized.location)
        ? {
            $unset: {
              'wearableDevice.lastKnownLocation': 1,
            },
          }
        : {}),
    },
  );
  // #region debug-point D:user-sync-updated
  (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'D',location:'backend/services/ingestService.js:502',msg:'[DEBUG] user wearable sync updated',data:{userId:String(normalized.userId||''),collectedAt:normalized.collectedAt instanceof Date?normalized.collectedAt.toISOString():null,connectionStatus:'connected',locationSource:normalized.rawData?.locationMeta?.source||null,isValidLocation:Boolean(normalized.location&&Number.isFinite(normalized.location.lat)&&Number.isFinite(normalized.location.lng))},ts:Date.now()})}).catch(()=>{});})();
  // #endregion

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
    locationMeta: doc.rawData?.locationMeta,
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
    // 업로드 응답 지연을 막기 위해 분석이 느리면 저장/브로드캐스트만 먼저 끝내고 뒤에서 계속 돌립니다.
    analysisPromise.catch(() => null);
  }

  return {
    biometricId: doc._id,
    analyzed: Boolean(analysis),
    analysis: analysis || { stressLevel: quickStressLevel },
  };
}

/**
 * mock 업로드 payload를 공통 ingest 흐름으로 전달합니다.
 */
async function ingestMockPayload(payload, meta) {
  return ingestCommon(payload, meta, 'mock');
}

/**
 * Amazfit 업로드 payload를 공통 ingest 흐름으로 전달합니다.
 */
async function ingestAmazfitPayload(payload, meta) {
  return ingestCommon(payload, meta, 'amazfit');
}

/**
 * 업로드 출처별 ingest 진입 함수를 외부 라우터에서 재사용할 수 있도록 export 합니다.
 */
module.exports = {
  ingestMockPayload,
  ingestAmazfitPayload,
};
