const express = require('express');
const crypto = require('crypto');
/**
 * 관제사 인증, 대시보드, 매칭 관리 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();
const Controller = require('../models/Controller');
const User = require('../models/User');
const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const Hospital = require('../models/Hospital');
const { authRequired: requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { cacheMiddleware } = require('../middleware/cache');
const { authLimiter } = require('../middleware/rateLimiter');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { autoMatchHospitalForCase } = require('../services/hospitalService');
const { emitParamedicMatched, emitHospitalMatched } = require('../services/socketService');
const { sendVerificationSms } = require('../services/smsService');
const {
  setVerificationEntry,
  getVerificationEntry,
  deleteVerificationEntry,
} = require('../services/verificationCacheService');

const ADMIN_MENU_PERMISSIONS = ['controllers', 'welfare', 'members', 'guardians', 'history', 'settings', 'admins'];
const TOPIS_CCTV_LIST_URL = 'https://topis.seoul.go.kr/map/cctv/selectCctvList.do';
const TOPIS_CCTV_INFO_URL = 'https://topis.seoul.go.kr/map/selectCctvInfo.do';
const TOPIS_CCTV_MAP_URL = 'https://topis.seoul.go.kr/map/openCctvMap.do';
const TOPIS_CCTV_CACHE_TTL_MS = 5 * 60 * 1000;
const TOPIS_CCTV_DETAIL_LIMIT = 6;
let topisCctvIndexCache = {
  expiresAt: 0,
  cameras: [],
};
const CONTROLLER_IP_LOCATION_CACHE_TTL_MS = 2 * 60 * 1000;
const CONTROLLER_IP_LOCATION_LOOKUP_TIMEOUT_MS = 2500;
const CONTROLLER_IP_LOCATION_CLUSTER_RADIUS_M = 15000;
const controllerIpLocationCache = new Map();
const BLOCKED_CONTROLLER_LOCATION_POINTS = [
  { lat: 37.5665, lng: 126.9780 },
  { lat: 37.5560719, lng: 126.9723599 },
];

/**
 * 서울 fallback으로 금지한 좌표와 사실상 같은 좌표인지 판별합니다.
 */
function isBlockedControllerLocationPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  return BLOCKED_CONTROLLER_LOCATION_POINTS.some(
    (point) => Math.abs(lat - point.lat) <= 0.0002 && Math.abs(lng - point.lng) <= 0.0002,
  );
}

/**
 * 응답 위치 객체가 금지 좌표면 좌표값만 제거하고 주소/시각 같은 나머지 정보는 유지합니다.
 */
function sanitizeBlockedLocationObject(location) {
  if (!location || typeof location !== 'object') {
    return location;
  }

  const lat = typeof location.lat === 'number' ? location.lat : Number(location.lat);
  const lng = typeof location.lng === 'number' ? location.lng : Number(location.lng);
  if (!isBlockedControllerLocationPoint(lat, lng)) {
    return location;
  }

  const next = { ...location };
  delete next.lat;
  delete next.lng;
  delete next.accuracy;
  delete next.accuracyM;
  delete next.altitude;
  return next;
}

/**
 * 최신 생체 응답에서 금지 좌표가 보이면 위치 필드만 제거해 지도에 다시 뜨지 않게 합니다.
 */
function sanitizeBiometricForResponse(biometric) {
  if (!biometric || typeof biometric !== 'object') {
    return biometric;
  }

  const location = sanitizeBlockedLocationObject(biometric.location);
  const rawData =
    biometric.rawData && typeof biometric.rawData === 'object'
      ? { ...biometric.rawData }
      : biometric.rawData;

  if (
    rawData &&
    typeof rawData === 'object' &&
    rawData.location &&
    typeof rawData.location === 'object'
  ) {
    rawData.location = sanitizeBlockedLocationObject(rawData.location);
    const rawLat =
      rawData.location && typeof rawData.location.lat === 'number'
        ? rawData.location.lat
        : Number.NaN;
    const rawLng =
      rawData.location && typeof rawData.location.lng === 'number'
        ? rawData.location.lng
        : Number.NaN;
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
      rawData.location = undefined;
      rawData.locationMeta = {
        ...(rawData.locationMeta && typeof rawData.locationMeta === 'object' ? rawData.locationMeta : {}),
        source: 'unavailable',
        provider: 'blocked_seoul_fallback',
      };
    }
  }

  return {
    ...biometric,
    location:
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
        ? location
        : undefined,
    rawData,
  };
}

/**
 * 응급 케이스 응답의 좌표 필드에서 금지 좌표를 제거합니다.
 */
function sanitizeEmergencyCaseForResponse(emergencyCase) {
  if (!emergencyCase || typeof emergencyCase !== 'object') {
    return emergencyCase;
  }

  const next = typeof emergencyCase.toObject === 'function' ? emergencyCase.toObject() : { ...emergencyCase };

  if (next.locations && typeof next.locations === 'object') {
    if (next.locations.detectedAt) {
      next.locations.detectedAt = sanitizeBlockedLocationObject(next.locations.detectedAt);
    }
    if (next.locations.current) {
      next.locations.current = sanitizeBlockedLocationObject(next.locations.current);
    }
    if (next.locations.hospital) {
      next.locations.hospital = sanitizeBlockedLocationObject(next.locations.hospital);
    }
  }

  if (next.biometricSnapshot && typeof next.biometricSnapshot === 'object') {
    next.biometricSnapshot = {
      ...next.biometricSnapshot,
      location: sanitizeBlockedLocationObject(next.biometricSnapshot.location),
    };
  }

  return next;
}

/**
 * 관제 API 요청에서 프록시 헤더를 우선 적용해 실제 클라이언트 IP를 추출합니다.
 */
function getRequestClientIp(req) {
  const forwardedFor = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  const fallbackIp = req.ip || req.socket?.remoteAddress || '';
  return String(forwardedFor || fallbackIp || '').trim().replace(/^::ffff:/, '');
}

/**
 * 사설/루프백 IP는 외부 IP 위치 조회 대상에서 제외합니다.
 */
function isPrivateOrLoopbackIp(rawIp) {
  const ip = String(rawIp || '').trim().replace(/^::ffff:/, '');
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^fc/i.test(ip) || /^fd/i.test(ip)) return true;
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
    const timeoutId = setTimeout(() => controller.abort(), CONTROLLER_IP_LOCATION_LOOKUP_TIMEOUT_MS);
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
      accuracyM:
        typeof mapped.accuracyM === 'number' && Number.isFinite(mapped.accuracyM)
          ? mapped.accuracyM
          : 5000,
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
      if (distance <= CONTROLLER_IP_LOCATION_CLUSTER_RADIUS_M) {
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
 * 현재 관제 요청의 공인 IP를 기준으로 대략 위치를 계산합니다.
 */
async function resolveApproxLocationFromRequestIp(req) {
  const ip = getRequestClientIp(req);
  if (!ip || isPrivateOrLoopbackIp(ip)) {
    return null;
  }

  const cached = controllerIpLocationCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
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
          return { lat, lng, accuracyM: 5000 };
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
          return { lat, lng, accuracyM: 5000 };
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
          return { lat, lng, accuracyM: 5000 };
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
    accuracyM: bestCandidate.accuracyM,
    provider: bestCandidate.provider,
    source: 'ip_position',
    timestamp: new Date().toISOString(),
  };
  controllerIpLocationCache.set(ip, {
    expiresAt: Date.now() + CONTROLLER_IP_LOCATION_CACHE_TTL_MS,
    value,
  });
  return value;
}

/**
 * 휴대폰 번호 문자열을 숫자만 남긴 표준 키 형식으로 정규화합니다.
 */
function normalizePhoneNumber(rawPhone) {
  return String(rawPhone || '').replace(/\D/g, '').slice(0, 11);
}

/**
 * 운영자 등록에 사용하는 6자리 문자 인증번호를 생성합니다.
 */
function generatePhoneVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 휴대폰 인증 완료 후 등록 요청에서 재사용할 임시 토큰을 생성합니다.
 */
function generatePhoneVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * 휴대폰 인증 정보가 만료됐는지 확인합니다.
 */
function isExpiredAt(timestamp) {
  return typeof timestamp !== 'number' || timestamp <= Date.now();
}

/**
 * 운영자 번호 변경 요청에 포함된 인증 토큰이 해당 번호로 검증 완료된 값인지 확인합니다.
 */
async function hasVerifiedStaffPhoneToken(normalizedPhone, phoneVerificationToken) {
  const verificationEntry = await getVerificationEntry('staff-phone', normalizedPhone);
  return Boolean(
    verificationEntry &&
      verificationEntry.verifiedToken === String(phoneVerificationToken || '') &&
      !isExpiredAt(verificationEntry.verifiedUntil),
  );
}

/**
 * 관제요원/복지담당자 승인 상태에 맞는 로그인 차단 메시지를 반환합니다.
 */
function resolveControllerApprovalMessage(accountStatus) {
  if (accountStatus === 'pending') return '어드민 승인 대기 중입니다.';
  if (accountStatus === 'rejected') return '가입 신청이 반려되었습니다. 관리자에게 문의해주세요.';
  if (accountStatus === 'suspended') return '이용이 정지된 계정입니다.';
  if (accountStatus === 'withdrawn') return '해지된 계정입니다.';
  return '로그인할 수 없는 계정 상태입니다.';
}

/**
 * 운영자 요약 응답에 공통 필드를 맞춰 반환합니다.
 */
function serializeControllerSummary(controller) {
  return {
    id: controller._id,
    name: controller.name,
    email: controller.email,
    phone: controller.phone || '',
    role: controller.role,
    affiliation: controller.affiliation,
    accountStatus: controller.accountStatus,
    menuPermissions: controller.menuPermissions || [],
    pendingAffiliationChange: hasPendingAffiliationChange(controller.pendingAffiliationChange)
      ? normalizePendingAffiliationChange(controller.pendingAffiliationChange)
      : null,
  };
}

/**
 * 복지사 이메일을 앞 2자리만 남기고 마스킹합니다.
 */
function maskControllerEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [localPart = '', domain = ''] = normalizedEmail.split('@');
  if (!localPart || !domain) {
    return '';
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * 어드민에서 수동 등록할 운영자 역할 값을 허용 목록으로 정규화합니다.
 */
function resolveManualControllerRole(role) {
  if (role === 'medical') return 'medical';
  if (role === 'admin') return 'admin';
  return 'controller';
}

/**
 * 상세 편집에서 내부 운영자 구분값이 유효한지 확인합니다.
 */
function validateEditableControllerRole(role) {
  if (!role) return null;
  if (role === 'controller' || role === 'medical' || role === 'admin') return null;
  return '운영자 유형은 관제요원, 복지사 또는 관리자만 지원합니다.';
}

/**
 * 관리자 메뉴 권한 목록을 중복 없이 정규화합니다.
 */
function normalizeMenuPermissions(rawMenuPermissions) {
  const input = Array.isArray(rawMenuPermissions) ? rawMenuPermissions : [];
  const normalized = input
    .map((permission) => String(permission || '').trim())
    .filter((permission) => ADMIN_MENU_PERMISSIONS.includes(permission));

  return Array.from(new Set(normalized));
}

/**
 * 요청 본문의 시/구/동 입력을 공통 affiliation 구조로 정규화합니다.
 */
function normalizeAffiliationInput(rawAffiliation = {}, fallback = {}) {
  return {
    city: String(rawAffiliation.city || fallback.city || '').trim(),
    district: String(rawAffiliation.district || fallback.district || '').trim(),
    dong: String(rawAffiliation.dong || fallback.dong || '').trim(),
  };
}

/**
 * 두 소속 정보가 같은 행정구역을 가리키는지 비교합니다.
 */
function isSameAffiliation(leftAffiliation = {}, rightAffiliation = {}) {
  const left = normalizeAffiliationInput(leftAffiliation);
  const right = normalizeAffiliationInput(rightAffiliation);
  return left.city === right.city && left.district === right.district && left.dong === right.dong;
}

/**
 * 승인 대기 중인 복지사 소속 변경 요청을 화면용으로 정규화합니다.
 */
function normalizePendingAffiliationChange(rawPendingAffiliationChange = {}) {
  return {
    city: String(rawPendingAffiliationChange.city || '').trim(),
    district: String(rawPendingAffiliationChange.district || '').trim(),
    dong: String(rawPendingAffiliationChange.dong || '').trim(),
    requestedAt: rawPendingAffiliationChange.requestedAt || null,
  };
}

/**
 * 복지사 소속 변경 요청이 실제로 채워져 있는지 확인합니다.
 */
function hasPendingAffiliationChange(rawPendingAffiliationChange = {}) {
  const pendingAffiliation = normalizePendingAffiliationChange(rawPendingAffiliationChange);
  return Boolean(pendingAffiliation.city || pendingAffiliation.district || pendingAffiliation.dong);
}

/**
 * 관제사 소속 값이 전체 범위를 의미하는지 확인합니다.
 */
function isWildcardAffiliationValue(value) {
  const normalized = String(value || '').trim();
  return !normalized || normalized === '전체';
}

/**
 * 관제사 소속 범위와 회원 소속이 일치하는지 확인합니다.
 */
function matchesControllerAffiliation(controllerAffiliation = {}, userAffiliation = {}) {
  const controllerRegion = normalizeAffiliationInput(controllerAffiliation);
  const userRegion = normalizeAffiliationInput(userAffiliation);

  if (!isWildcardAffiliationValue(controllerRegion.city) && controllerRegion.city !== userRegion.city) {
    return false;
  }
  if (!isWildcardAffiliationValue(controllerRegion.district) && controllerRegion.district !== userRegion.district) {
    return false;
  }
  if (!isWildcardAffiliationValue(controllerRegion.dong) && controllerRegion.dong !== userRegion.dong) {
    return false;
  }

  return true;
}

/**
 * 현재 로그인한 관제사 문서를 조회합니다.
 */
async function getCurrentController(req) {
  const controllerId = req.user?.sub || req.user?.userId;
  if (!controllerId) {
    return null;
  }

  return Controller.findById(controllerId)
    .select('name email phone role affiliation accountStatus menuPermissions pendingAffiliationChange assignedUsers')
    .lean();
}

/**
 * 현재 관제사가 접근 가능한 회원 범위를 assignedUsers 또는 소속 기준으로 계산합니다.
 */
function buildControllerScopedUserQuery(controller = {}) {
  const baseQuery = {
    isEmergencyAppUser: true,
    accountStatus: 'active',
  };
  const assignedUserIds = Array.isArray(controller.assignedUsers)
    ? controller.assignedUsers.filter(Boolean)
    : [];
  const normalizedAffiliation = normalizeAffiliationInput(controller.affiliation);
  const affiliationQuery = {};

  if (!isWildcardAffiliationValue(normalizedAffiliation.city)) {
    affiliationQuery['affiliation.city'] = normalizedAffiliation.city;
  }
  if (!isWildcardAffiliationValue(normalizedAffiliation.district)) {
    affiliationQuery['affiliation.district'] = normalizedAffiliation.district;
  }
  if (!isWildcardAffiliationValue(normalizedAffiliation.dong)) {
    affiliationQuery['affiliation.dong'] = normalizedAffiliation.dong;
  }

  const hasExplicitGlobalScope =
    normalizedAffiliation.city === '전체' &&
    normalizedAffiliation.district === '전체' &&
    normalizedAffiliation.dong === '전체';

  const scopeFilters = [];
  if (assignedUserIds.length > 0) {
    scopeFilters.push({ _id: { $in: assignedUserIds } });
  }
  if (Object.keys(affiliationQuery).length > 0) {
    scopeFilters.push(affiliationQuery);
  }

  if (scopeFilters.length > 0) {
    return {
      ...baseQuery,
      $or: scopeFilters,
    };
  }

  if (hasExplicitGlobalScope) {
    return baseQuery;
  }

  return {
    ...baseQuery,
    _id: { $in: [] },
  };
}

/**
 * 관제사/복지사의 관리 범위에 맞는 응급 케이스 목록을 공통 규격으로 조회합니다.
 */
async function loadScopedEmergencyCasesForStaff(staff, filters = {}) {
  const { status, emergencyLevel } = filters;
  const query = {};
  const scopedUsers = await User.find(buildControllerScopedUserQuery(staff))
    .select('_id affiliation')
    .lean();
  const allowedUserIds = scopedUsers
    .filter((user) => matchesControllerAffiliation(staff.affiliation, user.affiliation))
    .map((user) => user._id);

  if (allowedUserIds.length === 0) {
    return [];
  }

  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ['detected', 'matched', 'in_progress', 'transporting'] };
  }

  if (emergencyLevel) {
    query.emergencyLevel = parseInt(emergencyLevel, 10);
  }
  query.userId = { $in: allowedUserIds };

  const cases = await EmergencyCase.find(query)
    .populate('userId', 'name phone age gender baselineBiometric')
    .populate('paramedic.paramedicId', 'name phone currentLocation')
    .populate('hospital.localHospitalId', 'name location emergencyRoom')
    .select('+llmAnalysis +detectedAnomalies')
    .sort({ createdAt: -1 })
    .limit(100);

  return cases.map((item) => sanitizeEmergencyCaseForResponse(item));
}

/**
 * 관제사/복지사의 관리 범위에 맞는 최신 모니터링 회원과 생체 데이터를 함께 조회합니다.
 */
async function loadScopedMonitoredUsersForStaff(staff, windowMinutesRaw) {
  const windowMinutes = Math.min(
    60,
    Math.max(1, Number.isFinite(Number(windowMinutesRaw)) ? Number(windowMinutesRaw) : 10),
  );
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const users = await User.find({
    ...buildControllerScopedUserQuery(staff),
    'wearableDevice.deviceId': { $exists: true, $ne: null },
    'wearableDevice.lastSyncAt': { $exists: true, $ne: null, $gte: since },
  })
    .select('name phone age birthDate bloodType gender wearableDevice emergencyContact accountStatus affiliation')
    .sort({ 'wearableDevice.lastSyncAt': -1 })
    .lean();
  const scopedUsers = users.filter((user) => matchesControllerAffiliation(staff.affiliation, user.affiliation));

  const userIds = scopedUsers.map((u) => u._id);
  const BiometricData = require('../models/BiometricData');
  const latestRows =
    userIds.length === 0
      ? []
      : await BiometricData.aggregate([
          { $match: { userId: { $in: userIds } } },
          { $sort: { collectedAt: -1 } },
          { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
        ]);
  const recentPeakRows =
    userIds.length === 0
      ? []
      : await BiometricData.aggregate([
          { $match: { userId: { $in: userIds }, collectedAt: { $gte: since } } },
          {
            $group: {
              _id: '$userId',
              recentFallPeakScore: { $max: { $ifNull: ['$fallScore', 0] } },
            },
          },
        ]);

  const latestByUserId = new Map(latestRows.map((r) => [String(r._id), r.doc]));
  const recentPeakByUserId = new Map(
    recentPeakRows.map((r) => [String(r._id), r.recentFallPeakScore]),
  );

  const monitoredUsers = await Promise.all(scopedUsers.map(async (u) => {
    const latestBiometricSeed = latestByUserId.get(String(u._id))
      ? {
          ...latestByUserId.get(String(u._id)),
          recentFallPeakScore: recentPeakByUserId.get(String(u._id)) || 0,
        }
      : null;
    const latestBiometricRecovered = await resolvePreferredLatestBiometric(
      BiometricData,
      u._id,
      latestBiometricSeed,
    );
    const latestBiometricWithFallback = applyWearableLocationFallback(latestBiometricRecovered, u);
    const latestBiometric = sanitizeBiometricForResponse(latestBiometricWithFallback);
    const isOnline = Boolean(u?.wearableDevice?.lastSyncAt && new Date(u.wearableDevice.lastSyncAt) >= since);
    // #region debug-point D:watch-map-missing-monitored-users
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-map-missing';try{const e=fs.readFileSync('.dbg/watch-map-missing.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'D',location:'backend/api/controllers.js:1508',msg:'[DEBUG] monitored-users location snapshot',data:{userId:String(u?._id||''),name:u?.name||null,biometricLat:typeof latestBiometric?.location?.lat==='number'?latestBiometric.location.lat:null,biometricLng:typeof latestBiometric?.location?.lng==='number'?latestBiometric.location.lng:null,biometricSource:latestBiometric?.rawData?.locationMeta?.source||null,biometricProvider:latestBiometric?.rawData?.locationMeta?.provider||null,lastKnownLat:typeof u?.wearableDevice?.lastKnownLocation?.lat==='number'?u.wearableDevice.lastKnownLocation.lat:null,lastKnownLng:typeof u?.wearableDevice?.lastKnownLocation?.lng==='number'?u.wearableDevice.lastKnownLocation.lng:null,lastKnownProvider:u?.wearableDevice?.lastKnownLocation?.provider||null,lastKnownSource:u?.wearableDevice?.lastKnownLocation?.source||null,isOnline},ts:Date.now()})}).catch(()=>{});})();
    // #endregion
    // #region debug-point B:monitored-users-location-choice
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='stale-watch-location';try{const e=fs.readFileSync('.dbg/stale-watch-location.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'B',location:'backend/api/controllers.js:1150',msg:'[DEBUG] monitored-users location candidates',data:{userId:String(u?._id||''),name:u?.name||null,biometricLat:typeof latestBiometric?.location?.lat==='number'?latestBiometric.location.lat:null,biometricLng:typeof latestBiometric?.location?.lng==='number'?latestBiometric.location.lng:null,biometricCollectedAt:latestBiometric?.collectedAt instanceof Date?latestBiometric.collectedAt.toISOString():latestBiometric?.collectedAt||null,biometricLocationTimestamp:latestBiometric?.location?.timestamp instanceof Date?latestBiometric.location.timestamp.toISOString():latestBiometric?.location?.timestamp||null,lastKnownLat:typeof u?.wearableDevice?.lastKnownLocation?.lat==='number'?u.wearableDevice.lastKnownLocation.lat:null,lastKnownLng:typeof u?.wearableDevice?.lastKnownLocation?.lng==='number'?u.wearableDevice.lastKnownLocation.lng:null,lastKnownUpdatedAt:u?.wearableDevice?.lastKnownLocation?.updatedAt instanceof Date?u.wearableDevice.lastKnownLocation.updatedAt.toISOString():u?.wearableDevice?.lastKnownLocation?.updatedAt||null,lastKnownProvider:u?.wearableDevice?.lastKnownLocation?.provider||null,isOnline},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    // #region debug-point A:kim-taeyun-monitored-users
    (()=>{if(u?.name!=='김태윤')return;const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='kim-taeyun-realtime';try{const e=fs.readFileSync('.dbg/kim-taeyun-realtime.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'A',location:'backend/api/controllers.js:1158',msg:'[DEBUG] 김태윤 monitored-users snapshot',data:{userId:String(u._id),name:u?.name||null,deviceId:u?.wearableDevice?.deviceId||null,lastSyncAt:u?.wearableDevice?.lastSyncAt||null,isOnline,hasLatestBiometric:Boolean(latestBiometric),latestCollectedAt:latestBiometric?.collectedAt||null,heartRate:latestBiometric?.heartRate??null,spO2:latestBiometric?.spO2??null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    // #region debug-point A:monitored-users-response
    (()=>{const _doc=latestBiometric;const _wear=_doc?.rawData?.isWear;const _hr=_doc?.heartRate;const _spo2=_doc?.spO2;const _temp=_doc?.bodyTemperature;if(_doc&&(_wear===false||(typeof _hr==='number'&&_hr>0))){const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-remove-detection';try{const e=fs.readFileSync('.dbg/watch-remove-detection.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'A',location:'backend/api/controllers.js:255',msg:'[DEBUG] monitored-users latest biometric snapshot',data:{userId:String(u._id),name:u?.name||null,isOnline,rawIsWear:_wear,heartRate:_hr,spO2:_spo2,bodyTemperature:_temp,collectedAt:_doc?.collectedAt||null},ts:Date.now()})}).catch(()=>{});}})();
    // #endregion

    return {
      ...u,
      wearableDevice: sanitizeWearableDeviceForResponse(u),
      isOnline,
      latestBiometric,
    };
  }));

  return {
    windowMinutes,
    users: monitoredUsers,
  };
}

/**
 * 관제요원/복지사 관리구역 소속 입력값을 검증합니다.
 */
function validateStaffAffiliation(role, affiliation) {
  if (role === 'admin') {
    return null;
  }

  if (!affiliation.city || !affiliation.district || !affiliation.dong) {
    return role === 'medical'
      ? '복지사는 시/도, 시/군/구, 읍/면/동까지 모두 선택해야 합니다.'
      : '관제요원은 시/도, 시/군/구, 읍/면/동까지 모두 선택해야 합니다.';
  }

  return null;
}

/**
 * 숫자형 query/body 값을 안전하게 실수로 변환합니다.
 */
function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 두 좌표 간 대략적인 직선거리를 미터 단위로 계산합니다.
 */
function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (degree) => (degree * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const originLat = toRad(lat1);
  const targetLat = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

/**
 * TOPIS CCTV 목록 응답에서 문자열/숫자 좌표 값을 안전한 숫자로 정규화합니다.
 */
function toFiniteCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * TOPIS 호출 시 공통 헤더와 타임아웃을 포함한 fetch 옵션을 생성합니다.
 */
function createTopisRequestOptions(method = 'GET', body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  return {
    timeoutId,
    options: {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 Goldentime/1.0',
        Accept: 'application/json, text/plain, */*',
        Referer: TOPIS_CCTV_MAP_URL,
        ...(body
          ? {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            }
          : {}),
      },
      ...(body ? { body } : {}),
    },
  };
}

/**
 * TOPIS CCTV 전체 목록을 주기적으로 캐시해 nearby 조회마다 전체 페이지를 반복 호출하지 않게 합니다.
 */
async function loadTopisCctvListPage(pageIndex) {
  const form = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: '10',
    cctvName: '',
  });
  const request = createTopisRequestOptions('POST', form.toString());

  try {
    const response = await fetch(TOPIS_CCTV_LIST_URL, request.options);
    if (!response.ok) {
      throw new Error(`TOPIS list HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(request.timeoutId);
  }
}

/**
 * TOPIS CCTV 전체 목록을 주기적으로 캐시해 nearby 조회마다 전체 페이지를 반복 호출하지 않게 합니다.
 */
async function loadTopisCctvIndex() {
  if (topisCctvIndexCache.expiresAt > Date.now() && topisCctvIndexCache.cameras.length > 0) {
    return topisCctvIndexCache.cameras;
  }

  const firstPage = await loadTopisCctvListPage(1);
  const totalPageCount = Math.max(1, Number(firstPage?.paginationInfo?.totalPageCount) || 1);
  const allRows = [...(Array.isArray(firstPage?.rows) ? firstPage.rows : [])];

  for (let startPage = 2; startPage <= totalPageCount; startPage += 8) {
    const pageNumbers = [];
    for (let pageIndex = startPage; pageIndex < startPage + 8 && pageIndex <= totalPageCount; pageIndex += 1) {
      pageNumbers.push(pageIndex);
    }

    const pagePayloads = await Promise.all(pageNumbers.map((pageIndex) => loadTopisCctvListPage(pageIndex)));
    pagePayloads.forEach((payload) => {
      if (Array.isArray(payload?.rows)) {
        allRows.push(...payload.rows);
      }
    });
  }

  const cameras = allRows
    .map((camera) => {
      const lat = toFiniteCoordinate(camera?.lat);
      const lng = toFiniteCoordinate(camera?.lng);

      if (lat === null || lng === null || !camera?.camId) {
        return null;
      }

      return {
        camId: String(camera.camId),
        camName: String(camera.camName || '').trim() || `TOPIS CCTV ${camera.camId}`,
        lat,
        lng,
      };
    })
    .filter(Boolean);

  if (cameras.length === 0) {
    throw new Error('TOPIS list payload is empty');
  }

  topisCctvIndexCache = {
    expiresAt: Date.now() + TOPIS_CCTV_CACHE_TTL_MS,
    cameras,
  };

  return cameras;
}

/**
 * 개별 camId로 TOPIS 상세 정보를 조회해 실제 HLS 재생 주소를 가져옵니다.
 */
async function loadTopisCctvDetail(camId) {
  const request = createTopisRequestOptions();
  const url = `${TOPIS_CCTV_INFO_URL}?camId=${encodeURIComponent(String(camId))}`;

  try {
    const response = await fetch(url, request.options);
    if (!response.ok) {
      throw new Error(`TOPIS detail HTTP ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload?.rows) ? payload.rows[0] || null : null;
  } finally {
    clearTimeout(request.timeoutId);
  }
}

/**
 * TOPIS 전체 카메라 중 요청 좌표 반경 안의 가까운 CCTV만 추려 상세 영상 주소까지 합쳐 반환합니다.
 */
async function buildTopisNearbyCctvCameras(centerLat, centerLng, radiusMeters) {
  const indexCameras = await loadTopisCctvIndex();
  const nearbyCandidates = indexCameras
    .map((camera) => ({
      ...camera,
      distanceMeters: calculateDistanceMeters(centerLat, centerLng, camera.lat, camera.lng),
    }))
    .filter((camera) => camera.distanceMeters <= radiusMeters)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, TOPIS_CCTV_DETAIL_LIMIT);

  const detailedCameras = await Promise.all(
    nearbyCandidates.map(async (camera) => {
      try {
        const detail = await loadTopisCctvDetail(camera.camId);
        const streamUrl = String(
          detail?.remark5 || detail?.hlsUrl || detail?.hlsUrlOri || ''
        ).trim();
        const roadName = String(detail?.roadNm || '').trim();
        const providerName = String(detail?.gvrNm || '').trim();

        return {
          id: `topis-cctv-${camera.camId}`,
          name: String(detail?.cctvName || camera.camName || '').trim() || `TOPIS CCTV ${camera.camId}`,
          lat: toFiniteCoordinate(detail?.axY) ?? camera.lat,
          lng: toFiniteCoordinate(detail?.axX) ?? camera.lng,
          distanceMeters: camera.distanceMeters,
          radiusMeters,
          coverageLabel: roadName || '서울시 도로 CCTV',
          sourceType: 'public_api',
          sourceLabel: providerName ? `서울 TOPIS / ${providerName}` : '서울 TOPIS 공개 CCTV',
          statusLabel: streamUrl ? '실시간 HLS 연결' : '영상 주소 미확인',
          streamType: streamUrl ? 'hls' : 'pending',
          streamUrl,
          externalUrl: TOPIS_CCTV_MAP_URL,
        };
      } catch (error) {
        return {
          id: `topis-cctv-${camera.camId}`,
          name: camera.camName,
          lat: camera.lat,
          lng: camera.lng,
          distanceMeters: camera.distanceMeters,
          radiusMeters,
          coverageLabel: '서울시 도로 CCTV',
          sourceType: 'public_api',
          sourceLabel: '서울 TOPIS 공개 CCTV',
          statusLabel: '상세 조회 실패',
          streamType: 'pending',
          streamUrl: '',
          externalUrl: TOPIS_CCTV_MAP_URL,
        };
      }
    }),
  );

  return detailedCameras;
}

/**
 * 공공 CCTV API 연동 전에도 지도 시연이 가능하도록 주변 fallback CCTV 목록을 생성합니다.
 */
function buildFallbackCctvCameras(centerLat, centerLng, radiusMeters) {
  const offsets = [
    { latOffset: 0.00062, lngOffset: 0.00018, heading: 32, lane: '북측 교차로 진입부' },
    { latOffset: -0.00044, lngOffset: 0.00057, heading: 118, lane: '동측 사거리 횡단부' },
    { latOffset: 0.00015, lngOffset: -0.00071, heading: 264, lane: '서측 버스정류장 전방' },
    { latOffset: -0.00058, lngOffset: -0.00012, heading: 192, lane: '남측 골목 진입부' },
  ];

  return offsets
    .map((offset, index) => {
      const lat = Number((centerLat + offset.latOffset).toFixed(6));
      const lng = Number((centerLng + offset.lngOffset).toFixed(6));
      const distanceMeters = calculateDistanceMeters(centerLat, centerLng, lat, lng);

      return {
        id: `fallback-cctv-${index + 1}`,
        name: `주변 CCTV ${index + 1}`,
        lat,
        lng,
        heading: offset.heading,
        distanceMeters,
        radiusMeters,
        coverageLabel: offset.lane,
        sourceType: 'fallback',
        sourceLabel: '공공 API 연동 대기',
        statusLabel: '연동 준비',
        streamType: 'pending',
        streamUrl: '',
        externalUrl: 'https://topis.seoul.go.kr/map/openCctvMap.do',
      };
    })
    .filter((camera) => camera.distanceMeters <= radiusMeters);
}

/**
 * 관리자이거나 자신의 운영자 계정만 수정하려는 요청인지 확인합니다.
 */
function requireAdminOrSameController(req, res, next) {
  const requesterRole = String(req.user?.role || '').trim();
  const requesterId = String(req.user?.sub || req.user?.userId || '').trim();
  const targetId = String(req.params?.id || '').trim();

  if (requesterRole === 'admin') {
    return next();
  }
  if (!['controller', 'medical'].includes(requesterRole)) {
    return res.status(403).json({
      success: false,
      message: '권한이 없습니다.',
    });
  }
  if (!requesterId || requesterId !== targetId) {
    return res.status(403).json({
      success: false,
      message: '본인 계정만 수정할 수 있습니다.',
    });
  }
  return next();
}

/**
 * 어드민이 운영자 등록 시 휴대폰 인증을 요청합니다.
 * POST /api/controllers/phone-verification/request
 */
router.post('/phone-verification/request', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneNumber(req.body?.phone);

    if (normalizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호를 정확히 입력해주세요.',
      });
    }

    const code = generatePhoneVerificationCode();
    const expiresAt = Date.now() + 3 * 60 * 1000;
    await setVerificationEntry('staff-phone', normalizedPhone, {
      code,
      expiresAt,
      verifiedToken: '',
      verifiedUntil: 0,
    });

    const result = await sendVerificationSms(normalizedPhone, code);
    if (!result.delivered) {
      return res.status(500).json({
        success: false,
        message: '문자 발송에 실패했습니다.',
      });
    }

    return res.json({
      success: true,
      message: '인증번호를 발송했습니다.',
    });
  } catch (error) {
    console.error('운영자 휴대폰 인증번호 발송 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증번호 발송 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 환자 주변 CCTV 목록을 반환합니다.
 * TOPIS 공개 CCTV를 우선 조회하고 실패 시 fallback 카메라 데이터를 반환합니다.
 * GET /api/controllers/cctv/nearby?lat=37.5&lng=127.0&radiusMeters=800
 */
router.get('/cctv/nearby', async (req, res) => {
  try {
    const lat = toFiniteNumber(req.query?.lat);
    const lng = toFiniteNumber(req.query?.lng);
    const requestedRadius = toFiniteNumber(req.query?.radiusMeters);
    const radiusMeters = Math.min(3000, Math.max(150, requestedRadius || 800));

    if (lat === null || lng === null) {
      return res.status(400).json({
        success: false,
        message: '위도와 경도를 정확히 전달해주세요.',
      });
    }

    try {
      const cameras = await buildTopisNearbyCctvCameras(lat, lng, radiusMeters);
      if (cameras.length > 0) {
        return res.json({
          success: true,
          data: {
            source: 'topis',
            message: '서울 TOPIS 공개 CCTV 기준으로 주변 실영상 후보를 조회했습니다.',
            cameras,
          },
        });
      }
    } catch (topisError) {
      console.error('Failed to load TOPIS CCTV cameras:', topisError);
    }

    const cameras = buildFallbackCctvCameras(lat, lng, radiusMeters);

    return res.json({
      success: true,
      data: {
        source: 'fallback',
        message: 'TOPIS CCTV 조회에 실패해 fallback CCTV 목록을 반환합니다.',
        cameras,
      },
    });
  } catch (error) {
    console.error('Failed to load nearby CCTV cameras:', error);
    return res.status(500).json({
      success: false,
      message: '주변 CCTV 목록 조회에 실패했습니다.',
    });
  }
});

/**
 * 어드민이 전달받은 운영자 휴대폰 인증번호를 확인합니다.
 * POST /api/controllers/phone-verification/verify
 */
router.post('/phone-verification/verify', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneNumber(req.body?.phone);
    const inputCode = String(req.body?.code || '').trim();
    const verificationEntry = await getVerificationEntry('staff-phone', normalizedPhone);

    if (!verificationEntry || isExpiredAt(verificationEntry.expiresAt)) {
      await deleteVerificationEntry('staff-phone', normalizedPhone);
      return res.status(400).json({
        success: false,
        message: '인증번호가 만료되었습니다. 다시 요청해주세요.',
      });
    }

    if (verificationEntry.code !== inputCode) {
      return res.status(400).json({
        success: false,
        message: '인증번호가 일치하지 않습니다.',
      });
    }

    const verificationToken = generatePhoneVerificationToken();
    await setVerificationEntry('staff-phone', normalizedPhone, {
      ...verificationEntry,
      verifiedToken: verificationToken,
      verifiedUntil: Date.now() + 10 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: '휴대폰 인증이 완료되었습니다.',
      verificationToken,
    });
  } catch (error) {
    console.error('운영자 휴대폰 인증 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴대폰 인증 확인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 로그인한 운영자가 자신의 휴대폰 번호 변경용 인증번호를 발송합니다.
 * POST /api/controllers/me/phone-verification/request
 */
router.post('/me/phone-verification/request', requireAuth, async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || '').trim();
    if (!['medical', 'controller'].includes(requesterRole)) {
      return res.status(403).json({
        success: false,
        message: '운영자 계정만 요청할 수 있습니다.',
      });
    }

    const normalizedPhone = normalizePhoneNumber(req.body?.phone);
    if (normalizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호를 정확히 입력해주세요.',
      });
    }

    const code = generatePhoneVerificationCode();
    await setVerificationEntry('staff-phone', normalizedPhone, {
      code,
      expiresAt: Date.now() + 3 * 60 * 1000,
      verifiedToken: '',
      verifiedUntil: 0,
    });

    const result = await sendVerificationSms(normalizedPhone, code);
    if (!result.delivered) {
      return res.status(500).json({
        success: false,
        message: '문자 발송에 실패했습니다.',
      });
    }

    return res.json({
      success: true,
      message: '인증번호를 발송했습니다.',
    });
  } catch (error) {
    console.error('운영자 본인 휴대폰 인증번호 발송 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증번호 발송 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 로그인한 운영자가 자신의 휴대폰 번호 변경용 인증번호를 확인합니다.
 * POST /api/controllers/me/phone-verification/verify
 */
router.post('/me/phone-verification/verify', requireAuth, async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || '').trim();
    if (!['medical', 'controller'].includes(requesterRole)) {
      return res.status(403).json({
        success: false,
        message: '운영자 계정만 요청할 수 있습니다.',
      });
    }

    const normalizedPhone = normalizePhoneNumber(req.body?.phone);
    const inputCode = String(req.body?.code || '').trim();
    const verificationEntry = await getVerificationEntry('staff-phone', normalizedPhone);

    if (!verificationEntry || isExpiredAt(verificationEntry.expiresAt)) {
      await deleteVerificationEntry('staff-phone', normalizedPhone);
      return res.status(400).json({
        success: false,
        message: '인증번호가 만료되었습니다. 다시 요청해주세요.',
      });
    }

    if (verificationEntry.code !== inputCode) {
      return res.status(400).json({
        success: false,
        message: '인증번호가 일치하지 않습니다.',
      });
    }

    const verificationToken = generatePhoneVerificationToken();
    await setVerificationEntry('staff-phone', normalizedPhone, {
      ...verificationEntry,
      verifiedToken: verificationToken,
      verifiedUntil: Date.now() + 10 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: '휴대폰 인증이 완료되었습니다.',
      verificationToken,
    });
  } catch (error) {
    console.error('운영자 본인 휴대폰 인증 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴대폰 인증 확인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관제사 가입
 * POST /api/controllers/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, role, affiliation, city, district, dong } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '이름, 이메일, 비밀번호는 필수입니다.'
      });
    }

    const existing = await Controller.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '이미 등록된 이메일입니다.'
      });
    }

    const normalizedRole = role === 'medical' ? 'medical' : 'controller';
    const normalizedAffiliation = normalizeAffiliationInput(affiliation, { city, district, dong });
    const affiliationError = validateStaffAffiliation(normalizedRole, normalizedAffiliation);

    if (affiliationError) {
      return res.status(400).json({
        success: false,
        message: affiliationError
      });
    }

    const controller = await Controller.create({
      name,
      email,
      password,
      phone,
      affiliation: normalizedAffiliation,
      role: normalizedRole,
      accountStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: normalizedRole === 'medical'
        ? '복지담당자 가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.'
        : '관제요원 가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.',
      controller: {
        id: controller._id,
        name: controller.name,
        email: controller.email,
        role: controller.role,
        affiliation: controller.affiliation,
        accountStatus: controller.accountStatus,
      },
    });
  } catch (error) {
    console.error('관제사 가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '관제사 가입 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 복지사 회원가입 시 이메일 중복 여부를 medical 계정 기준으로 확인합니다.
 */
router.post('/check-email', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || 'medical').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: '올바른 이메일 형식이 아닙니다.',
      });
    }

    const duplicated = await Controller.findOne({
      email,
      role: role === 'medical' ? 'medical' : role,
    })
      .select('_id')
      .lean();

    return res.json({
      success: true,
      available: !duplicated,
      message: duplicated ? '이미 사용 중인 이메일입니다.' : '사용 가능한 이메일입니다.',
    });
  } catch (error) {
    console.error('복지사 이메일 중복 확인 오류:', error);
    return res.status(500).json({
      success: false,
      available: false,
      message: '이메일 확인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 복지사 이름과 전화번호로 가입된 이메일을 찾아 마스킹해 반환합니다.
 */
router.post('/find-email', authLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhoneNumber(req.body?.phone);

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: '이름과 전화번호를 입력해주세요.' });
    }

    const controller = await Controller.findOne({
      role: 'medical',
      name,
      phone: { $regex: phone },
    }).lean();

    if (!controller?.email) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 복지사 계정을 찾을 수 없습니다.' });
    }

    return res.json({ success: true, email: maskControllerEmail(controller.email) });
  } catch (error) {
    console.error('복지사 이메일 찾기 오류:', error);
    return res.status(500).json({ success: false, message: '복지사 이메일 찾기 중 오류가 발생했습니다.' });
  }
});

/**
 * 복지사 비밀번호 재설정을 위한 SMS 인증코드를 발송합니다.
 */
router.post('/reset-password/send-code', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = normalizePhoneNumber(req.body?.phone);

    if (!email || !phone) {
      return res.status(400).json({ success: false, message: '이메일과 전화번호를 모두 입력해주세요.' });
    }

    const controller = await Controller.findOne({
      role: 'medical',
      email,
      phone: { $regex: phone },
    });

    if (!controller) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 복지사 계정을 찾을 수 없습니다.' });
    }

    const resetCode = generatePhoneVerificationCode();
    controller.passwordResetCode = resetCode;
    controller.passwordResetCodeExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
    await controller.save();

    await sendVerificationSms(phone, resetCode);
    const maskedPhone = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    return res.json({
      success: true,
      message: `인증코드가 ${maskedPhone}로 발송되었습니다.`,
      maskedPhone,
    });
  } catch (error) {
    console.error('복지사 비밀번호 재설정 SMS 발송 오류:', error);
    return res.status(500).json({ success: false, message: '인증코드 발송 중 오류가 발생했습니다.' });
  }
});

/**
 * 복지사 SMS 인증코드를 확인한 뒤 새 비밀번호로 재설정합니다.
 */
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = normalizePhoneNumber(req.body?.phone);
    const code = String(req.body?.code || '').replace(/[^\d]/g, '');
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !phone || !code || !newPassword) {
      return res.status(400).json({ success: false, message: '필수 정보를 모두 입력해주세요.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const controller = await Controller.findOne({
      role: 'medical',
      email,
      phone: { $regex: phone },
    });

    if (!controller) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 복지사 계정을 찾을 수 없습니다.' });
    }
    if (!controller.passwordResetCode || controller.passwordResetCode !== code) {
      return res.status(400).json({ success: false, message: '인증코드가 일치하지 않습니다.' });
    }
    if (!controller.passwordResetCodeExpiresAt || controller.passwordResetCodeExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: '인증코드가 만료되었습니다. 다시 요청해주세요.' });
    }

    controller.password = newPassword;
    controller.passwordResetCode = null;
    controller.passwordResetCodeExpiresAt = null;
    controller.lastActivity = new Date();
    await controller.save();

    return res.json({ success: true, message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' });
  } catch (error) {
    console.error('복지사 비밀번호 재설정 오류:', error);
    return res.status(500).json({ success: false, message: '복지사 비밀번호 재설정 중 오류가 발생했습니다.' });
  }
});

/**
 * 어드민에서 관제요원/복지사를 수동 등록합니다.
 * POST /api/controllers/admin-create
 */
router.post('/admin-create', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, role, affiliation, city, district, dong, menuPermissions, phoneVerificationToken } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '이름, 이메일, 비밀번호는 필수입니다.',
      });
    }

    const existing = await Controller.findOne({ email: String(email).toLowerCase() }).select('_id').lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 이메일입니다.',
      });
    }

    const normalizedRole = resolveManualControllerRole(role);
    const normalizedAffiliation = normalizeAffiliationInput(affiliation, { city, district, dong });
    const normalizedMenuPermissions =
      normalizedRole === 'admin' ? normalizeMenuPermissions(menuPermissions) : [];
    const affiliationError = validateStaffAffiliation(normalizedRole, normalizedAffiliation);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (affiliationError) {
      return res.status(400).json({
        success: false,
        message: affiliationError,
      });
    }

    const verificationEntry = await getVerificationEntry('staff-phone', normalizedPhone);

    if (normalizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호는 필수입니다.',
      });
    }

    if (
      !verificationEntry ||
      verificationEntry.verifiedToken !== String(phoneVerificationToken || '') ||
      isExpiredAt(verificationEntry.verifiedUntil)
    ) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 인증을 완료한 뒤 등록해주세요.',
      });
    }

    const controller = await Controller.create({
      name,
      email,
      password,
      phone,
      affiliation: normalizedAffiliation,
      role: normalizedRole,
      menuPermissions: normalizedMenuPermissions,
      accountStatus: 'active',
      status: 'offline',
    });

    res.status(201).json({
      success: true,
      message:
        normalizedRole === 'medical'
          ? '복지사가 등록되었습니다.'
          : normalizedRole === 'admin'
            ? '관리자가 등록되었습니다.'
            : '관제요원이 등록되었습니다.',
      data: serializeControllerSummary(controller),
    });

    await deleteVerificationEntry('staff-phone', normalizedPhone);
  } catch (error) {
    console.error('관제요원 수동 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '운영자 수동 등록 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 어드민에서 관제요원/복지사의 연락처, 이메일, 권한, 소속을 수정합니다.
 * PATCH /api/controllers/:id
 */
router.patch('/:id', requireAuth, requireAdminOrSameController, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, role, affiliation, city, district, dong, menuPermissions, phoneVerificationToken } = req.body || {};
    const requesterRole = String(req.user?.role || '').trim();

    const controller = await Controller.findById(id);
    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '운영자 계정을 찾을 수 없습니다.',
      });
    }

    if (requesterRole !== 'admin' && typeof role !== 'undefined' && role !== controller.role) {
      return res.status(403).json({
        success: false,
        message: '본인 권한은 변경할 수 없습니다.',
      });
    }
    if (requesterRole !== 'admin' && typeof menuPermissions !== 'undefined') {
      return res.status(403).json({
        success: false,
        message: '메뉴 권한은 관리자만 변경할 수 있습니다.',
      });
    }

    const roleError = validateEditableControllerRole(role);
    if (roleError) {
      return res.status(400).json({
        success: false,
        message: roleError,
      });
    }

    const nextRole = role || controller.role;
    const normalizedMenuPermissions =
      nextRole === 'admin'
        ? (normalizeMenuPermissions(menuPermissions).length > 0
            ? normalizeMenuPermissions(menuPermissions)
            : controller.menuPermissions || ADMIN_MENU_PERMISSIONS)
        : [];
    const currentAffiliation = normalizeAffiliationInput(controller.affiliation);
    const normalizedAffiliation = normalizeAffiliationInput(affiliation, {
      city,
      district,
      dong,
    });
    const nextAffiliation = {
      city: normalizedAffiliation.city || controller.affiliation?.city || '',
      district: normalizedAffiliation.district || controller.affiliation?.district || '',
      dong: normalizedAffiliation.dong || controller.affiliation?.dong || '',
    };
    const affiliationError = validateStaffAffiliation(nextRole, nextAffiliation);

    if (affiliationError) {
      return res.status(400).json({
        success: false,
        message: affiliationError,
      });
    }

    const normalizedEmail = String(email || controller.email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phone || controller.phone || '');
    const currentPhone = normalizePhoneNumber(controller.phone || '');
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: '이메일은 필수입니다.',
      });
    }

    const existingByEmail = await Controller.findOne({
      _id: { $ne: id },
      email: normalizedEmail,
    }).select('_id').lean();

    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 이메일입니다.',
      });
    }

    if (
      requesterRole !== 'admin' &&
      normalizedPhone &&
      normalizedPhone !== currentPhone &&
      !(await hasVerifiedStaffPhoneToken(normalizedPhone, phoneVerificationToken))
    ) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 인증을 완료한 뒤 저장해주세요.',
      });
    }

    const affiliationChanged = !isSameAffiliation(currentAffiliation, nextAffiliation);
    if (requesterRole !== 'admin' && affiliationChanged) {
      if (controller.role !== 'medical') {
        return res.status(403).json({
          success: false,
          message: '소속 변경은 관리자만 처리할 수 있습니다.',
        });
      }
    }
    const sameAsPendingAffiliation =
      requesterRole !== 'admin' &&
      hasPendingAffiliationChange(controller.pendingAffiliationChange) &&
      isSameAffiliation(controller.pendingAffiliationChange, nextAffiliation);

    controller.email = normalizedEmail;
    controller.phone = String(phone || '').trim();
    controller.role = nextRole;
    controller.menuPermissions = normalizedMenuPermissions;

    if (requesterRole === 'admin') {
      controller.affiliation = nextAffiliation;
      controller.pendingAffiliationChange = undefined;
    } else if (affiliationChanged) {
      if (!sameAsPendingAffiliation) {
        controller.pendingAffiliationChange = {
          city: nextAffiliation.city,
          district: nextAffiliation.district,
          dong: nextAffiliation.dong,
          requestedAt: new Date(),
        };
      }
    }

    await controller.save();

    if (requesterRole !== 'admin' && normalizedPhone && normalizedPhone !== currentPhone) {
      await deleteVerificationEntry('staff-phone', normalizedPhone);
    }

    res.json({
      success: true,
      message:
        requesterRole !== 'admin' && affiliationChanged && !sameAsPendingAffiliation
          ? '소속 변경 요청이 관리자 승인 대기로 접수되었습니다.'
          : '운영자 정보가 수정되었습니다.',
      data: serializeControllerSummary(controller),
    });
  } catch (error) {
    console.error('운영자 정보 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '운영자 정보 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관제요원, 복지사 또는 관리자 계정을 삭제합니다.
 * DELETE /api/controllers/:id
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const controller = await Controller.findByIdAndDelete(id);

    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '운영자 계정을 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      message:
        controller.role === 'medical'
          ? '복지사 계정이 삭제되었습니다.'
          : controller.role === 'admin'
            ? '관리자 계정이 삭제되었습니다.'
            : '관제요원 계정이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('운영자 계정 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '운영자 계정 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관제사 로그인
 * POST /api/controllers/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    const controller = await Controller.findOne({ email });
    if (!controller) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const isMatch = await controller.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    if (controller.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: controller.accountStatus,
        message: resolveControllerApprovalMessage(controller.accountStatus),
      });
    }

    const { signControllerToken } = require('../services/jwtService');
    const token = signControllerToken(controller);

    controller.status = 'online';
    controller.lastActivity = new Date();
    await controller.save();

    res.json({
      success: true,
      message: '로그인 성공',
      token,
      controller: serializeControllerSummary(controller),
    });
  } catch (error) {
    console.error('관제사 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 현재 로그인한 관제사 기본 정보를 반환합니다.
 */
router.get('/me', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const controller = await getCurrentController(req);
    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.',
      });
    }

    return res.json({
      success: true,
      data: serializeControllerSummary(controller),
    });
  } catch (error) {
    console.error('현재 관제사 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '현재 관제사 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 승인 대기 중인 관제요원/복지담당자 가입 신청 목록을 조회합니다.
 */
router.get('/pending-approvals', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const pendingControllers = await Controller.find({ accountStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: pendingControllers,
    });
  } catch (error) {
    console.error('승인 대기 관제요원 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '승인 대기 계정 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 복지사 소속 변경 승인 대기 목록을 조회합니다.
 */
router.get('/pending-affiliation-approvals', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const pendingAffiliationControllers = await Controller.find({
      role: 'medical',
      accountStatus: 'active',
      'pendingAffiliationChange.requestedAt': { $ne: null },
    })
      .select('-password')
      .sort({ 'pendingAffiliationChange.requestedAt': -1 })
      .lean();

    res.json({
      success: true,
      data: pendingAffiliationControllers.map((controller) => ({
        ...serializeControllerSummary(controller),
        requestedAffiliation: normalizePendingAffiliationChange(controller.pendingAffiliationChange),
      })),
    });
  } catch (error) {
    console.error('복지사 소속 변경 승인 대기 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '복지사 소속 변경 승인 대기 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 회원앱 회원가입 단계에서 사용할 공개 복지사 소속 목록을 반환합니다.
 */
router.get('/public-medical-affiliations', async (req, res) => {
  try {
    const staffAccounts = await Controller.find({
      role: 'medical',
      accountStatus: 'active',
    })
      .select('name affiliation role accountStatus')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: staffAccounts,
    });
  } catch (error) {
    console.error('공개 복지사 소속 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '복지사 소속 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관제요원/복지사 전체 계정 목록을 조회합니다.
 */
router.get('/', requireAuth, requireRole(['admin', 'medical']), async (req, res) => {
  try {
    const staffAccounts = await Controller.find({ role: { $in: ['controller', 'medical'] } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: staffAccounts.map((staff) => ({
        ...staff,
        pendingAffiliationChange: hasPendingAffiliationChange(staff.pendingAffiliationChange)
          ? normalizePendingAffiliationChange(staff.pendingAffiliationChange)
          : null,
      })),
    });
  } catch (error) {
    console.error('관제요원/복지사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '관제요원/복지사 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관리자 전체 계정 목록을 조회합니다.
 */
router.get('/admins', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const adminAccounts = await Controller.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: adminAccounts,
    });
  } catch (error) {
    console.error('관리자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '관리자 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 관제요원/복지담당자 계정 상태를 변경합니다.
 */
router.patch('/:id/approval', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body || {};

    if (!['pending', 'active', 'rejected', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: '허용되지 않은 계정 상태입니다.',
      });
    }

    const controller = await Controller.findByIdAndUpdate(
      id,
      { accountStatus },
      { new: true },
    ).select('-password');

    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제요원을 찾을 수 없습니다.',
      });
    }

    res.json({
      success: true,
      message:
        accountStatus === 'active'
          ? '계정이 사용중 상태로 변경되었습니다.'
          : accountStatus === 'pending'
            ? '계정이 승인대기 상태로 변경되었습니다.'
            : '계정 상태가 변경되었습니다.',
      data: controller,
    });
  } catch (error) {
    console.error('관제요원 승인 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '승인 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 복지사 소속 변경 요청을 승인 또는 반려합니다.
 */
router.patch('/:id/affiliation-approval', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const decision = String(req.body?.decision || '').trim().toLowerCase();

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: '허용되지 않은 처리 유형입니다.',
      });
    }

    const controller = await Controller.findById(id);
    if (!controller || controller.role !== 'medical') {
      return res.status(404).json({
        success: false,
        message: '복지사 계정을 찾을 수 없습니다.',
      });
    }

    if (!hasPendingAffiliationChange(controller.pendingAffiliationChange)) {
      return res.status(400).json({
        success: false,
        message: '승인 대기 중인 소속 변경 요청이 없습니다.',
      });
    }

    if (decision === 'approved') {
      controller.affiliation = normalizeAffiliationInput(controller.pendingAffiliationChange);
    }
    controller.pendingAffiliationChange = undefined;
    await controller.save();

    return res.json({
      success: true,
      message:
        decision === 'approved'
          ? '복지사 소속 변경 요청이 승인되었습니다.'
          : '복지사 소속 변경 요청이 반려되었습니다.',
      data: serializeControllerSummary(controller),
    });
  } catch (error) {
    console.error('복지사 소속 변경 승인 처리 오류:', error);
    return res.status(500).json({
      success: false,
      message: '복지사 소속 변경 승인 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 배정된 회원 목록 조회
 * GET /api/controllers/me/users
 */
router.get('/me/users', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const controllerId = req.user?.sub || req.user?.userId;
    const controller = await Controller.findById(controllerId).populate('assignedUsers', 'name phone status hospitalMode');
    
    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      users: controller.assignedUsers || []
    });
  } catch (error) {
    console.error('배정 회원 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배정 회원 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 활성 응급 상황 목록 조회
 * GET /api/controllers/emergency-cases
 */
router.get('/emergency-cases', requireAuth, requireRole('controller'), cacheMiddleware(10), async (req, res) => {
  try {
    const controller = await getCurrentController(req);

    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.',
      });
    }

    const sanitizedCases = await loadScopedEmergencyCasesForStaff(controller, req.query);

    res.json({
      success: true,
      cases: sanitizedCases
    });
  } catch (error) {
    console.error('응급 상황 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 상황 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 최근 수집 여부를 기준으로 관제 대상 사용자와 최신 생체 데이터를 반환합니다.
 */
router.get('/monitored-users', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const controller = await getCurrentController(req);

    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.',
      });
    }

    const monitoredPayload = await loadScopedMonitoredUsersForStaff(controller, req.query?.windowMinutes);

    res.json({
      success: true,
      windowMinutes: monitoredPayload.windowMinutes,
      users: monitoredPayload.users,
    });
  } catch (error) {
    console.error('모니터링 사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '모니터링 사용자 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 복지사 전용 대시보드에서 소속 기준 활성 응급 케이스를 조회합니다.
 */
router.get('/medical/emergency-cases', requireAuth, requireRole('medical'), cacheMiddleware(10), async (req, res) => {
  try {
    const medicalStaff = await getCurrentController(req);

    if (!medicalStaff) {
      return res.status(404).json({
        success: false,
        message: '복지사를 찾을 수 없습니다.',
      });
    }

    const cases = await loadScopedEmergencyCasesForStaff(medicalStaff, req.query);
    return res.json({
      success: true,
      cases,
    });
  } catch (error) {
    console.error('복지사 응급 상황 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '복지사 응급 상황 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 복지사 전용 대시보드에서 소속 기준 최신 모니터링 회원 목록을 조회합니다.
 */
router.get('/medical/monitored-users', requireAuth, requireRole('medical'), async (req, res) => {
  try {
    const medicalStaff = await getCurrentController(req);

    if (!medicalStaff) {
      return res.status(404).json({
        success: false,
        message: '복지사를 찾을 수 없습니다.',
      });
    }

    const monitoredPayload = await loadScopedMonitoredUsersForStaff(medicalStaff, req.query?.windowMinutes);
    return res.json({
      success: true,
      windowMinutes: monitoredPayload.windowMinutes,
      users: monitoredPayload.users,
    });
  } catch (error) {
    console.error('복지사 모니터링 사용자 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '복지사 모니터링 사용자 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

const CURRENT_WATCH_STALE_THRESHOLD_MS = 45 * 1000;
const CURRENT_WATCH_REMOVED_GLITCH_WINDOW_MS = 5 * 1000;
const WEARABLE_LAST_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;

/**
 * Date/문자열 시각을 epoch ms로 안전하게 변환합니다.
 */
function toEpochMs(value) {
  const ms =
    typeof value === 'string' || value instanceof Date
      ? new Date(value).getTime()
      : 0;
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * 웨어러블 마지막 위치가 관제에 재사용 가능한 최신 좌표인지 검사합니다.
 * 너무 오래된 lastKnownLocation 은 현재 위치로 오인되므로 응답/보정 후보에서 제외합니다.
 */
function isFreshWearableLastLocation(location) {
  const updatedAtMs = toEpochMs(location?.updatedAt);
  if (!(updatedAtMs > 0)) {
    return false;
  }
  return Date.now() - updatedAtMs <= WEARABLE_LAST_LOCATION_MAX_AGE_MS;
}

/**
 * 최신 생체 문서에 위치가 비어 있으면 사용자 장비의 마지막 위치를 붙여 관제 소비 경로를 맞춥니다.
 */
function applyWearableLocationFallback(biometric, user) {
  if (!biometric) {
    return null;
  }

  const currentLocation =
    biometric.location && typeof biometric.location === 'object' ? biometric.location : null;
  const rawData =
    typeof biometric.rawData === 'object' && biometric.rawData
      ? biometric.rawData
      : {};
  const currentMeta =
    rawData.locationMeta && typeof rawData.locationMeta === 'object'
      ? rawData.locationMeta
      : {};
  const currentProvider =
    typeof currentMeta.provider === 'string' ? currentMeta.provider.trim().toLowerCase() : '';
  const currentSource =
    typeof currentMeta.source === 'string' ? currentMeta.source.trim().toLowerCase() : '';
  const currentIsApproxIp =
    currentSource === 'ip_position' ||
    currentProvider === 'ipwho.is' ||
    currentProvider === 'ipapi.co' ||
    currentProvider === 'ipinfo.io';
  const hasLocation =
    typeof currentLocation?.lat === 'number' &&
    typeof currentLocation?.lng === 'number' &&
    Number.isFinite(currentLocation.lat) &&
    Number.isFinite(currentLocation.lng);

  if (hasLocation && !currentIsApproxIp) {
    return biometric;
  }

  const wearableLastLocation =
    user?.wearableDevice?.lastKnownLocation && typeof user.wearableDevice.lastKnownLocation === 'object'
      ? user.wearableDevice.lastKnownLocation
      : null;
  const wearableProvider =
    typeof wearableLastLocation?.provider === 'string'
      ? wearableLastLocation.provider.trim().toLowerCase()
      : '';
  const wearableSource =
    typeof wearableLastLocation?.source === 'string'
      ? wearableLastLocation.source.trim().toLowerCase()
      : '';
  const wearableIsApproxIp =
    wearableSource === 'ip_position' ||
    wearableProvider === 'ipwho.is' ||
    wearableProvider === 'ipapi.co' ||
    wearableProvider === 'ipinfo.io';
  const hasWearableLastLocation =
    typeof wearableLastLocation?.lat === 'number' &&
    typeof wearableLastLocation?.lng === 'number' &&
    Number.isFinite(wearableLastLocation.lat) &&
    Number.isFinite(wearableLastLocation.lng) &&
    !wearableIsApproxIp &&
    isFreshWearableLastLocation(wearableLastLocation);

  if (!hasWearableLastLocation) {
    if (!currentIsApproxIp) {
      return biometric;
    }
    return {
      ...biometric,
      location: undefined,
      rawData: {
        ...rawData,
        location: undefined,
        locationMeta: undefined,
      },
    };
  }

  return {
    ...biometric,
    location: {
      lat: wearableLastLocation.lat,
      lng: wearableLastLocation.lng,
      accuracy:
        typeof wearableLastLocation.accuracyM === 'number' ? wearableLastLocation.accuracyM : undefined,
      timestamp:
        wearableLastLocation.updatedAt instanceof Date
          ? wearableLastLocation.updatedAt.toISOString()
          : wearableLastLocation.updatedAt,
    },
    rawData: {
      ...rawData,
      location: {
        lat: wearableLastLocation.lat,
        lng: wearableLastLocation.lng,
        accuracy:
          typeof wearableLastLocation.accuracyM === 'number' ? wearableLastLocation.accuracyM : undefined,
        timestamp:
          wearableLastLocation.updatedAt instanceof Date
            ? wearableLastLocation.updatedAt.toISOString()
            : wearableLastLocation.updatedAt,
      },
      locationMeta: {
        source:
          typeof wearableLastLocation.source === 'string' && wearableLastLocation.source.trim()
            ? wearableLastLocation.source.trim()
            : 'phone',
        provider:
          typeof wearableLastLocation.provider === 'string' && wearableLastLocation.provider.trim()
            ? wearableLastLocation.provider.trim()
            : 'last_known_location',
        accuracyM:
          typeof wearableLastLocation.accuracyM === 'number' ? wearableLastLocation.accuracyM : undefined,
        timestamp:
          wearableLastLocation.updatedAt instanceof Date
            ? wearableLastLocation.updatedAt.toISOString()
            : wearableLastLocation.updatedAt,
      },
    },
  };
}

/**
 * 응답용 사용자 객체에서 IP 대략 위치 lastKnownLocation 은 제거합니다.
 */
function sanitizeWearableDeviceForResponse(user) {
  const wearableDevice =
    user?.wearableDevice && typeof user.wearableDevice === 'object'
      ? { ...user.wearableDevice }
      : user?.wearableDevice;

  if (!wearableDevice || typeof wearableDevice !== 'object') {
    return wearableDevice;
  }

  const provider =
    typeof wearableDevice.lastKnownLocation?.provider === 'string'
      ? wearableDevice.lastKnownLocation.provider.trim().toLowerCase()
      : '';
  const source =
    typeof wearableDevice.lastKnownLocation?.source === 'string'
      ? wearableDevice.lastKnownLocation.source.trim().toLowerCase()
      : '';
  const isApproxIp =
    source === 'ip_position' ||
    provider === 'ipwho.is' ||
    provider === 'ipapi.co' ||
    provider === 'ipinfo.io';

  const lastKnownLat =
    typeof wearableDevice.lastKnownLocation?.lat === 'number'
      ? wearableDevice.lastKnownLocation.lat
      : Number.NaN;
  const lastKnownLng =
    typeof wearableDevice.lastKnownLocation?.lng === 'number'
      ? wearableDevice.lastKnownLocation.lng
      : Number.NaN;

  if (
    isApproxIp ||
    isBlockedControllerLocationPoint(lastKnownLat, lastKnownLng) ||
    !isFreshWearableLastLocation(wearableDevice.lastKnownLocation)
  ) {
    wearableDevice.lastKnownLocation = null;
  }

  return wearableDevice;
}

/**
 * 저장된 위치가 IP 기반 fallback뿐일 때 현재 관제 요청 IP로 다시 계산한 좌표를 응답에 덮어씁니다.
 */
function applyRequestIpLocationOverride(biometric, requestIpLocation) {
  if (!biometric || !requestIpLocation) {
    return biometric;
  }

  const rawData =
    typeof biometric.rawData === 'object' && biometric.rawData
      ? biometric.rawData
      : {};
  const currentMeta =
    rawData.locationMeta && typeof rawData.locationMeta === 'object'
      ? rawData.locationMeta
      : {};
  const currentProvider =
    typeof currentMeta.provider === 'string' ? currentMeta.provider.trim().toLowerCase() : '';
  const currentSource =
    typeof currentMeta.source === 'string' ? currentMeta.source.trim().toLowerCase() : '';
  const isIpFallbackLocation =
    currentSource === 'ip_position' ||
    currentProvider === 'ipwho.is' ||
    currentProvider === 'ipapi.co' ||
    currentProvider === 'ipinfo.io';

  const hasCurrentLocation =
    typeof biometric.location?.lat === 'number' &&
    typeof biometric.location?.lng === 'number' &&
    Number.isFinite(biometric.location.lat) &&
    Number.isFinite(biometric.location.lng);

  if (hasCurrentLocation && !isIpFallbackLocation) {
    return biometric;
  }

  return {
    ...biometric,
    location: {
      lat: requestIpLocation.lat,
      lng: requestIpLocation.lng,
      accuracy: requestIpLocation.accuracyM,
      timestamp: requestIpLocation.timestamp,
    },
    rawData: {
      ...rawData,
      location: {
        lat: requestIpLocation.lat,
        lng: requestIpLocation.lng,
        accuracy: requestIpLocation.accuracyM,
        timestamp: requestIpLocation.timestamp,
      },
      locationMeta: {
        ...currentMeta,
        source: 'ip_position',
        provider: requestIpLocation.provider,
        accuracyM: requestIpLocation.accuracyM,
        timestamp: requestIpLocation.timestamp,
      },
    },
  };
}

/**
 * 마지막 0값 탈착 패킷이 직전 정상 패킷을 덮은 경우 최근 정상 수집값을 복원합니다.
 */
async function resolvePreferredLatestBiometric(BiometricData, userId, latestBiometric) {
  if (!latestBiometric) {
    return null;
  }

  const rawData =
    typeof latestBiometric.rawData === 'object' && latestBiometric.rawData
      ? latestBiometric.rawData
      : {};
  const isWear = typeof rawData.isWear === 'boolean' ? rawData.isWear : undefined;
  const latestMs = toEpochMs(latestBiometric.collectedAt);

  if (isWear !== false || latestMs <= 0) {
    return latestBiometric;
  }

  const recentPositive = await BiometricData.findOne({
    userId,
    collectedAt: {
      $gte: new Date(latestMs - CURRENT_WATCH_REMOVED_GLITCH_WINDOW_MS),
      $lte: new Date(latestMs),
    },
    'rawData.isWear': true,
    heartRate: { $gt: 0 },
  })
    .sort({ collectedAt: -1 })
    .lean()
    .catch(() => null);

  if (!recentPositive) {
    return latestBiometric;
  }

  return {
    ...recentPositive,
    recentRecoveredAt: latestBiometric.collectedAt,
    rawData: {
      ...(typeof recentPositive.rawData === 'object' && recentPositive.rawData
        ? recentPositive.rawData
        : {}),
      recoveredFromTrailingRemove: true,
      trailingRemoveCollectedAt: latestBiometric.collectedAt,
    },
  };
}

/**
 * 공통 워치 API가 미착용 또는 stale 상태에서 마지막 생체 잔상을 노출하지 않도록 정리합니다.
 */
function sanitizeCurrentWatchBiometric(latestBiometric, user) {
  if (!latestBiometric) {
    return null;
  }

  const rawData =
    typeof latestBiometric.rawData === 'object' && latestBiometric.rawData
      ? latestBiometric.rawData
      : {};
  const isWear = typeof rawData.isWear === 'boolean' ? rawData.isWear : undefined;
  const collectedAtMs = toEpochMs(latestBiometric.collectedAt);
  const lastSyncAtMs = toEpochMs(user?.wearableDevice?.lastSyncAt);
  const connStatus = String(user?.wearableDevice?.connectionStatus || '').toLowerCase();
  const nowMs = Date.now();
  const isStale =
    (collectedAtMs > 0 && nowMs - collectedAtMs > CURRENT_WATCH_STALE_THRESHOLD_MS) ||
    (lastSyncAtMs > 0 && nowMs - lastSyncAtMs > CURRENT_WATCH_STALE_THRESHOLD_MS) ||
    (connStatus && connStatus !== 'connected');
  const treatAsRemoved = isWear === false || isStale;

  if (!treatAsRemoved) {
    return {
      ...latestBiometric,
      biometricId: latestBiometric._id,
    };
  }

  return {
    ...latestBiometric,
    biometricId: latestBiometric._id,
    heartRate: 0,
    spO2: 0,
    bodyTemperature: 0,
    steps: 0,
    stressLevel: 0,
    distance: 0,
    bloodPressure: {
      systolic: 0,
      diastolic: 0,
    },
    rawData: {
      ...rawData,
      isWear: false,
      distance: 0,
      bloodPressureSys: 0,
      bloodPressureDia: 0,
      staleBiometric: isStale,
    },
  };
}

/**
 * 관제에서 현재 가장 최근에 잡힌 워치 1건을 다른 앱에서도 공유할 수 있게 반환합니다.
 */
router.get('/current-watch', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const windowMinutesRaw = req.query?.windowMinutes;
    const windowMinutes = Math.min(
      60,
      Math.max(1, Number.isFinite(Number(windowMinutesRaw)) ? Number(windowMinutesRaw) : 10),
    );
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const BiometricData = require('../models/BiometricData');
    const controller = await getCurrentController(req);

    if (!controller) {
      return res.status(404).json({
        success: false,
        message: '관제사를 찾을 수 없습니다.',
      });
    }

    const user = await User.findOne({
      ...buildControllerScopedUserQuery(controller),
      'wearableDevice.deviceId': { $exists: true, $ne: null },
    })
      .select('name phone age birthDate bloodType gender wearableDevice emergencyContact accountStatus affiliation')
      .sort({ 'wearableDevice.lastSyncAt': -1 })
      .lean();

    if (!user || !matchesControllerAffiliation(controller.affiliation, user.affiliation)) {
      return res.json({
        success: true,
        windowMinutes,
        data: null,
      });
    }

    const latestBiometricSeed = await BiometricData.findOne({ userId: user._id })
      .sort({ collectedAt: -1 })
      .lean();
    const latestBiometricRecovered = await resolvePreferredLatestBiometric(
      BiometricData,
      user._id,
      latestBiometricSeed,
    );
      const latestBiometricWithFallback = applyWearableLocationFallback(latestBiometricRecovered, user);
      const latestBiometric = sanitizeBiometricForResponse(latestBiometricWithFallback);

    const currentWatch = {
      ...user,
      name: 'SKPLAY',
      wearableDevice: sanitizeWearableDeviceForResponse(user),
      isOnline: Boolean(user?.wearableDevice?.lastSyncAt && new Date(user.wearableDevice.lastSyncAt) >= since),
      latestBiometric: sanitizeCurrentWatchBiometric(latestBiometric, user),
    };

    res.json({
      success: true,
      windowMinutes,
      data: currentWatch,
    });
  } catch (error) {
    console.error('현재 관제 워치 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '현재 관제 워치 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 케이스의 생체 데이터 조회
 * GET /api/controllers/emergency-cases/:caseId/biometric
 */
router.get('/emergency-cases/:caseId/biometric', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const BiometricData = require('../models/BiometricData');
    
    const emergencyCase = await EmergencyCase.findById(caseId).populate('userId', '_id');
    if (!emergencyCase) {
      return res.status(404).json({
        success: false,
        message: '응급 케이스를 찾을 수 없습니다.'
      });
    }

    // 케이스 감지 시간 기준으로 생체 데이터 조회 (감지 시간 ±5분)
    const detectedTime = new Date(emergencyCase.detectedAt || emergencyCase.createdAt);
    const startTime = new Date(detectedTime.getTime() - 5 * 60 * 1000);
    const endTime = new Date(detectedTime.getTime() + 5 * 60 * 1000);

    // 최근 생체 데이터 (최대 50개)
    const biometricData = await BiometricData.find({
      userId: emergencyCase.userId._id,
      collectedAt: {
        $gte: startTime,
        $lte: endTime
      }
    })
      .sort({ collectedAt: -1 })
      .limit(50)
      .select('collectedAt heartRate stressLevel movementStatus')
      .lean();

    // 최신 생체 데이터
    const latestBiometric = await BiometricData.findOne({
      userId: emergencyCase.userId._id
    })
      .sort({ collectedAt: -1 })
      .select('heartRate stressLevel movementStatus collectedAt')
      .lean();

    res.json({
      success: true,
      biometric: latestBiometric,
      history: biometricData.reverse(), // 시간순 정렬
      baseline: emergencyCase.userId?.baselineBiometric
    });
  } catch (error) {
    console.error('생체 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '생체 데이터 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 수동 응급구조사 매칭
 * POST /api/controllers/emergency-cases/:caseId/match-paramedic
 */
router.post('/emergency-cases/:caseId/match-paramedic', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { paramedicId } = req.body;

    const ec = await EmergencyCase.findById(caseId);
    if (!ec) {
      return res.status(404).json({
        success: false,
        message: '응급 상황을 찾을 수 없습니다.'
      });
    }

    if (paramedicId) {
      // 특정 응급구조사 지정
      const Paramedic = require('../models/Paramedic');
      const paramedic = await Paramedic.findById(paramedicId);
      if (!paramedic) {
        return res.status(404).json({
          success: false,
          message: '응급구조사를 찾을 수 없습니다.'
        });
      }

      // 수동 지정도 자동 매칭과 같은 paramedic 구조를 써서 후속 화면/소켓 경로를 재사용합니다.
      ec.paramedic = {
        paramedicId,
        matchedAt: new Date(),
        status: 'pending'
      };
      ec.matchingType = 'manual';
      ec.status = 'matched';
      await ec.save();

      // 응급구조사에게 알림 추가
      await Paramedic.findByIdAndUpdate(paramedicId, {
        $push: {
          pendingCases: {
            caseId: ec._id,
            receivedAt: new Date(),
            distance: 0 // 수동 매칭이므로 거리 정보 없음
          }
        }
      });

      // Socket.IO 알림
      emitParamedicMatched(ec._id, paramedicId, ec);

      res.json({
        success: true,
        message: '응급구조사가 매칭되었습니다.',
        case: ec
      });
    } else {
      // 자동 매칭 재시도
      const result = await autoMatchParamedicForCase(caseId);
      if (result.matched) {
        res.json({
          success: true,
          message: '자동 매칭이 완료되었습니다.',
          result
        });
      } else {
        res.status(400).json({
          success: false,
          message: '매칭할 수 있는 응급구조사가 없습니다.',
          reason: result.reason
        });
      }
    }
  } catch (error) {
    console.error('수동 매칭 오류:', error);
    res.status(500).json({
      success: false,
      message: '매칭 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 수동 병원 매칭
 * POST /api/controllers/emergency-cases/:caseId/match-hospital
 */
router.post('/emergency-cases/:caseId/match-hospital', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { hospitalId } = req.body;

    const ec = await EmergencyCase.findById(caseId);
    if (!ec) {
      return res.status(404).json({
        success: false,
        message: '응급 상황을 찾을 수 없습니다.'
      });
    }

    if (hospitalId) {
      // 특정 병원 지정
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: '병원을 찾을 수 없습니다.'
        });
      }

      const estimatedMinutes = 30; // 기본값
      const estimatedArrival = new Date(Date.now() + estimatedMinutes * 60 * 1000);

      // 수동 병원 지정도 자동 매칭 결과와 같은 hospital/location 필드를 채워 후속 흐름을 맞춥니다.
      ec.hospital = {
        hospitalId,
        matchedAt: new Date(),
        estimatedArrivalTime: estimatedArrival,
        status: 'matched'
      };
      ec.locations.hospital = {
        lat: hospital.location.lat,
        lng: hospital.location.lng,
        address: hospital.location.address || ''
      };
      await ec.save();

      // Socket.IO 알림
      emitHospitalMatched(ec._id, hospitalId, ec);

      res.json({
        success: true,
        message: '병원이 매칭되었습니다.',
        case: ec
      });
    } else {
      // 자동 매칭 재시도
      const result = await autoMatchHospitalForCase(caseId);
      if (result.matched) {
        res.json({
          success: true,
          message: '자동 병원 매칭이 완료되었습니다.',
          result
        });
      } else {
        res.status(400).json({
          success: false,
          message: '매칭할 수 있는 병원이 없습니다.',
          reason: result.reason
        });
      }
    }
  } catch (error) {
    console.error('병원 매칭 오류:', error);
    res.status(500).json({
      success: false,
      message: '병원 매칭 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 사용 가능한 응급구조사 목록 조회
 * GET /api/controllers/paramedics/available
 */
router.get('/paramedics/available', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const paramedics = await Paramedic.find({
      status: { $in: ['available', 'off_duty'] }
    })
      .select('name phone email status currentLocation licenseNumber')
      .lean();

    res.json({
      success: true,
      paramedics
    });
  } catch (error) {
    console.error('응급구조사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급구조사 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 병원 목록 조회
 * GET /api/controllers/hospitals
 */
router.get('/hospitals', requireAuth, requireRole('controller'), async (req, res) => {
  try {
    const hospitals = await Hospital.find({})
      .select('name location emergencyRoom phone')
      .lean();

    res.json({
      success: true,
      hospitals
    });
  } catch (error) {
    console.error('병원 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '병원 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 관제사 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
