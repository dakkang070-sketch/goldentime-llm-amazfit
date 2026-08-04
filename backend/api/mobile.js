/**
 * 응급 사용자앱 전용 API
 * 웨어러블(워치) 기기 연동 및 실시간 데이터 처리
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const { signUserToken } = require('../services/jwtService');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { analyzeBiometricAndMaybeOpenCase } = require('../services/analyzerService');
const { buildEmergencyCaseBiometricSnapshot } = require('../services/emergencyCaseSnapshotService');
const { generateNonDiagnosticSummary } = require('../services/ollamaService');
const { emitEmergencyCaseCreated, emitCaseStatusUpdated, emitBiometricDataUpdated } = require('../services/socketService');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { sendSMS } = require('../services/notificationService');
const crypto = require('crypto');
const IP_LOCATION_CACHE_TTL_MS = 2 * 60 * 1000;
const IP_LOCATION_LOOKUP_TIMEOUT_MS = 2500;
const IP_LOCATION_CLUSTER_RADIUS_M = 15000;
const ipLocationCache = new Map();
const guardianProfilePhoneVerificationStore = new Map();

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
    provider.includes('browser_geolocation') ||
    provider.includes('fused') ||
    provider.includes('network')
  ) {
    if (typeof accuracyM === 'number') {
      if (accuracyM <= 120) return 'wifi_position';
      return 'cell_position';
    }
    return 'wifi_position';
  }

  return 'mobile_app';
}

/**
 * 케이스 저장용 위치 객체를 만들고, 좌표가 없으면 주소만 남깁니다.
 */
function buildCaseLocation(location, address) {
  const hasCoords =
    typeof location?.lat === 'number' &&
    typeof location?.lng === 'number' &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng);

  return hasCoords
    ? {
        lat: location.lat,
        lng: location.lng,
        address,
      }
    : {
        address,
      };
}

/**
 * 전화번호 비교 전에 숫자만 남겨 보호자 연락처 매칭 정확도를 높입니다.
 */
function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * 모바일 회원 프로필 저장에 사용할 이메일 값을 공통 규칙으로 정규화합니다.
 */
function normalizeMemberEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * 모바일 회원 프로필 저장에 사용할 휴대폰 번호를 숫자만 남긴 한국식 형식으로 정규화합니다.
 */
function normalizeMemberPhone(value) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '';
  if (digits.startsWith('82')) {
    const rest = digits.slice(2);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  return digits;
}

/**
 * 모바일 회원 휴대폰 번호가 비어 있지 않을 때만 형식을 검증합니다.
 */
function validateMemberPhone(value) {
  if (!value) return null;
  if (!/^01[0-9]{8,9}$/.test(value)) {
    return '올바른 전화번호 형식을 입력해주세요. (예: 01012345678)';
  }
  return null;
}

/**
 * 회원 문서에 저장할 보호자 정보를 문자열 필드만 남겨 정규화합니다.
 */
function normalizeEmergencyContactInput(contact) {
  return {
    name: String(contact?.name || '').trim(),
    relationship: String(contact?.relationship || '').trim(),
    phone: normalizeMemberPhone(contact?.phone || ''),
  };
}

/**
 * 회원 문서에 저장할 건강 메모 배열 필드를 문자열 배열 구조로 정규화합니다.
 */
function normalizeMedicalHistoryInput(medicalHistory = {}) {
  const normalizeStringList = (items, field) =>
    Array.isArray(items)
      ? items
          .map((item) => {
            if (typeof item === 'string') {
              const trimmed = item.trim();
              return trimmed ? { [field]: trimmed } : null;
            }
            if (item && typeof item === 'object') {
              const trimmed = String(item[field] || '').trim();
              return trimmed ? { [field]: trimmed } : null;
            }
            return null;
          })
          .filter(Boolean)
      : [];

  return {
    chronicDiseases: normalizeStringList(medicalHistory.chronicDiseases, 'disease'),
    medications: normalizeStringList(medicalHistory.medications, 'name'),
    allergies: normalizeStringList(medicalHistory.allergies, 'substance'),
  };
}

/**
 * 보호자앱 진입에 사용할 6자리 자체 인증코드를 생성합니다.
 */
function generateGuardianAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 다른 활성 인증코드와 겹치지 않는 6자리 보호자 인증코드를 발급합니다.
 */
async function generateUniqueGuardianAccessCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateGuardianAccessCode();
    const duplicated = await User.exists({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.code': code,
      'emergencySettings.guardianAccess.codeExpiresAt': { $gt: new Date() },
    });
    if (!duplicated) {
      return code;
    }
  }

  return generateGuardianAccessCode();
}

/**
 * 보호자 토큰으로 쓰기 요청이 들어오면 읽기 전용 제한을 적용합니다.
 */
function rejectGuardianWriteAccess(req, res) {
  if (req.user?.role === 'guardian') {
    res.status(403).json({
      success: false,
      message: '보호자 모바일은 조회 전용입니다.',
    });
    return true;
  }
  return false;
}

/**
 * 보호자 인증 코드 만료 여부를 검사합니다.
 */
function isExpiredAt(value) {
  const timestamp = new Date(value || 0).getTime();
  return !timestamp || timestamp <= Date.now();
}

/**
 * 보호자 정보 수정용 6자리 휴대폰 인증번호를 생성합니다.
 */
function generateGuardianProfilePhoneVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 보호자 정보 수정용 휴대폰 인증 완료 토큰을 생성합니다.
 */
function generateGuardianProfilePhoneVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * 보호자 정보 수정에서 전달된 인증 토큰이 해당 번호에 대해 유효한지 확인합니다.
 */
function hasVerifiedGuardianProfilePhoneToken(normalizedPhone, phoneVerificationToken) {
  const verificationEntry = guardianProfilePhoneVerificationStore.get(normalizedPhone);
  return Boolean(
    verificationEntry &&
      verificationEntry.verifiedToken === String(phoneVerificationToken || '') &&
      !isExpiredAt(verificationEntry.verifiedUntil),
  );
}

/**
 * 보호자 계정 응답에 공통으로 내려줄 회원 요약 정보를 구성합니다.
 */
function buildGuardianAuthUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    guardian: user.emergencyContact,
    wearableDevice: user.wearableDevice,
    status: user.status,
    accountStatus: user.accountStatus,
  };
}

/**
 * 보호자 계정 조회에 필요한 전화번호를 guardianAccess 우선으로 정규화합니다.
 */
function resolveGuardianVerifiedPhone(user) {
  return normalizePhoneDigits(
    user?.emergencySettings?.guardianAccess?.verifiedGuardianPhone || user?.emergencyContact?.phone,
  );
}

/**
 * 보호자 계정 이메일을 앞 2자리만 남기고 마스킹합니다.
 */
function maskGuardianEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [localPart = '', domain = ''] = normalizedEmail.split('@');
  if (!localPart || !domain) {
    return '';
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}
/**
 * 모바일 회원 계정 승인 상태에 맞는 로그인 차단 메시지를 반환합니다.
 */
function resolveMobileApprovalMessage(accountStatus) {
  if (accountStatus === 'pending') return '어드민 승인 대기 중입니다.';
  if (accountStatus === 'rejected') return '가입 신청이 반려되었습니다. 관리자에게 문의해주세요.';
  if (accountStatus === 'suspended') return '이용이 정지된 계정입니다.';
  if (accountStatus === 'withdrawn') return '해지된 계정입니다.';
  return '로그인할 수 없는 계정 상태입니다.';
}

/**
 * 모바일 회원가입 요청의 지역 소속 입력을 정규화합니다.
 */
function normalizeMemberAffiliationInput(rawAffiliation = {}, fallback = {}) {
  return {
    city: String(rawAffiliation.city || fallback.city || '').trim(),
    district: String(rawAffiliation.district || fallback.district || '').trim(),
    dong: String(rawAffiliation.dong || fallback.dong || '').trim(),
    welfareName: String(rawAffiliation.welfareName || fallback.welfareName || '').trim(),
  };
}

/**
 * 모바일 회원은 시/구/동과 담당 복지사명을 모두 입력하도록 검증합니다.
 */
function validateMemberAffiliation(affiliation) {
  if (!affiliation.city || !affiliation.district || !affiliation.dong || !affiliation.welfareName) {
    return '회원은 시/도, 구, 동, 복지사명을 모두 입력해야 합니다.';
  }

  return null;
}

/**
 * 회원 프로필 저장에 사용할 성별 값을 male/female 기준으로 정규화합니다.
 */
function normalizeMemberGender(value, fallback = 'male') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['female', '여성', '여', 'f'].includes(normalized)) {
    return 'female';
  }
  if (['male', '남성', '남', 'm'].includes(normalized)) {
    return 'male';
  }
  return fallback;
}

/**
 * 생년월일로부터 만 나이를 계산해 회원 프로필 검증에 사용합니다.
 */
function calculateMemberAgeFromBirthDate(value) {
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * 회원 프로필의 보호자 목록을 최대 3명까지 저장 가능한 구조로 정규화합니다.
 */
function normalizeEmergencyContactsInput(contacts = []) {
  return Array.isArray(contacts)
    ? contacts
        .slice(0, 3)
        .map((contact, index) => ({
          ...normalizeEmergencyContactInput(contact),
          priority: index + 1,
        }))
        .filter((contact) => contact.name || contact.relationship || contact.phone)
    : [];
}

/**
 * 워치 등록 비교 전에 MAC/BLE 기기 식별자를 동일한 표기로 정규화합니다.
 */
function normalizeWearableDeviceId(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const noSpace = raw.replace(/\s+/g, '');
  const withColons = noSpace.includes('-') ? noSpace.replace(/-/g, ':') : noSpace;
  if (/^[0-9A-F]{12}$/.test(withColons)) {
    return withColons.match(/.{1,2}/g).join(':');
  }
  return withColons;
}

/**
 * 회원 현재값과 승인 대기값 비교를 위해 날짜를 안정적인 ISO 문자열로 맞춥니다.
 */
function toComparableIsoDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * 승인 대기 중인 회원 정보수정 요청을 앱 응답용 구조로 직렬화합니다.
 */
function serializePendingProfileChange(rawPendingProfileChange) {
  const requestedAt = rawPendingProfileChange?.requestedAt
    ? new Date(rawPendingProfileChange.requestedAt)
    : null;
  if (!requestedAt || Number.isNaN(requestedAt.getTime())) {
    return null;
  }

  return {
    name: String(rawPendingProfileChange?.name || '').trim(),
    email: normalizeMemberEmail(rawPendingProfileChange?.email || ''),
    phone: normalizeMemberPhone(rawPendingProfileChange?.phone || ''),
    birthDate: rawPendingProfileChange?.birthDate || null,
    age: Number(rawPendingProfileChange?.age || 0) || null,
    gender: normalizeMemberGender(rawPendingProfileChange?.gender || '', 'male'),
    height: Number(rawPendingProfileChange?.height || 0) || null,
    weight: Number(rawPendingProfileChange?.weight || 0) || null,
    bloodType: String(rawPendingProfileChange?.bloodType || '').trim(),
    medicalHistory: normalizeMedicalHistoryInput(rawPendingProfileChange?.medicalHistory),
    emergencyContact: normalizeEmergencyContactInput(rawPendingProfileChange?.emergencyContact),
    emergencyContacts: normalizeEmergencyContactsInput(rawPendingProfileChange?.emergencyContacts),
    affiliation: normalizeMemberAffiliationInput(rawPendingProfileChange?.affiliation),
    requestedAt,
  };
}

/**
 * 모바일 회원앱에서 공통으로 쓰는 사용자 응답 구조를 한 곳에서 맞춥니다.
 */
function serializeMobileUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    birthDate: user.birthDate,
    age: user.age,
    gender: user.gender,
    height: user.height,
    weight: user.weight,
    bloodType: user.bloodType,
    medicalHistory: user.medicalHistory,
    medicalMemo: toDeviceProfileMedicalMemo(user.medicalHistory),
    emergencyContact: user.emergencyContact,
    emergencySettings: user.emergencySettings,
    wearableDevice: user.wearableDevice,
    baselineBiometric: user.baselineBiometric,
    assignedController: user.assignedController,
    affiliation: user.affiliation,
    consents: user.consents,
    accountStatus: user.accountStatus,
    status: user.status,
    lastActivity: user.lastActivity,
    pendingProfileChange: serializePendingProfileChange(user.pendingProfileChange),
  };
}

/**
 * 프록시/클라우드플레어 환경을 포함해 요청의 실제 클라이언트 IP를 추출합니다.
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
 * 내부망/루프백 IP처럼 외부 위치 서비스로 해석할 수 없는 주소를 걸러냅니다.
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
 * 좌표가 비어 있을 때 요청 IP 기준의 대략 위치를 조회해 마지막 fallback 위치로 사용합니다.
 */
async function resolveApproxLocationFromIp(ip) {
  const normalizedIp = String(ip || '').trim().replace(/^::ffff:/, '');
  if (!normalizedIp || isPrivateOrLoopbackIp(normalizedIp)) {
    return null;
  }

  const cached = ipLocationCache.get(normalizedIp);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const candidates = (
    await Promise.all([
      fetchIpLocationCandidate(
        normalizedIp,
        'ipwho.is',
        `https://ipwho.is/${encodeURIComponent(normalizedIp)}`,
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
        normalizedIp,
        'ipapi.co',
        `https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`,
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
        normalizedIp,
        'ipinfo.io',
        `https://ipinfo.io/${encodeURIComponent(normalizedIp)}/json`,
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
    timeMs: Date.now(),
  };
  ipLocationCache.set(normalizedIp, {
    expiresAt: Date.now() + IP_LOCATION_CACHE_TTL_MS,
    value,
  });
  return value;
}
/**
 * 응급 사용자 모바일앱 인증, 웨어러블 연동, 상태 조회 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();

/**
 * 회원 모바일 보호 라우트에서 active 상태 사용자만 통과시킵니다.
 */
async function requireActiveEmergencyUser(req, res, next) {
  try {
    if (req.user?.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: '회원 계정만 접근할 수 있습니다.',
      });
    }

    const userQuery = User.findById(req.user?.sub);
    const user =
      userQuery && typeof userQuery.select === 'function'
        ? await userQuery.select('accountStatus isEmergencyAppUser')
        : await userQuery;
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: '어드민 승인 후 이용할 수 있습니다.',
      });
    }

    return next();
  } catch (error) {
    logger.error('회원 계정 상태 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '계정 상태 확인 중 오류가 발생했습니다.',
    });
  }
}

/**
 * 보호자앱 읽기 전용 라우트에서는 guardian 계정도 연결된 회원 데이터 조회를 허용합니다.
 */
async function requireReadableEmergencyUserOrGuardian(req, res, next) {
  try {
    if (!['user', 'guardian'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: '회원 또는 보호자 계정만 접근할 수 있습니다.',
      });
    }

    const userQuery = User.findById(req.user?.sub);
    const user =
      userQuery && typeof userQuery.select === 'function'
        ? await userQuery.select('accountStatus isEmergencyAppUser')
        : await userQuery;
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: '어드민 승인 후 이용할 수 있습니다.',
      });
    }

    return next();
  } catch (error) {
    logger.error('회원/보호자 계정 상태 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '계정 상태 확인 중 오류가 발생했습니다.',
    });
  }
}

/**
 * @swagger
 * /api/mobile/signup:
 *   post:
 *     summary: 응급 사용자 회원가입
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - password
 *               - birthDate
 *               - age
 *               - height
 *               - weight
 *               - bloodType
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               age:
 *                 type: number
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               bloodType:
 *                 type: string
 *                 enum: [A, B, AB, O]
 *               emergencyContacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     relationship:
 *                       type: string
 *               medicalHistory:
 *                 type: object
 *                 properties:
 *                   medications:
 *                     type: array
 *                   allergies:
 *                     type: array
 *                   chronicDiseases:
 *                     type: array
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 응급 사용자 앱 전용 회원을 생성하고 로그인 토큰을 발급합니다.
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      height,
      weight,
      bloodType,
      affiliation = {},
      city,
      district,
      dong,
      welfareName,
      emergencyContacts = [],
      medicalHistory = {},
      consents = {}
    } = req.body;

    // 필수 필드 검증
    const requiredFields = [
      { field: 'name', label: '이름' },
      { field: 'email', label: '이메일' },
      { field: 'password', label: '비밀번호' },
      { field: 'birthDate', label: '생년월일' },
      { field: 'age', label: '나이' },
      { field: 'height', label: '신장' },
      { field: 'weight', label: '체중' },
      { field: 'bloodType', label: '혈액형' }
    ];
    
    const missingFields = requiredFields.filter(({ field }) => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `필수 정보가 누락되었습니다: ${missingFields.map(({ label }) => label).join(', ')}`,
        missingFields: missingFields.map(({ field }) => field)
      });
    }
    
    // 데이터 형식 검증
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '나이는 1세에서 120세 사이여야 합니다.'
      });
    }
    
    if (height < 50 || height > 250) {
      return res.status(400).json({
        success: false,
        message: '신장은 50cm에서 250cm 사이여야 합니다.'
      });
    }
    
    if (weight < 10 || weight > 300) {
      return res.status(400).json({
        success: false,
        message: '체중은 10kg에서 300kg 사이여야 합니다.'
      });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    const normalizedAffiliation = normalizeMemberAffiliationInput(affiliation, { city, district, dong, welfareName });
    const affiliationError = validateMemberAffiliation(normalizedAffiliation);
    if (affiliationError) {
      return res.status(400).json({
        success: false,
        message: affiliationError
      });
    }
    
    // 전화번호 형식 검증 (한국식) - 입력된 경우에만 검증
    const phoneRegex = /^01[0-9]{8,9}$/;
    let cleanPhone;
    
    if (phone && phone.trim()) {
      cleanPhone = phone.replace(/[^0-9]/g, '');
      
      if (cleanPhone.length > 0) {
        if (cleanPhone.startsWith('82')) {
          const rest = cleanPhone.slice(2);
          cleanPhone = rest.startsWith('0') ? rest : `0${rest}`;
        }
        if (!phoneRegex.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: '올바른 전화번호 형식을 입력해주세요. (예: 01012345678)'
          });
        }
      } else {
        cleanPhone = undefined;
      }
    }
    
    // 비밀번호 길이 검증 (제거됨)
    /*
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 6자 이상이어야 합니다.'
      });
    }
    */

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 가입된 이메일입니다.'
      });
    }

    // 전화번호 중복 확인
    if (cleanPhone) {
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: '이미 가입된 전화번호입니다.'
        });
      }
    }

    // 생년월일로 나이 자동 계산 (만약 나이가 없거나 0이면)
    let calculatedAge = age;
    if (!calculatedAge || calculatedAge === 0) {
      const birthDateObj = new Date(birthDate);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
      const monthDiff = today.getMonth() - birthDateObj.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        calculatedAge--;
      }
    }

    // 새 사용자 생성
    const primaryEmergencyContact = Array.isArray(emergencyContacts) && emergencyContacts.length > 0
      ? emergencyContacts[0]
      : null;

    const user = new User({
      name,
      phone: cleanPhone || undefined,
      email,
      password,
      birthDate: new Date(birthDate),
      age: calculatedAge,
      height,
      weight,
      bloodType,
      affiliation: normalizedAffiliation,
      medicalHistory,
      emergencyContact: primaryEmergencyContact
        ? {
            name: primaryEmergencyContact.name,
            relationship: primaryEmergencyContact.relationship,
            phone: primaryEmergencyContact.phone,
          }
        : undefined,
      emergencySettings: {
        emergencyContacts: emergencyContacts.slice(0, 3), // 최대 3개
        autoReportEnabled: true,
        alertSensitivity: 2
      },
      consents: {
        emergencyAutoReport: consents.emergencyAutoReport !== false,
        personalInfoCollection: consents.personalInfoCollection !== false,
        preciseLocation: consents.preciseLocation !== false,
        emergencyAlgorithm: consents.emergencyAlgorithm !== false
      },
      isEmergencyAppUser: true,
      status: 'active',
      accountStatus: 'pending',
    });

    await user.save();

    logger.info(`응급 사용자 회원가입 완료: ${email}`);

    res.status(201).json({
      success: true,
      message: '회원가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          affiliation: user.affiliation,
          accountStatus: user.accountStatus,
        }
      }
    });
  } catch (error) {
    logger.error('응급 사용자 회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/login:
 *   post:
 *     summary: 응급 사용자 로그인
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
/**
 * 응급 사용자 계정을 확인하고 모바일 앱용 토큰을 발급합니다.
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 이메일 정규화 (공백 제거 및 소문자 변환)
    email = email.trim().toLowerCase();

    // 사용자 찾기 (응급앱 사용자만)
    const user = await User.findOne({ 
      email, 
      isEmergencyAppUser: true,
      status: 'active' 
    });

    if (!user) {
      // Debug logging
      const debugUser = await User.findOne({ email });
      if (debugUser) {
        logger.warn(`Login failed for ${email}: User exists but conditions mismatch`, {
          isEmergencyAppUser: debugUser.isEmergencyAppUser,
          status: debugUser.status
        });
      } else {
        logger.warn(`Login failed for ${email}: User not found`);
      }

      return res.status(401).json({
        success: false,
        message: '등록되지 않은 사용자입니다.'
      });
    }

    // 비밀번호 확인
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.'
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: resolveMobileApprovalMessage(user.accountStatus),
      });
    }

    // 마지막 활동 업데이트
    user.lastActivity = new Date();
    await user.save();

    // JWT 토큰 생성
    const token = signUserToken(user);

    logger.info(`응급 사용자 로그인: ${email}`);

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        user: serializeMobileUser(user),
        token
      }
    });
  } catch (error) {
    logger.error('응급 사용자 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 보호자 인증코드를 확인한 뒤 보호자 전용 계정을 생성하고 로그인 토큰을 발급합니다.
 */
router.post('/guardian/signup', async (req, res) => {
  try {
    const accessCode = String(req.body?.accessCode || '').trim();
    const guardianEmail = String(req.body?.guardianEmail || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!accessCode || !guardianEmail || !password) {
      return res.status(400).json({
        success: false,
        message: '인증코드, 보호자 이메일, 비밀번호를 모두 입력해주세요.',
      });
    }

    if (!validator.isEmail(guardianEmail)) {
      return res.status(400).json({
        success: false,
        message: '보호자 이메일 형식을 확인해주세요.',
      });
    }

    const matchedUsers = await User.find({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.code': accessCode,
      'emergencySettings.guardianAccess.codeExpiresAt': { $gt: new Date() },
    }).limit(2);

    if (matchedUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 인증코드입니다.',
      });
    }

    if (matchedUsers.length > 1) {
      return res.status(409).json({
        success: false,
        message: '인증코드가 중복되었습니다. 새 인증코드를 다시 발급해주세요.',
      });
    }

    const user = matchedUsers[0];

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: resolveMobileApprovalMessage(user.accountStatus),
      });
    }

    const guardianAccess = user?.emergencySettings?.guardianAccess || {};
    if (
      String(guardianAccess?.code || '').trim() !== accessCode ||
      isExpiredAt(guardianAccess?.codeExpiresAt)
    ) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 인증코드입니다.',
      });
    }

    const duplicatedGuardian = await User.findOne({
      _id: { $ne: user._id },
      'emergencySettings.guardianAccess.guardianEmail': guardianEmail,
      isEmergencyAppUser: true,
    }).select('_id');
    if (duplicatedGuardian) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 보호자 이메일입니다.',
      });
    }

    const guardianPasswordHash = await bcrypt.hash(password, 10);
    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...guardianAccess,
        guardianEmail,
        guardianPasswordHash,
        guardianRegisteredAt: guardianAccess?.guardianRegisteredAt || new Date(),
        guardianLastLoginAt: new Date(),
        code: '',
        codeExpiresAt: null,
        verifiedAt: new Date(),
        verifiedGuardianPhone: normalizePhoneDigits(
          guardianAccess?.verifiedGuardianPhone || user?.emergencyContact?.phone,
        ),
      },
    };
    await user.save();

    const { signGuardianToken } = require('../services/jwtService');
    const token = signGuardianToken(user);

    return res.json({
      success: true,
      message: '보호자 회원가입이 완료되었습니다.',
      data: {
        token,
        user: buildGuardianAuthUserPayload(user),
      },
    });
  } catch (error) {
    logger.error('보호자 회원가입 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 회원가입 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 계정 이메일/비밀번호로 읽기 전용 로그인을 수행합니다.
 */
router.post('/guardian/account-login', async (req, res) => {
  try {
    const guardianEmail = String(req.body?.guardianEmail || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!guardianEmail || !password) {
      return res.status(400).json({
        success: false,
        message: '보호자 이메일과 비밀번호를 입력해주세요.',
      });
    }

    const user = await User.findOne({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': guardianEmail,
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '등록된 보호자 계정을 찾을 수 없습니다.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: resolveMobileApprovalMessage(user.accountStatus),
      });
    }

    const guardianPasswordHash = String(user?.emergencySettings?.guardianAccess?.guardianPasswordHash || '');
    if (!guardianPasswordHash) {
      return res.status(401).json({
        success: false,
        message: '먼저 보호자 인증코드로 회원가입을 완료해주세요.',
      });
    }

    const matched = await bcrypt.compare(password, guardianPasswordHash);
    if (!matched) {
      return res.status(401).json({
        success: false,
        message: '보호자 비밀번호가 일치하지 않습니다.',
      });
    }

    const { signGuardianToken } = require('../services/jwtService');
    const token = signGuardianToken(user);

    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...(user?.emergencySettings?.guardianAccess || {}),
        guardianLastLoginAt: new Date(),
      },
    };
    await user.save();

    return res.json({
      success: true,
      message: '보호자 로그인이 완료되었습니다.',
      data: {
        token,
        user: buildGuardianAuthUserPayload(user),
      },
    });
  } catch (error) {
    logger.error('보호자 계정 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 로그인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 회원가입 시 이메일 중복 여부를 guardianAccess 기준으로 확인합니다.
 */
router.post('/guardian/check-email', async (req, res) => {
  try {
    const guardianEmail = String(req.body?.guardianEmail || req.body?.email || '').trim().toLowerCase();

    if (!guardianEmail || !validator.isEmail(guardianEmail)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: '올바른 이메일 형식이 아닙니다.',
      });
    }

    const duplicatedGuardian = await User.findOne({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': guardianEmail,
    })
      .select('_id')
      .lean();

    return res.json({
      success: true,
      available: !duplicatedGuardian,
      message: duplicatedGuardian ? '이미 사용 중인 보호자 이메일입니다.' : '사용 가능한 이메일입니다.',
    });
  } catch (error) {
    logger.error('보호자 이메일 중복 확인 오류:', error);
    return res.status(500).json({
      success: false,
      available: false,
      message: '보호자 이메일 확인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 이름과 전화번호로 가입된 보호자 이메일을 찾아 마스킹해 반환합니다.
 */
router.post('/guardian/find-email', authLimiter, async (req, res) => {
  try {
    const guardianName = String(req.body?.name || '').trim();
    const guardianPhone = normalizePhoneDigits(req.body?.phone);

    if (!guardianName || !guardianPhone) {
      return res.status(400).json({ success: false, message: '이름과 전화번호를 입력해주세요.' });
    }

    const candidates = await User.find({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': { $exists: true, $ne: '' },
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': guardianPhone },
        { 'emergencyContact.phone': { $exists: true, $ne: null } },
      ],
    }).select('emergencyContact emergencySettings.guardianAccess.guardianEmail emergencySettings.guardianAccess.verifiedGuardianPhone');

    const user = candidates.find((entry) => {
      const resolvedGuardianPhone = normalizePhoneDigits(
        entry?.emergencySettings?.guardianAccess?.verifiedGuardianPhone || entry?.emergencyContact?.phone,
      );
      return (
        String(entry?.emergencyContact?.name || '').trim() === guardianName &&
        resolvedGuardianPhone === guardianPhone
      );
    });

    const guardianEmail = String(user?.emergencySettings?.guardianAccess?.guardianEmail || '').trim().toLowerCase();
    if (!user || !guardianEmail) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 보호자 계정을 찾을 수 없습니다.' });
    }

    return res.json({ success: true, email: maskGuardianEmail(guardianEmail) });
  } catch (error) {
    logger.error('보호자 이메일 찾기 오류:', error);
    return res.status(500).json({ success: false, message: '보호자 이메일 찾기 중 오류가 발생했습니다.' });
  }
});

/**
 * 보호자 비밀번호 재설정을 위한 SMS 인증코드를 발송합니다.
 */
router.post('/guardian/reset-password/send-code', authLimiter, async (req, res) => {
  try {
    const guardianEmail = String(req.body?.guardianEmail || req.body?.email || '').trim().toLowerCase();
    const guardianPhone = normalizePhoneDigits(req.body?.guardianPhone || req.body?.phone);

    if (!guardianEmail || !guardianPhone) {
      return res.status(400).json({ success: false, message: '이메일과 전화번호를 모두 입력해주세요.' });
    }

    const user = await User.findOne({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': guardianEmail,
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': guardianPhone },
        { 'emergencyContact.phone': { $regex: guardianPhone } },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 보호자 계정을 찾을 수 없습니다.' });
    }

    const verifiedGuardianPhone = resolveGuardianVerifiedPhone(user);
    if (!verifiedGuardianPhone) {
      return res.status(400).json({ success: false, message: '보호자 인증 전화번호가 등록되어 있지 않습니다.' });
    }

    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...(user?.emergencySettings?.guardianAccess || {}),
        guardianPasswordResetCode: resetCode,
        guardianPasswordResetCodeExpiresAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    };
    await user.save();

    const maskedPhone = verifiedGuardianPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    const message = `[골든타임] 보호자 비밀번호 재설정 인증코드: ${resetCode}\n3분 안에 입력해주세요.`;
    await sendSMS(verifiedGuardianPhone, message);

    logger.info(`보호자 비밀번호 재설정 SMS 발송: ${guardianEmail}`);
    return res.json({ success: true, message: `인증코드가 ${maskedPhone}로 발송되었습니다.`, maskedPhone });
  } catch (error) {
    logger.error('보호자 비밀번호 재설정 SMS 발송 오류:', error);
    return res.status(500).json({ success: false, message: '인증코드 발송 중 오류가 발생했습니다.' });
  }
});

/**
 * 보호자 SMS 인증코드를 확인한 뒤 새 비밀번호로 재설정합니다.
 */
router.post('/guardian/reset-password', authLimiter, async (req, res) => {
  try {
    const guardianEmail = String(req.body?.guardianEmail || req.body?.email || '').trim().toLowerCase();
    const guardianPhone = normalizePhoneDigits(req.body?.guardianPhone || req.body?.phone);
    const code = String(req.body?.code || '').replace(/[^\d]/g, '');
    const newPassword = String(req.body?.newPassword || '');

    if (!guardianEmail || !guardianPhone || !code || !newPassword) {
      return res.status(400).json({ success: false, message: '필수 정보를 모두 입력해주세요.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const user = await User.findOne({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': guardianEmail,
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': guardianPhone },
        { 'emergencyContact.phone': { $regex: guardianPhone } },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 보호자 계정을 찾을 수 없습니다.' });
    }

    const guardianAccess = user?.emergencySettings?.guardianAccess || {};
    if (!guardianAccess.guardianPasswordResetCode || guardianAccess.guardianPasswordResetCode !== code) {
      return res.status(400).json({ success: false, message: '인증코드가 일치하지 않습니다.' });
    }
    if (
      !guardianAccess.guardianPasswordResetCodeExpiresAt ||
      guardianAccess.guardianPasswordResetCodeExpiresAt < new Date()
    ) {
      return res.status(400).json({ success: false, message: '인증코드가 만료되었습니다. 다시 요청해주세요.' });
    }

    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...guardianAccess,
        guardianPasswordHash: await bcrypt.hash(newPassword, 10),
        guardianPasswordResetCode: null,
        guardianPasswordResetCodeExpiresAt: null,
        guardianLastLoginAt: guardianAccess?.guardianLastLoginAt || new Date(),
      },
    };
    await user.save();

    logger.info(`보호자 비밀번호 재설정 완료: ${guardianEmail}`);
    return res.json({ success: true, message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' });
  } catch (error) {
    logger.error('보호자 비밀번호 재설정 오류:', error);
    return res.status(500).json({ success: false, message: '보호자 비밀번호 재설정 중 오류가 발생했습니다.' });
  }
});

/**
 * 등록된 보호자 연락처와 서버 발급 인증코드가 일치할 때 읽기 전용 모바일 접근 토큰을 발급합니다.
 */
router.post('/guardian/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const guardianPhone = normalizePhoneDigits(req.body?.guardianPhone);
    const accessCode = String(req.body?.accessCode || '').trim();

    if (!email || !guardianPhone || !accessCode) {
      return res.status(400).json({
        success: false,
        message: '회원 이메일, 보호자 연락처, 인증코드를 모두 입력해주세요.',
      });
    }

    const user = await User.findOne({ email, isEmergencyAppUser: true }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '회원 정보를 찾을 수 없습니다.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: resolveMobileApprovalMessage(user.accountStatus),
      });
    }

    const primaryGuardianPhone = normalizePhoneDigits(user.emergencyContact?.phone);
    const additionalGuardianPhones = Array.isArray(user.emergencySettings?.emergencyContacts)
      ? user.emergencySettings.emergencyContacts.map((contact) => normalizePhoneDigits(contact?.phone))
      : [];
    const matched =
      guardianPhone.length > 0 &&
      [primaryGuardianPhone, ...additionalGuardianPhones].filter(Boolean).includes(guardianPhone);

    if (!matched) {
      return res.status(401).json({
        success: false,
        message: '등록된 보호자 연락처와 일치하지 않습니다.',
      });
    }

    const guardianAccess = user?.emergencySettings?.guardianAccess || {};
    if (
      String(guardianAccess?.code || '').trim() !== accessCode ||
      isExpiredAt(guardianAccess?.codeExpiresAt) ||
      normalizePhoneDigits(guardianAccess?.verifiedGuardianPhone || guardianPhone) !== guardianPhone
    ) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 인증코드입니다.',
      });
    }

    const { signGuardianToken } = require('../services/jwtService');
    const token = signGuardianToken(user);

    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...guardianAccess,
        code: '',
        codeIssuedAt: guardianAccess?.codeIssuedAt || new Date(),
        codeExpiresAt: null,
        verifiedAt: new Date(),
        verifiedGuardianPhone: guardianPhone,
      },
    };
    await user.save();

    return res.json({
      success: true,
      message: '보호자 읽기 전용 로그인이 완료되었습니다.',
      data: {
        token,
        user: buildGuardianAuthUserPayload(user),
      },
    });
  } catch (error) {
    logger.error('보호자 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 로그인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 회원앱에서 현재 등록된 보호자용 자체 인증코드를 발급합니다.
 */
router.post('/device-profile/guardian-access-code', async (req, res) => {
  try {
    const rawDeviceKey = String(req.body?.mac || req.body?.deviceId || '').trim();
    let user = await findOrCreateEmergencyAppUserByMac(rawDeviceKey);
    if (!user && rawDeviceKey) {
      const escapedDeviceKey = rawDeviceKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await User.findOne({
        isEmergencyAppUser: true,
        'wearableDevice.deviceId': { $regex: `^${escapedDeviceKey}$`, $options: 'i' },
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    const guardianPhone = normalizePhoneDigits(user?.emergencyContact?.phone);
    if (!guardianPhone) {
      return res.status(400).json({
        success: false,
        message: '먼저 보호자 연락처를 저장해주세요.',
      });
    }

    const code = await generateUniqueGuardianAccessCode();
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...(user?.emergencySettings?.guardianAccess || {}),
        code,
        codeIssuedAt: issuedAt,
        codeExpiresAt: expiresAt,
        verifiedAt: null,
        verifiedGuardianPhone: guardianPhone,
      },
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: '보호자 인증코드가 발급되었습니다.',
      data: {
        code,
        expiresAt,
        guardianPhone: user?.emergencyContact?.phone || '',
        guardianName: user?.emergencyContact?.name || '',
      },
    });
  } catch (error) {
    logger.error('보호자 인증코드 발급 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증코드 발급 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 정보 수정에서 새 휴대폰 번호로 인증코드를 발송합니다.
 */
router.post('/guardian/profile/phone-verification/request', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'guardian') {
      return res.status(403).json({
        success: false,
        message: '보호자 계정만 요청할 수 있습니다.',
      });
    }

    const normalizedPhone = normalizeMemberPhone(req.body?.phone);
    const phoneError = validateMemberPhone(normalizedPhone);
    if (phoneError) {
      return res.status(400).json({
        success: false,
        message: phoneError,
      });
    }

    const ownerCandidates = await User.find({
      _id: { $ne: req.user.sub },
      isEmergencyAppUser: true,
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': normalizedPhone },
        { 'emergencyContact.phone': { $exists: true, $ne: null } },
      ],
    }).select('emergencyContact emergencySettings.guardianAccess.verifiedGuardianPhone');
    const duplicatedOwner = ownerCandidates.find(
      (entry) => resolveGuardianVerifiedPhone(entry) === normalizedPhone,
    );
    if (duplicatedOwner) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 전화번호입니다.',
      });
    }

    const code = generateGuardianProfilePhoneVerificationCode();
    guardianProfilePhoneVerificationStore.set(normalizedPhone, {
      code,
      expiresAt: Date.now() + 3 * 60 * 1000,
      verifiedToken: '',
      verifiedUntil: 0,
      userId: String(req.user.sub || ''),
    });

    await sendSMS(normalizedPhone, `[골든타임] 보호자 정보 수정 인증번호는 [${code}] 입니다.`);

    return res.json({
      success: true,
      message: '인증번호를 발송했습니다.',
    });
  } catch (error) {
    logger.error('보호자 정보수정 휴대폰 인증번호 발송 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증번호 발송 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 정보 수정에서 새 휴대폰 번호의 인증코드를 확인합니다.
 */
router.post('/guardian/profile/phone-verification/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'guardian') {
      return res.status(403).json({
        success: false,
        message: '보호자 계정만 요청할 수 있습니다.',
      });
    }

    const normalizedPhone = normalizeMemberPhone(req.body?.phone);
    const inputCode = String(req.body?.code || '').trim();
    const verificationEntry = guardianProfilePhoneVerificationStore.get(normalizedPhone);

    if (
      !verificationEntry ||
      verificationEntry.userId !== String(req.user.sub || '') ||
      isExpiredAt(verificationEntry.expiresAt)
    ) {
      guardianProfilePhoneVerificationStore.delete(normalizedPhone);
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

    const verificationToken = generateGuardianProfilePhoneVerificationToken();
    guardianProfilePhoneVerificationStore.set(normalizedPhone, {
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
    logger.error('보호자 정보수정 휴대폰 인증 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴대폰 인증 확인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 계정이 자신의 보호자 연락처를 수정합니다.
 */
router.put('/guardian/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'guardian') {
      return res.status(403).json({
        success: false,
        message: '보호자 계정만 수정할 수 있습니다.',
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const nextName = String(req.body?.name || '').trim();
    const nextRelationship = String(req.body?.relationship || '').trim();
    const nextPhone = normalizeMemberPhone(req.body?.phone);
    const currentPhone = normalizeMemberPhone(user?.emergencyContact?.phone);
    const phoneVerificationToken = String(req.body?.phoneVerificationToken || '');

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: '보호자 이름을 입력해주세요.',
      });
    }
    if (!nextRelationship) {
      return res.status(400).json({
        success: false,
        message: '관계를 입력해주세요.',
      });
    }

    const phoneError = validateMemberPhone(nextPhone);
    if (phoneError) {
      return res.status(400).json({
        success: false,
        message: phoneError,
      });
    }

    if (
      nextPhone &&
      nextPhone !== currentPhone &&
      !hasVerifiedGuardianProfilePhoneToken(nextPhone, phoneVerificationToken)
    ) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 인증을 완료한 뒤 저장해주세요.',
      });
    }

    user.emergencyContact = {
      ...(user.emergencyContact || {}),
      name: nextName,
      relationship: nextRelationship,
      phone: nextPhone,
    };
    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {
        ...(user?.emergencySettings?.guardianAccess || {}),
        verifiedGuardianPhone: nextPhone,
      },
    };
    await user.save();

    if (nextPhone && nextPhone !== currentPhone) {
      guardianProfilePhoneVerificationStore.delete(nextPhone);
    }

    return res.json({
      success: true,
      message: '보호자 정보가 수정되었습니다.',
      data: {
        guardian: user.emergencyContact,
      },
    });
  } catch (error) {
    logger.error('보호자 정보 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 정보 수정 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 보호자 계정이 현재 연결된 보호자 정보를 해지합니다.
 */
router.delete('/guardian/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'guardian') {
      return res.status(403).json({
        success: false,
        message: '보호자 계정만 해지할 수 있습니다.',
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    user.emergencyContact = {
      ...(user.emergencyContact || {}),
      name: '',
      relationship: '',
      phone: '',
    };
    user.emergencySettings = {
      ...(user.emergencySettings || {}),
      guardianAccess: {},
    };
    await user.save();

    return res.json({
      success: true,
      message: '보호자 연결이 해지되었습니다.',
    });
  } catch (error) {
    logger.error('보호자 연결 해지 오류:', error);
    return res.status(500).json({
      success: false,
      message: '보호자 연결 해지 중 오류가 발생했습니다.',
    });
  }
});

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *       401:
 *         description: 인증 필요
 */
/**
 * 로그인한 응급 사용자의 프로필과 연결 정보를 조회합니다.
 */
router.get(
  '/profile',
  authenticateToken,
  requireReadableEmergencyUserOrGuardian,
  cacheMiddleware({
    ttlSeconds: 30,
    keyBuilder: async (req) => `cache:/api/mobile/profile:${req.user?.role || 'user'}:${req.user?.sub || 'anonymous'}`,
  }),
  async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
      .select('-password')
      .populate('assignedController', 'name phone');

    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // #region debug-point D:kim-taeyun-guardian-profile
    (()=>{if(user?.name!=='김태윤')return;const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='kim-taeyun-realtime';try{const e=fs.readFileSync('.dbg/kim-taeyun-realtime.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'D',location:'backend/api/mobile.js:689',msg:'[DEBUG] 김태윤 guardian/mobile profile response',data:{userId:String(user._id),name:user.name,role:req.user?.role||null,deviceId:user?.wearableDevice?.deviceId||null,lastSyncAt:user?.wearableDevice?.lastSyncAt||null,connectionStatus:user?.wearableDevice?.connectionStatus||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    res.json({
      success: true,
      data: {
        user: serializeMobileUser(user)
      }
    });
  } catch (error) {
    logger.error('사용자 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/profile:
 *   put:
 *     summary: 사용자 프로필 수정
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               emergencyContacts:
 *                 type: array
 *               medicalHistory:
 *                 type: object
 *               emergencySettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 응급 사용자 프로필에서 허용된 항목만 수정합니다.
 */
router.put('/profile', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const user = await User.findById(req.user.sub);

    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const nextName = req.body?.name !== undefined ? String(req.body.name || '').trim() : user.name;
    const nextEmail =
      req.body?.email !== undefined ? normalizeMemberEmail(req.body.email) : normalizeMemberEmail(user.email);
    const nextPhone =
      req.body?.phone !== undefined ? normalizeMemberPhone(req.body.phone) : normalizeMemberPhone(user.phone);
    const nextEmergencyContact =
      req.body?.emergencyContact !== undefined
        ? normalizeEmergencyContactInput(req.body.emergencyContact)
        : normalizeEmergencyContactInput(user.emergencyContact);
    const nextMedicalHistory =
      req.body?.medicalHistory !== undefined
        ? normalizeMedicalHistoryInput(req.body.medicalHistory)
        : normalizeMedicalHistoryInput(user.medicalHistory);
    const nextBirthDate =
      req.body?.birthDate !== undefined ? new Date(req.body.birthDate) : new Date(user.birthDate);
    const nextGender =
      req.body?.gender !== undefined
        ? normalizeMemberGender(req.body.gender, normalizeMemberGender(user.gender, 'male'))
        : normalizeMemberGender(user.gender, 'male');
    const nextHeight =
      req.body?.height !== undefined ? Number(req.body.height) : Number(user.height || 0);
    const nextWeight =
      req.body?.weight !== undefined ? Number(req.body.weight) : Number(user.weight || 0);
    const nextBloodType =
      req.body?.bloodType !== undefined ? String(req.body.bloodType || '').trim() : String(user.bloodType || '').trim();
    const nextAffiliation =
      req.body?.affiliation !== undefined ||
      req.body?.city !== undefined ||
      req.body?.district !== undefined ||
      req.body?.dong !== undefined ||
      req.body?.welfareName !== undefined
        ? normalizeMemberAffiliationInput(req.body.affiliation, req.body)
        : normalizeMemberAffiliationInput(user.affiliation);
    const nextEmergencyContacts =
      req.body?.emergencyContacts !== undefined
        ? normalizeEmergencyContactsInput(req.body.emergencyContacts)
        : normalizeEmergencyContactsInput(user.emergencySettings?.emergencyContacts);
    const nextAge =
      req.body?.age !== undefined && Number(req.body.age)
        ? Number(req.body.age)
        : calculateMemberAgeFromBirthDate(nextBirthDate);
    const normalizedPendingProfileChange = serializePendingProfileChange(user.pendingProfileChange);

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: '이름을 입력해주세요.',
      });
    }

    if (!nextEmail || !validator.isEmail(nextEmail)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일 형식을 입력해주세요.',
      });
    }

    if (Number.isNaN(nextBirthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '올바른 생년월일을 입력해주세요.',
      });
    }

    if (!nextAge || nextAge < 1 || nextAge > 120) {
      return res.status(400).json({
        success: false,
        message: '나이는 1세에서 120세 사이여야 합니다.',
      });
    }

    if (!nextHeight || nextHeight < 50 || nextHeight > 250) {
      return res.status(400).json({
        success: false,
        message: '신장은 50cm에서 250cm 사이여야 합니다.',
      });
    }

    if (!nextWeight || nextWeight < 10 || nextWeight > 300) {
      return res.status(400).json({
        success: false,
        message: '체중은 10kg에서 300kg 사이여야 합니다.',
      });
    }

    if (!['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(nextBloodType)) {
      return res.status(400).json({
        success: false,
        message: '올바른 혈액형을 선택해주세요.',
      });
    }

    const phoneError = validateMemberPhone(nextPhone);
    if (phoneError) {
      return res.status(400).json({
        success: false,
        message: phoneError,
      });
    }

    if (nextEmergencyContact.phone) {
      const guardianPhoneError = validateMemberPhone(nextEmergencyContact.phone);
      if (guardianPhoneError) {
        return res.status(400).json({
          success: false,
          message: '보호자 연락처 형식을 확인해주세요.',
        });
      }
    }

    const affiliationError = validateMemberAffiliation(nextAffiliation);
    if (affiliationError) {
      return res.status(400).json({
        success: false,
        message: affiliationError,
      });
    }

    const emailOwner = await User.findOne({
      _id: { $ne: user._id },
      email: nextEmail,
    }).select('_id');
    if (emailOwner) {
      return res.status(409).json({
        success: false,
        message: '이미 가입된 이메일입니다.',
      });
    }

    if (nextPhone) {
      const phoneOwner = await User.findOne({
        _id: { $ne: user._id },
        phone: nextPhone,
      }).select('_id');
      if (phoneOwner) {
        return res.status(409).json({
          success: false,
          message: '이미 가입된 전화번호입니다.',
        });
      }
    }

    const currentComparableProfile = {
      name: String(user.name || '').trim(),
      email: normalizeMemberEmail(user.email || ''),
      phone: normalizeMemberPhone(user.phone || ''),
      birthDate: toComparableIsoDate(user.birthDate),
      age: Number(user.age || 0),
      gender: normalizeMemberGender(user.gender, 'male'),
      height: Number(user.height || 0),
      weight: Number(user.weight || 0),
      bloodType: String(user.bloodType || '').trim(),
      medicalHistory: normalizeMedicalHistoryInput(user.medicalHistory),
      emergencyContact: normalizeEmergencyContactInput(user.emergencyContact),
      emergencyContacts: normalizeEmergencyContactsInput(user.emergencySettings?.emergencyContacts),
      affiliation: normalizeMemberAffiliationInput(user.affiliation),
    };
    const requestedComparableProfile = {
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      birthDate: toComparableIsoDate(nextBirthDate),
      age: nextAge,
      gender: nextGender,
      height: nextHeight,
      weight: nextWeight,
      bloodType: nextBloodType,
      medicalHistory: nextMedicalHistory,
      emergencyContact:
        nextEmergencyContact.name || nextEmergencyContact.relationship || nextEmergencyContact.phone
          ? nextEmergencyContact
          : normalizeEmergencyContactInput(nextEmergencyContacts[0]),
      emergencyContacts: nextEmergencyContacts,
      affiliation: nextAffiliation,
    };

    if (JSON.stringify(currentComparableProfile) === JSON.stringify(requestedComparableProfile)) {
      return res.status(400).json({
        success: false,
        message: '변경된 내용이 없습니다.',
      });
    }

    const pendingComparableProfile = normalizedPendingProfileChange
      ? {
          name: normalizedPendingProfileChange.name,
          email: normalizedPendingProfileChange.email,
          phone: normalizedPendingProfileChange.phone,
          birthDate: toComparableIsoDate(normalizedPendingProfileChange.birthDate),
          age: normalizedPendingProfileChange.age,
          gender: normalizeMemberGender(normalizedPendingProfileChange.gender, 'male'),
          height: normalizedPendingProfileChange.height,
          weight: normalizedPendingProfileChange.weight,
          bloodType: normalizedPendingProfileChange.bloodType,
          medicalHistory: normalizeMedicalHistoryInput(normalizedPendingProfileChange.medicalHistory),
          emergencyContact: normalizeEmergencyContactInput(normalizedPendingProfileChange.emergencyContact),
          emergencyContacts: normalizeEmergencyContactsInput(normalizedPendingProfileChange.emergencyContacts),
          affiliation: normalizeMemberAffiliationInput(normalizedPendingProfileChange.affiliation),
        }
      : null;
    if (
      pendingComparableProfile &&
      JSON.stringify(pendingComparableProfile) === JSON.stringify(requestedComparableProfile)
    ) {
      return res.json({
        success: true,
        message: '이미 동일한 회원 정보 수정 요청이 승인 대기 중입니다.',
        data: {
          user: serializeMobileUser(user),
        },
      });
    }

    user.pendingProfileChange = {
      name: nextName,
      email: nextEmail,
      phone: nextPhone || undefined,
      birthDate: nextBirthDate,
      age: nextAge,
      gender: nextGender,
      height: nextHeight,
      weight: nextWeight,
      bloodType: nextBloodType,
      medicalHistory: nextMedicalHistory,
      emergencyContact:
        requestedComparableProfile.emergencyContact.name ||
        requestedComparableProfile.emergencyContact.relationship ||
        requestedComparableProfile.emergencyContact.phone
          ? requestedComparableProfile.emergencyContact
          : undefined,
      emergencyContacts: nextEmergencyContacts,
      affiliation: nextAffiliation,
      requestedAt: new Date(),
    };

    await user.save();

    invalidateCache(`^cache:/api/mobile/profile:[^:]+:${user._id}$`);
    invalidateCache('^cache:/api/users');

    logger.info(`사용자 프로필 수정 요청 접수: ${user.email}`);

    res.json({
      success: true,
      message: '회원 정보 수정 요청이 관리자 승인 대기로 접수되었습니다.',
      data: {
        user: serializeMobileUser(user)
      }
    });
  } catch (error) {
    logger.error('사용자 프로필 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 로그인한 회원이 비밀번호를 확인한 뒤 계정을 해지 상태로 전환합니다.
 */
router.delete('/profile', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const password = String(req.body?.password || '');
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '회원탈퇴를 위해 비밀번호를 입력해주세요.',
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.',
      });
    }

    user.accountStatus = 'withdrawn';
    user.status = 'inactive';
    user.lastActivity = new Date();
    if (user.wearableDevice) {
      user.wearableDevice.connectionStatus = 'disconnected';
    }

    await user.save();

    invalidateCache(`^cache:/api/mobile/profile:[^:]+:${user._id}$`);
    invalidateCache('^cache:/api/users');

    logger.info(`응급 사용자 회원탈퇴 처리: ${user.email}`);

    res.json({
      success: true,
      message: '회원탈퇴가 완료되었습니다.',
    });
  } catch (error) {
    logger.error('사용자 회원탈퇴 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원탈퇴 처리 중 오류가 발생했습니다.',
    });
  }
});

/**
 * @swagger
 * /api/mobile/wearable/connect:
 *   post:
 *     summary: 웨어러블(워치) 기기 연결
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - deviceType
 *             properties:
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [watch, band]
 *               firmwareVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: 기기 연결 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 사용자 계정에 웨어러블 기기 연결 정보를 저장합니다.
 */
router.post('/wearable/connect', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const { deviceId, deviceName, deviceType, firmwareVersion } = req.body;

    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        message: '기기 정보를 입력해주세요.'
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    /**
     * 동일 워치가 다른 문서에 먼저 붙어 있으면 현재 가입 계정으로 소유를 이동합니다.
     */
    const normalizedDeviceId = normalizeWearableDeviceId(deviceId);
    const registeredDeviceId = normalizeWearableDeviceId(user.wearableDevice?.deviceId);

    if (registeredDeviceId && normalizedDeviceId && registeredDeviceId !== normalizedDeviceId) {
      return res.status(409).json({
        success: false,
        message: '현재 회원 계정에는 기존에 등록된 워치만 연결할 수 있습니다.',
      });
    }

    if (normalizedDeviceId) {
      const previousOwner = await User.findOne({
        _id: { $ne: user._id },
        'wearableDevice.deviceId': normalizedDeviceId,
      });

      if (previousOwner) {
        return res.status(409).json({
          success: false,
          message: '이미 다른 회원에게 등록된 워치입니다.',
        });
      }
    }

    // 웨어러블(워치) 기기 정보 업데이트
    user.wearableDevice = {
      deviceId: normalizedDeviceId || deviceId,
      deviceName,
      deviceType,
      firmwareVersion: firmwareVersion || 'unknown',
      connectionStatus: 'connected',
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };

    await user.save();

    logger.info(`웨어러블 기기 연결: ${user.email} - ${deviceName}`);

    res.json({
      success: true,
      message: '웨어러블 기기가 연결되었습니다.',
      data: {
        wearableDevice: user.wearableDevice
      }
    });
  } catch (error) {
    logger.error('웨어러블 기기 연결 오류:', error);
    res.status(500).json({
      success: false,
      message: '기기 연결 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/wearable/disconnect:
 *   post:
 *     summary: 웨어러블(워치) 기기 연결 해제
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 기기 연결 해제 성공
 */
/**
 * 사용자 계정에서 웨어러블 기기 연결 정보를 제거합니다.
 */
router.post('/wearable/disconnect', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (!user.wearableDevice || user.wearableDevice.connectionStatus === 'disconnected') {
      return res.status(400).json({
        success: false,
        message: '연결된 기기가 없습니다.'
      });
    }

    // 기기 연결 정보 삭제 (완전 해제)
    user.wearableDevice = undefined;
    await user.save();

    logger.info(`웨어러블 기기 연결 해제 및 등록 삭제: ${user.email}`);

    res.json({
      success: true,
      message: '웨어러블 기기 연결이 해제되고 등록이 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('웨어러블 기기 연결 해제 오류:', error);
    res.status(500).json({
      success: false,
      message: '기기 연결 해제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/biometric:
 *   post:
 *     summary: 실시간 생체 데이터 저장 (웨어러블/워치)
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - heartRate
 *               - bloodPressureSys
 *               - bloodPressureDia
 *               - spO2
 *               - temperature
 *             properties:
 *               heartRate:
 *                 type: number
 *               bloodPressureSys:
 *                 type: number
 *               bloodPressureDia:
 *                 type: number
 *               spO2:
 *                 type: number
 *               temperature:
 *                 type: number
 *               steps:
 *                 type: number
 *               sleep:
 *                 type: number
 *               stress:
 *                 type: number
 *               respiratoryRate:
 *                 type: number
 *               hrv:
 *                 type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 데이터 저장 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 실시간 생체 데이터를 저장하고 필요 시 응급 상황을 자동 감지합니다.
 */
router.post('/biometric', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const {
      heartRate,
      bloodPressureSys,
      bloodPressureDia,
      spO2,
      temperature,
      steps = 0,
      sleep = 0,
      stress = 0,
      respiratoryRate = 16,
      hrv = 50,
      bloodSugar,
      calories,
      location,
      timestamp = new Date().toISOString()
    } = req.body;

    // 필수 필드 검증
    if (heartRate === undefined || bloodPressureSys === undefined || 
        bloodPressureDia === undefined || spO2 === undefined || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: '필수 생체 데이터를 입력해주세요.'
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 웨어러블(워치) 기기 동기화 시간 업데이트
    if (user.wearableDevice) {
      user.wearableDevice.lastSyncAt = new Date();
      await user.save();
    }

    // 생체 데이터 저장
    const biometricData = new BiometricData({
      userId: req.user.sub,
      collectedAt: new Date(timestamp),
      heartRate,
      bloodPressure: {
        systolic: bloodPressureSys,
        diastolic: bloodPressureDia
      },
      spO2,
      bodyTemperature: temperature,
      steps,
      bloodGlucose: bloodSugar,
      calories,
      sleepStatus: sleep > 0 ? 'light_sleep' : 'awake',
      stressLevel: stress,
      respiratoryRate,
      location:
        location && typeof location === 'object'
          ? location
          : undefined,
      rawData: req.body // 원본 데이터 저장
    });

    await biometricData.save();
    invalidateCache(`^cache:/api/mobile/biometric/recent:[^:]+:${req.user.sub}:`);

    // 워치 탈착(Watch Removed) 응급 케이스 자동 해제는 “착용 확인(isWear=true)”가 있을 때만 처리
    try {
      const isWear = req.body?.isWear;
      const hrNum = typeof heartRate === 'number' ? heartRate : 0;
      const spo2Num = typeof spO2 === 'number' ? spO2 : 0;
      const looksRecovered = hrNum > 0 || spo2Num > 0;
      if (isWear === true && looksRecovered) {
        const activeWatchRemoved = await EmergencyCase.findOne({
          userId: req.user.sub,
          status: { $in: ['detected', 'matched', 'in_progress', 'transporting'] },
          detectedAnomalies: { $elemMatch: { description: { $regex: '워치\\s*탈착\\s*감지', $options: 'i' } } },
        }).sort({ createdAt: -1 });

        if (activeWatchRemoved) {
          activeWatchRemoved.status = 'cancelled';
          activeWatchRemoved.cancelledAt = new Date(timestamp);
          activeWatchRemoved.cancelledReason = 'watch_worn_again';
          await activeWatchRemoved.save();
          invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${req.user.sub}:`);
          emitCaseStatusUpdated(String(activeWatchRemoved._id), 'cancelled', { userId: String(req.user.sub) });
        }
      }
    } catch {}

    // 응급 상황 자동 감지
    let emergencyLevel = 1;
    const anomalies = [];

    // 심박수 이상 감지
    if (heartRate < 40 || heartRate > 150) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 이상: ${heartRate} bpm`,
        severity: heartRate < 40 ? 'critical' : 'high'
      });
    } else if (heartRate > 120) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 증가: ${heartRate} bpm`,
        severity: 'medium'
      });
    }

    // 산소포화도 이상 감지
    if (spO2 < 90) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'other',
        description: `산소포화도 위험: ${spO2}%`,
        severity: 'critical'
      });
    } else if (spO2 < 95) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'other',
        description: `산소포화도 저하: ${spO2}%`,
        severity: 'medium'
      });
    }

    // 혈압 이상 감지
    if (bloodPressureSys > 180 || bloodPressureDia > 110) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'other',
        description: `혈압 위험: ${bloodPressureSys}/${bloodPressureDia} mmHg`,
        severity: 'critical'
      });
    }

    // 체온 이상 감지
    if (temperature < 35 || temperature > 39) {
      emergencyLevel = Math.max(emergencyLevel, 3);
      anomalies.push({
        type: 'other',
        description: `체온 이상: ${temperature}°C`,
        severity: 'high'
      });
    }

    // 응급 상황 자동 생성 (레벨 3 이상)
    if (emergencyLevel >= 3) {
      // 최근 5분 내 동일한 응급 상황이 있는지 확인
      const recentEmergency = await EmergencyCase.findOne({
        userId: req.user.sub,
        status: { $in: ['detected', 'matched', 'in_progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (!recentEmergency) {
        // AI 분석 수행
        const aiAnalysis = await generateNonDiagnosticSummary({
          heartRate,
          bloodPressure: { systolic: bloodPressureSys, diastolic: bloodPressureDia },
          spO2,
          temperature,
          stressLevel: stress
        });

        // 응급 케이스 생성
        const emergencyCase = new EmergencyCase({
          userId: req.user.sub,
          emergencyLevel,
          detectedAnomalies: anomalies,
          llmAnalysis: {
            analysisText: aiAnalysis,
            confidence: 0.85,
            analyzedAt: new Date(),
            model: 'llama3.1'
          },
          biometricSnapshot: buildEmergencyCaseBiometricSnapshot({
            source: 'biometric_doc',
            biometric: biometricData
          }),
          locations: {
            detectedAt: buildCaseLocation(location, '현재 위치'),
            current: {
              ...buildCaseLocation(location, '현재 위치'),
              updatedAt: new Date()
            }
          },
          status: 'detected',
          detectedAt: new Date(timestamp)
        });

        await emergencyCase.save();
        invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${req.user.sub}:`);

        // 자동 매칭 시작
        autoMatchParamedicForCase(emergencyCase._id);

        logger.warn(`응급 상황 자동 감지: 사용자 ${req.user.sub} - 레벨 ${emergencyLevel}`);
      }
    }

    logger.info(`생체 데이터 저장: 사용자 ${req.user.sub} - HR:${heartRate} BP:${bloodPressureSys}/${bloodPressureDia} SpO2:${spO2}`);

    res.status(201).json({
      success: true,
      message: '생체 데이터가 저장되었습니다.',
      data: {
        biometricData: {
          id: biometricData._id,
          heartRate,
          bloodPressure: { systolic: bloodPressureSys, diastolic: bloodPressureDia },
          spO2,
          temperature,
          emergencyLevel,
          hasAnomaly: anomalies.length > 0
        }
      }
    });
  } catch (error) {
    logger.error('생체 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 저장 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/emergency:
 *   post:
 *     summary: 응급 상황 수동 신고
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyLevel:
 *                 type: number
 *                 enum: [1, 2, 3, 4, 5]
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: 응급 신고 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 사용자가 직접 응급 상황을 신고해 케이스를 생성합니다.
 */
router.post('/emergency', authenticateToken, requireActiveEmergencyUser, async (req, res) => {
  try {
    if (rejectGuardianWriteAccess(req, res)) {
      return;
    }

    const { emergencyLevel = 3, description, location } = req.body;

    const user = await User.findById(req.user.sub);
    if (!user || !user.isEmergencyAppUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 최근 1분 내 동일한 응급 신고가 있는지 확인
    const recentEmergency = await EmergencyCase.findOne({
      userId: req.user.sub,
      status: { $in: ['detected', 'matched', 'in_progress'] },
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) }
    });

    if (recentEmergency) {
      return res.status(400).json({
        success: false,
        message: '이미 처리 중인 응급 상황이 있습니다.'
      });
    }

    // 응급 케이스 생성
    const emergencyCase = new EmergencyCase({
      userId: req.user.sub,
      emergencyLevel,
      detectedAnomalies: [{
        type: 'other',
        description: description || '사용자 수동 응급 신고',
        severity: emergencyLevel >= 4 ? 'critical' : emergencyLevel >= 3 ? 'high' : 'medium'
      }],
      locations: {
        detectedAt: buildCaseLocation(location, '신고 위치'),
        current: {
          ...buildCaseLocation(location, '현재 위치'),
          updatedAt: new Date()
        }
      },
      biometricSnapshot: buildEmergencyCaseBiometricSnapshot({
        source: 'manual_payload',
        biometric: {
          collectedAt: new Date(),
          location,
          analysis: {
            emergencyLevel
          }
        }
      }),
      status: 'detected',
      detectedAt: new Date(),
      matchingType: 'manual'
    });

    await emergencyCase.save();
    invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${req.user.sub}:`);

    // 자동 매칭 시작
    autoMatchParamedicForCase(emergencyCase._id);

    logger.warn(`응급 상황 수동 신고: 사용자 ${req.user.sub} - 레벨 ${emergencyLevel}`);

    res.status(201).json({
      success: true,
      message: '응급 상황이 신고되었습니다.',
      data: {
        emergencyCase: {
          id: emergencyCase._id,
          emergencyLevel: emergencyCase.emergencyLevel,
          status: emergencyCase.status,
          detectedAt: emergencyCase.detectedAt
        }
      }
    });
  } catch (error) {
    logger.error('응급 상황 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 신고 중 오류가 발생했습니다.'
    });
  }
});

/**
 * MAC 주소 기반으로 응급 앱 사용자를 찾고 필요 시 자동 생성합니다.
 */
async function findOrCreateEmergencyAppUserByMac(mac) {
  const normalized = normalizeWearableDeviceId(mac);
  if (!normalized) return null;
  if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(normalized)) return null;
  if (normalized === 'AA:BB:CC:DD:EE:FF') return null;

  const existing = await User.findOne({ 'wearableDevice.deviceId': normalized });
  if (existing) return existing;

  // 과거 디바이스 자동계정은 phone/email에 device_<machex>만 남고 wearableDevice.deviceId가 비어 있을 수 있습니다.
  // 이런 문서는 현재 MAC으로 다시 접속할 때 기존 회원 문서에 장치를 재연결해 관제 목록과 모바일 프로필이 분리되지 않게 맞춥니다.
  const legacyDeviceKey = `device_${normalized.replace(/[^A-Z0-9]/g, '').toLowerCase()}`;
  const legacyUser = await User.findOne({
    isEmergencyAppUser: true,
    $or: [
      { phone: legacyDeviceKey },
      { email: `${legacyDeviceKey}@goldentime.local` },
    ],
  });
  if (legacyUser) {
    const now = new Date();
    legacyUser.wearableDevice = {
      ...(legacyUser.wearableDevice || {}),
      deviceId: normalized,
      deviceName: legacyUser.wearableDevice?.deviceName || 'WEARABLE',
      deviceType: legacyUser.wearableDevice?.deviceType || 'watch',
      connectedAt: legacyUser.wearableDevice?.connectedAt || now,
    };
    await legacyUser.save();
    return legacyUser;
  }

  // 디바이스 전용 자동 계정 생성은 명시적으로 켠 환경에서만 허용합니다.
  if ((process.env.ALLOW_EMERGENCY_DEVICE_AUTO_CREATE || '').toLowerCase() !== 'true') {
    return null;
  }

  const emailKey = normalized.replace(/[^A-Z0-9]/g, '').toLowerCase();
  const password = crypto.randomBytes(16).toString('hex');
  const now = new Date();

  const user = new User({
    name: `Device ${normalized.slice(-5)}`,
    phone: `device_${emailKey}`,
    email: `device_${emailKey}@goldentime.local`,
    password,
    birthDate: new Date('2000-01-01'),
    age: 25,
    height: 170,
    weight: 70,
    bloodType: 'O',
    isEmergencyAppUser: true,
    accountStatus: 'active',
    wearableDevice: {
      deviceId: normalized,
      deviceName: 'WEARABLE',
      deviceType: 'watch',
      connectedAt: now,
      lastSyncAt: now,
      connectionStatus: 'connected',
    },
  });

  await user.save();
  return user;
}

/**
 * 회원 문서의 medicalHistory 배열 구조를 모바일 앱의 3개 문자열 메모 구조로 평탄화합니다.
 */
function toDeviceProfileMedicalMemo(medicalHistory = {}) {
  const joinEntries = (rows, key) =>
    Array.isArray(rows)
      ? rows
          .map((row) => {
            if (typeof row === 'string') return row.trim();
            if (row && typeof row === 'object' && typeof row[key] === 'string') return row[key].trim();
            return '';
          })
          .filter(Boolean)
          .join(', ')
      : '';

  return {
    medicalConditions: joinEntries(medicalHistory?.chronicDiseases, 'disease'),
    medications: joinEntries(medicalHistory?.medications, 'name'),
    allergies: joinEntries(medicalHistory?.allergies, 'substance'),
  };
}

/**
 * 모바일 앱에서 저장한 3개 문자열 메모를 User 문서의 medicalHistory 배열 구조로 변환합니다.
 */
function toUserMedicalHistoryFromMemo(memo = {}) {
  const splitItems = (value) =>
    String(value || '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    chronicDiseases: splitItems(memo.medicalConditions).map((disease) => ({ disease })),
    medications: splitItems(memo.medications).map((name) => ({ name })),
    allergies: splitItems(memo.allergies).map((substance) => ({ substance })),
  };
}

/**
 * 모바일 회원앱이 바로 쓸 수 있게 회원 문서에서 장치 연동 프로필 응답 구조를 만듭니다.
 */
function serializeEmergencyDeviceProfile(user) {
  return {
    _id: user?._id,
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    age: typeof user?.age === 'number' ? user.age : null,
    gender: user?.gender === 'female' ? 'female' : user?.gender === 'male' ? 'male' : null,
    birthDate: user?.birthDate || null,
    bloodType: user?.bloodType || '',
    medicalMemo: toDeviceProfileMedicalMemo(user?.medicalHistory),
    emergencyContact: user?.emergencyContact || null,
    wearableDevice: user?.wearableDevice || null,
    manualBloodPressure:
      user?.wearableDevice?.manualBloodPressure &&
      typeof user.wearableDevice.manualBloodPressure.systolic === 'number' &&
      typeof user.wearableDevice.manualBloodPressure.diastolic === 'number'
        ? {
            systolic: user.wearableDevice.manualBloodPressure.systolic,
            diastolic: user.wearableDevice.manualBloodPressure.diastolic,
            updatedAt: user.wearableDevice.manualBloodPressure.updatedAt || null,
          }
        : null,
  };
}

/**
 * 디바이스 이벤트 경로로 들어온 생체 데이터를 사용자 계정에 저장합니다.
 */
function buildBiometricEventIdempotencyKey(payload = {}) {
  const fingerprint = {
    mac: String(payload?.mac || '').trim().toUpperCase(),
    timestamp: String(payload?.timestamp || ''),
    heartRate: payload?.biometric?.heartRate ?? null,
    spO2: payload?.biometric?.spO2 ?? null,
    temperature: payload?.biometric?.temperature ?? null,
    steps: payload?.biometric?.steps ?? null,
    stressLevel: payload?.biometric?.stressLevel ?? null,
    isWear: payload?.biometric?.isWear ?? null,
  };
  const digest = crypto.createHash('sha1').update(JSON.stringify(fingerprint)).digest('hex');
  return `idempotency:/api/mobile/biometric-event:${digest}`;
}

/**
 * 디바이스 이벤트 경로로 들어온 생체 데이터를 사용자 계정에 저장합니다.
 */
router.post('/biometric-event', async (req, res) => {
  try {
    const idempotencyKey = buildBiometricEventIdempotencyKey(req.body);
    const cachedResponse = await cacheService.get(idempotencyKey);
    if (cachedResponse) {
      return res.status(201).json(cachedResponse);
    }

    const { mac, timestamp, biometric, location } = req.body || {};

    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    const collectedAt = timestamp ? new Date(timestamp) : new Date();
    const explicitLocationProvider = String(location?.provider || '').trim().toLowerCase();
    const isApproxIpProvider =
      explicitLocationProvider === 'ipwho.is' ||
      explicitLocationProvider === 'ipapi.co' ||
      explicitLocationProvider === 'ipinfo.io';
    // 생체 이벤트는 명시적으로 전달된 실제 폰 위치만 저장하고, IP 대략 좌표는 lastKnownLocation에 반영하지 않습니다.
    const resolvedLocation =
      typeof location?.lat === 'number' &&
      typeof location?.lng === 'number' &&
      !isApproxIpProvider
        ? {
            lat: location.lat,
            lng: location.lng,
            accuracyM: typeof location?.accuracyM === 'number' ? location.accuracyM : undefined,
            provider: typeof location?.provider === 'string' ? location.provider : 'app_bridge',
            source: resolvePhoneLocationSource(location),
            timeMs: typeof location?.timeMs === 'number' ? location.timeMs : collectedAt.getTime(),
          }
        : null;

    // 디바이스 이벤트는 값 범위를 한 번 더 걸러 DB에 비정상 원시값이 퍼지지 않게 합니다.
    const tempValue = typeof biometric?.temperature === 'number' ? biometric.temperature : undefined;
    const bodyTemperature = typeof tempValue === 'number' && tempValue >= 30 && tempValue <= 45 ? tempValue : undefined;
    const bpSys = typeof biometric?.bloodPressureSys === 'number' ? biometric.bloodPressureSys : undefined;
    const bpDia = typeof biometric?.bloodPressureDia === 'number' ? biometric.bloodPressureDia : undefined;
    const bloodPressure =
      typeof bpSys === 'number' && typeof bpDia === 'number' && bpSys >= 60 && bpDia >= 40
        ? { systolic: bpSys, diastolic: bpDia }
        : undefined;

    const rawData = {
      ...(typeof biometric === 'object' && biometric ? biometric : {}),
      ingestSource: 'member_app',
      isWear: typeof biometric?.isWear === 'boolean' ? biometric.isWear : undefined,
      locationMeta:
        resolvedLocation
          ? {
              source: resolvedLocation.source,
              provider: resolvedLocation.provider,
              timestamp: collectedAt,
              ageMs: 0,
            }
          : undefined,
    };

    const doc = new BiometricData({
      userId: user._id,
      collectedAt,
      heartRate: typeof biometric?.heartRate === 'number' ? biometric.heartRate : undefined,
      stressLevel: typeof biometric?.stressLevel === 'number' ? biometric.stressLevel : undefined,
      spO2: typeof biometric?.spO2 === 'number' ? biometric.spO2 : undefined,
      bodyTemperature,
      bloodPressure,
      steps: typeof biometric?.steps === 'number' ? biometric.steps : undefined,
      location: {
        lat: resolvedLocation?.lat,
        lng: resolvedLocation?.lng,
        accuracy: resolvedLocation?.accuracyM,
        timestamp: resolvedLocation ? collectedAt : undefined,
      },
      rawData,
    });
    // #region debug-point E:mobile-biometric-entry
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'E',location:'backend/api/mobile.js:1582',msg:'[DEBUG] mobile biometric-event entry',data:{userId:String(user._id||''),name:user?.name||null,mac:String(mac||''),collectedAt:collectedAt instanceof Date?collectedAt.toISOString():null,heartRate:doc.heartRate??null,spO2:doc.spO2??null,bodyTemperature:doc.bodyTemperature??null,steps:doc.steps??null,isWear:typeof biometric?.isWear==='boolean'?biometric.isWear:null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    // #region debug-point E:kim-taeyun-biometric-ingest
    (()=>{if(user?.name!=='김태윤')return;const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='kim-taeyun-realtime';try{const e=fs.readFileSync('.dbg/kim-taeyun-realtime.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'E',location:'backend/api/mobile.js:1596',msg:'[DEBUG] 김태윤 biometric ingest matched user',data:{userId:String(user._id),name:user.name,mac:String(mac||''),deviceId:user?.wearableDevice?.deviceId||null,heartRate:doc.heartRate??null,spO2:doc.spO2??null,bodyTemperature:doc.bodyTemperature??null,steps:doc.steps??null,collectedAt},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    // #region debug-point C:mobile-biometric-event
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-remove-detection';try{const e=fs.readFileSync('.dbg/watch-remove-detection.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:1206',msg:'[DEBUG] mobile biometric-event received',data:{userId:String(user._id),mac:String(mac||''),incomingIsWear:biometric?.isWear,incomingHeartRate:biometric?.heartRate,incomingSpO2:biometric?.spO2,incomingTemperature:biometric?.temperature,incomingSteps:biometric?.steps,collectedAt},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    await doc.save();
    invalidateCache(`^cache:/api/mobile/biometric/recent:[^:]+:${user._id}:`);
    // #region debug-point A:biometric-dummy-map-event-saved
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='biometric-dummy-map';try{const e=fs.readFileSync('.dbg/biometric-dummy-map.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'A',location:'backend/api/mobile.js:1907',msg:'[DEBUG] biometric-event saved for member/control',data:{userId:String(user?._id||''),name:user?.name||null,mac:String(mac||''),collectedAt:doc?.collectedAt instanceof Date?doc.collectedAt.toISOString():doc?.collectedAt||null,heartRate:typeof doc?.heartRate==='number'?doc.heartRate:null,spO2:typeof doc?.spO2==='number'?doc.spO2:null,bodyTemperature:typeof doc?.bodyTemperature==='number'?doc.bodyTemperature:null,steps:typeof doc?.steps==='number'?doc.steps:null,isWear:typeof rawData?.isWear==='boolean'?rawData.isWear:null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion
    // #region debug-point E:mobile-biometric-saved
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='watch-ingest-stall';try{const e=fs.readFileSync('.dbg/watch-ingest-stall.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'E',location:'backend/api/mobile.js:1608',msg:'[DEBUG] mobile biometric-event saved',data:{biometricId:String(doc._id||''),userId:String(user._id||''),collectedAt:doc.collectedAt instanceof Date?doc.collectedAt.toISOString():null,lastSyncAtBeforeSave:user?.wearableDevice?.lastSyncAt instanceof Date?user.wearableDevice.lastSyncAt.toISOString():user?.wearableDevice?.lastSyncAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    if (user.wearableDevice) {
      user.wearableDevice.lastSyncAt = collectedAt;
      user.wearableDevice.connectionStatus = 'connected';
      if (!user.wearableDevice.connectedAt) user.wearableDevice.connectedAt = collectedAt;
      if (resolvedLocation) {
        user.wearableDevice.lastKnownLocation = {
          lat: resolvedLocation.lat,
          lng: resolvedLocation.lng,
          accuracyM: resolvedLocation.accuracyM,
          provider: resolvedLocation.provider,
          source: resolvedLocation.source,
          updatedAt: collectedAt,
        };
      } else {
        // 기존 IP 대략 위치만 남아 있으면 지워 서울역 같은 잘못된 fallback 좌표가 재노출되지 않게 합니다.
        const prevProvider = String(user?.wearableDevice?.lastKnownLocation?.provider || '').trim().toLowerCase();
        const prevSource = String(user?.wearableDevice?.lastKnownLocation?.source || '').trim().toLowerCase();
        const prevIsApproxIp =
          prevSource === 'ip_position' ||
          prevProvider === 'ipwho.is' ||
          prevProvider === 'ipapi.co' ||
          prevProvider === 'ipinfo.io';
        if (prevIsApproxIp) {
          user.wearableDevice.lastKnownLocation = null;
          user.markModified('wearableDevice.lastKnownLocation');
        }
      }
      if (bloodPressure) {
        user.wearableDevice.manualBloodPressure = {
          systolic: bloodPressure.systolic,
          diastolic: bloodPressure.diastolic,
          updatedAt: collectedAt,
        };
      }
      await user.save();
    }

    emitBiometricDataUpdated(String(user._id), {
      collectedAt: doc.collectedAt,
      heartRate: doc.heartRate,
      isWear: typeof rawData?.isWear === 'boolean' ? rawData.isWear : undefined,
      spO2: doc.spO2,
      bodyTemperature: doc.bodyTemperature,
      stressLevel: doc.stressLevel,
      steps: doc.steps,
      movementStatus: typeof biometric?.movementStatus === 'string' ? biometric.movementStatus : undefined,
      batteryLevel: typeof biometric?.batteryLevel === 'number' ? biometric.batteryLevel : undefined,
      acceleration: biometric?.acceleration,
      gyroscope: biometric?.gyroscope,
      barometer: biometric?.barometer,
      location: doc.location,
      locationMeta: rawData?.locationMeta,
    });

    await analyzeBiometricAndMaybeOpenCase({ user, biometricDoc: doc });
    invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${user._id}:`);

    const responsePayload = {
      success: true,
      message: '생체 데이터가 저장되었습니다.',
      data: {
        biometricData: {
          id: doc._id,
          collectedAt: doc.collectedAt,
          heartRate: doc.heartRate,
          spO2: doc.spO2,
          stressLevel: doc.stressLevel,
          analysis: doc.analysis,
        },
      },
    };
    await cacheService.set(idempotencyKey, responsePayload, 30);
    res.status(201).json(responsePayload);
  } catch (error) {
    logger.error('생체 이벤트 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 디바이스 페어링 해제 이벤트를 반영해 연결 상태를 끊김으로 기록합니다.
 */
router.post('/device-unpair', async (req, res) => {
  try {
    const { mac, timestamp, reason } = req.body || {};
    const normalized = String(mac || '').trim().toUpperCase();
    if (!normalized || !/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(normalized)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 mac 입니다.',
      });
    }

    const user = await User.findOne({ 'wearableDevice.deviceId': normalized });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: '등록되지 않은 기기입니다.',
      });
    }

    if (!user.wearableDevice) user.wearableDevice = {};
    user.wearableDevice.connectionStatus = 'disconnected';
    user.wearableDevice.connectedAt = null;
    user.wearableDevice.lastSyncAt = new Date(0);
    await user.save();

    res.status(200).json({
      success: true,
      message: '기기 페어링 해제가 반영되었습니다.',
      data: {
        mac: normalized,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        reason: String(reason || 'unpaired'),
      },
    });
  } catch (error) {
    logger.error('기기 페어링 해제 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '페어링 해제 처리 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 디바이스에서 전달한 사용자 표시 이름을 계정 이름으로 저장합니다.
 */
router.post('/device-name', async (req, res) => {
  try {
    const { mac, name } = req.body || {};
    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    const nextName = String(name || '').trim();
    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: '이름이 비어 있습니다.',
      });
    }
    if (nextName.length > 40) {
      return res.status(400).json({
        success: false,
        message: '이름이 너무 깁니다.',
      });
    }

    user.name = nextName;
    await user.save();

    res.status(200).json({
      success: true,
      message: '이름이 저장되었습니다.',
      data: { name: nextName },
    });
  } catch (error) {
    logger.error('이름 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '이름 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 워치 MAC 기준으로 연결된 회원 프로필을 조회해 회원앱/복지사/관제와 같은 원본 회원 문서를 보게 합니다.
 */
router.get('/device-profile', async (req, res) => {
  try {
    const mac = String(req.query?.mac || '').trim();
    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: serializeEmergencyDeviceProfile(user),
    });
  } catch (error) {
    logger.error('디바이스 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 워치 MAC 기준으로 회원 기본 프로필 일부를 갱신해 admin과 같은 User 문서에 저장합니다.
 */
router.put('/device-profile', async (req, res) => {
  try {
    const { mac, medicalMemo, manualBloodPressure, emergencyContact, signupProfile } = req.body || {};
    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    if (signupProfile && typeof signupProfile === 'object') {
      const name = String(signupProfile.name || '').trim();
      const email = String(signupProfile.email || '').trim().toLowerCase();
      const password = String(signupProfile.password || '').trim();
      const phone = normalizePhoneDigits(signupProfile.phone);
      const birthDate = String(signupProfile.birthDate || '').trim();
      const bloodType = String(signupProfile.bloodType || '').trim();
      const height = Number(signupProfile.height);
      const weight = Number(signupProfile.weight);
      const consents = signupProfile.consents && typeof signupProfile.consents === 'object' ? signupProfile.consents : {};
      const guardian = signupProfile.guardian && typeof signupProfile.guardian === 'object' ? signupProfile.guardian : null;
      const birthDateObj = new Date(birthDate);
      const normalizedAffiliation = normalizeMemberAffiliationInput(signupProfile.affiliation, signupProfile);
      const affiliationError = validateMemberAffiliation(normalizedAffiliation);

      if (!name || !email || !password || !birthDate || !bloodType) {
        return res.status(400).json({
          success: false,
          message: '회원가입 필수 항목이 누락되었습니다.',
        });
      }

      if (Number.isNaN(birthDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: '올바른 생년월일을 입력해주세요.',
        });
      }

      if (!Number.isFinite(height) || height < 50 || height > 250) {
        return res.status(400).json({
          success: false,
          message: '신장은 50cm에서 250cm 사이여야 합니다.',
        });
      }

      if (!Number.isFinite(weight) || weight < 10 || weight > 300) {
        return res.status(400).json({
          success: false,
          message: '체중은 10kg에서 300kg 사이여야 합니다.',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: '올바른 이메일 형식을 입력해주세요.',
        });
      }

      if (affiliationError) {
        return res.status(400).json({
          success: false,
          message: affiliationError,
        });
      }

      if (phone && !/^01[0-9]{8,9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: '올바른 전화번호 형식을 입력해주세요.',
        });
      }

      if (!['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodType)) {
        return res.status(400).json({
          success: false,
          message: '올바른 혈액형을 선택해주세요.',
        });
      }

      const existingEmailUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      }).select('_id');
      if (existingEmailUser) {
        return res.status(400).json({
          success: false,
          message: '이미 가입된 이메일입니다.',
        });
      }

      if (phone) {
        const existingPhoneUser = await User.findOne({
          phone,
          _id: { $ne: user._id },
        }).select('_id');
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            message: '이미 가입된 전화번호입니다.',
          });
        }
      }

      let age = Number(signupProfile.age);
      if (!Number.isFinite(age) || age <= 0) {
        const today = new Date();
        age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
          age -= 1;
        }
      }

      user.name = name;
      user.email = email;
      user.password = password;
      user.phone = phone || undefined;
      user.birthDate = birthDateObj;
      user.age = age;
      user.height = height;
      user.weight = weight;
      user.bloodType = bloodType;
      user.affiliation = normalizedAffiliation;
      user.isEmergencyAppUser = true;
      user.accountStatus = 'pending';
      user.consents = {
        ...(user.consents || {}),
        emergencyAutoReport: consents.emergencyAutoReport !== false,
        personalInfoCollection: consents.personalInfoCollection !== false,
        preciseLocation: consents.preciseLocation !== false,
        emergencyAlgorithm: consents.emergencyAlgorithm !== false,
      };

      const normalizedGuardian = guardian
        ? {
            name: String(guardian.name || '').trim(),
            phone: normalizePhoneDigits(guardian.phone),
            relationship: String(guardian.relationship || '').trim(),
          }
        : null;
      const hasGuardian =
        normalizedGuardian &&
        (normalizedGuardian.name || normalizedGuardian.phone || normalizedGuardian.relationship);

      user.emergencyContact = hasGuardian
        ? {
            name: normalizedGuardian.name,
            phone: normalizedGuardian.phone,
            relationship: normalizedGuardian.relationship,
          }
        : undefined;
      user.emergencySettings = {
        ...(user.emergencySettings || {}),
        emergencyContacts: hasGuardian
          ? [
              {
                name: normalizedGuardian.name,
                phone: normalizedGuardian.phone,
                relationship: normalizedGuardian.relationship,
                priority: 1,
              },
            ]
          : [],
        guardianAccess: {
          ...(user?.emergencySettings?.guardianAccess || {}),
          code: '',
          codeIssuedAt: null,
          codeExpiresAt: null,
          verifiedAt: null,
          verifiedGuardianPhone: hasGuardian ? normalizedGuardian.phone : '',
        },
      };
    }

    if (medicalMemo && typeof medicalMemo === 'object') {
      user.medicalHistory = toUserMedicalHistoryFromMemo(medicalMemo);
    }

    if (emergencyContact && typeof emergencyContact === 'object') {
      user.emergencyContact = {
        name: String(emergencyContact.name || '').trim(),
        phone: String(emergencyContact.phone || '').trim(),
        relationship: String(emergencyContact.relationship || '').trim(),
      };
      user.emergencySettings = {
        ...(user.emergencySettings || {}),
        guardianAccess: {
          ...(user?.emergencySettings?.guardianAccess || {}),
          code: '',
          codeIssuedAt: null,
          codeExpiresAt: null,
          verifiedAt: null,
          verifiedGuardianPhone: normalizePhoneDigits(emergencyContact.phone),
        },
      };
    }

    const sys = Number(manualBloodPressure?.systolic);
    const dia = Number(manualBloodPressure?.diastolic);
    if (Number.isFinite(sys) && Number.isFinite(dia) && sys > 0 && dia > 0) {
      if (!user.wearableDevice) user.wearableDevice = {};
      user.wearableDevice.manualBloodPressure = {
        systolic: sys,
        diastolic: dia,
        updatedAt: new Date(),
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: signupProfile
        ? '회원가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.'
        : '회원 프로필이 저장되었습니다.',
      data: serializeEmergencyDeviceProfile(user),
    });
  } catch (error) {
    logger.error('디바이스 프로필 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로필 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 디바이스 연결/해제 상태 이벤트를 사용자 웨어러블 정보에 반영합니다.
 */
router.post('/device-connection', async (req, res) => {
  try {
    const { mac, connected, timestamp } = req.body || {};
    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    const isConnected = connected === true;
    const at = timestamp ? new Date(timestamp) : new Date();

    if (!user.wearableDevice) user.wearableDevice = {};
    user.wearableDevice.connectionStatus = isConnected ? 'connected' : 'disconnected';
    if (isConnected) {
      user.wearableDevice.lastSyncAt = at;
      if (!user.wearableDevice.connectedAt) user.wearableDevice.connectedAt = at;
    } else {
      user.wearableDevice.connectedAt = null;
      user.wearableDevice.lastSyncAt = new Date(0);
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: '연결 상태가 저장되었습니다.',
      data: {
        connected: isConnected,
        timestamp: at,
      },
    });
  } catch (error) {
    logger.error('연결 상태 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '연결 상태 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 폰 기반 위치를 보조 위치 정보로 저장해 지도 보정에 사용합니다.
 */
router.post('/location', async (req, res) => {
  /**
   * 폰(위치 서비스) 기반 위치를 수신하여 사용자 웨어러블 상태에 보조 위치로 저장합니다.
   * 워치 GPS가 미수집/지연될 때 관제 지도 마커 보정에 사용합니다.
   */
  try {
    const { userId, mac, lat, lng, accuracyM, provider, timeMs } = req.body || {};
    // #region debug-point A:location-api-entry
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:2227',msg:'[DEBUG] /mobile/location received',data:{userId:String(userId||''),mac:String(mac||''),lat:typeof lat==='number'?lat:null,lng:typeof lng==='number'?lng:null,accuracyM:typeof accuracyM==='number'?accuracyM:null,provider:typeof provider==='string'?provider:null,timeMs:typeof timeMs==='number'?timeMs:null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion
    if (!(typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng))) {
      return res.status(400).json({
        success: false,
        message: 'lat/lng가 필요합니다.',
      });
    }

    let user = null;
    const macStr = String(mac || '').trim();
    const userIdStr = String(userId || '').trim();
    if (userIdStr) {
      user = await User.findById(userIdStr);
    }
    if (!user && macStr) {
      user = await findOrCreateEmergencyAppUserByMac(macStr);
    }
    if (!user && !macStr && !userIdStr) {
      return res.status(400).json({
        success: false,
        message: 'userId 또는 mac이 필요합니다.',
      });
    }
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }
    // #region debug-point C:location-api-user
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:2259',msg:'[DEBUG] /mobile/location resolved user',data:{resolvedUserId:String(user?._id||''),resolvedName:user?.name||null,userIdInput:userIdStr||null,macInput:macStr||null,deviceId:user?.wearableDevice?.deviceId||null,lastKnownProvider:user?.wearableDevice?.lastKnownLocation?.provider||null,lastKnownUpdatedAt:user?.wearableDevice?.lastKnownLocation?.updatedAt instanceof Date?user.wearableDevice.lastKnownLocation.updatedAt.toISOString():user?.wearableDevice?.lastKnownLocation?.updatedAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    const at = typeof timeMs === 'number' && Number.isFinite(timeMs) ? new Date(timeMs) : new Date();
    const locationPayload = { provider, accuracyM };
    if (!user.wearableDevice) user.wearableDevice = {};
    user.wearableDevice.lastKnownLocation = {
      lat,
      lng,
      accuracyM: typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? accuracyM : undefined,
      provider: typeof provider === 'string' ? provider : undefined,
      source: resolvePhoneLocationSource(locationPayload),
      updatedAt: at,
    };
    user.wearableDevice.lastSyncAt = at;
    user.wearableDevice.connectionStatus = 'connected';
    if (!user.wearableDevice.connectedAt) user.wearableDevice.connectedAt = at;
    // #region debug-point C:location-save-before
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:2277',msg:'[DEBUG] mobile location about to save',data:{resolvedUserId:String(user?._id||''),name:user?.name||null,lat,lng,provider:typeof provider==='string'?provider:null,source:user?.wearableDevice?.lastKnownLocation?.source||null,updatedAt:at instanceof Date?at.toISOString():null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion
    await user.save();
    // #region debug-point C:location-save-after
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:2281',msg:'[DEBUG] mobile location saved',data:{resolvedUserId:String(user?._id||''),savedLat:user?.wearableDevice?.lastKnownLocation?.lat??null,savedLng:user?.wearableDevice?.lastKnownLocation?.lng??null,savedProvider:user?.wearableDevice?.lastKnownLocation?.provider||null,savedSource:user?.wearableDevice?.lastKnownLocation?.source||null,lastSyncAt:user?.wearableDevice?.lastSyncAt instanceof Date?user.wearableDevice.lastSyncAt.toISOString():user?.wearableDevice?.lastSyncAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion
    // #region debug-point A:location-api-saved
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='wifi-location-mismatch';try{const e=fs.readFileSync('.dbg/wifi-location-mismatch.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'C',location:'backend/api/mobile.js:2284',msg:'[DEBUG] /mobile/location saved wearable location',data:{resolvedUserId:String(user?._id||''),lat:user?.wearableDevice?.lastKnownLocation?.lat??null,lng:user?.wearableDevice?.lastKnownLocation?.lng??null,provider:user?.wearableDevice?.lastKnownLocation?.provider||null,source:user?.wearableDevice?.lastKnownLocation?.source||null,updatedAt:user?.wearableDevice?.lastKnownLocation?.updatedAt instanceof Date?user.wearableDevice.lastKnownLocation.updatedAt.toISOString():user?.wearableDevice?.lastKnownLocation?.updatedAt||null,lastSyncAt:user?.wearableDevice?.lastSyncAt instanceof Date?user.wearableDevice.lastSyncAt.toISOString():user?.wearableDevice?.lastSyncAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    res.status(200).json({
      success: true,
      message: '위치가 저장되었습니다.',
      data: {
        lat,
        lng,
        updatedAt: at,
      },
    });
  } catch (error) {
    logger.error('위치 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '위치 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 워치 탈착 등 응급 이벤트를 받아 케이스 생성 또는 중복 처리합니다.
 */
router.post('/emergency-event', async (req, res) => {
  try {
    const { mac, type, timestamp, location, biometric } = req.body || {};

    const user = await findOrCreateEmergencyAppUserByMac(mac);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 기기입니다.',
      });
    }

    const eventType = String(type || '').trim() || 'WATCH_REMOVED';

    if (user.wearableDevice) {
      const detectedAtForSync = timestamp ? new Date(timestamp) : new Date();
      user.wearableDevice.lastSyncAt = detectedAtForSync;
      user.wearableDevice.connectionStatus = 'connected';
      if (!user.wearableDevice.connectedAt) user.wearableDevice.connectedAt = detectedAtForSync;
      await user.save();
    }

    const active = await EmergencyCase.findOne({
      userId: user._id,
      status: { $in: ['detected', 'matched', 'in_progress', 'transporting'] },
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) },
    });

    if (active) {
      // 중복 이벤트는 새 케이스를 만들지 않고 현재 진행 중 케이스를 앱/관제에 다시 브로드캐스트합니다.
      emitEmergencyCaseCreated({
        caseId: active._id,
        userId: String(user._id),
        emergencyLevel: active.emergencyLevel,
        status: active.status,
        detectedAt: active.detectedAt,
        detectedAnomalies: active.detectedAnomalies,
        locations: active.locations,
        aiAnalysis: active.llmAnalysis?.analysisText,
        vitals: {
          heartRate: typeof biometric?.heartRate === 'number' ? biometric.heartRate : 0,
          oxygenLevel: typeof biometric?.spO2 === 'number' ? biometric.spO2 : 0,
          bloodPressure:
            typeof biometric?.bloodPressure === 'string'
              ? biometric.bloodPressure
              : `${biometric?.bloodPressureSys ?? 0}/${biometric?.bloodPressureDia ?? 0}`,
          bodyTemp: typeof biometric?.temperature === 'number' ? biometric.temperature : 36.5,
        },
      });
      return res.status(200).json({
        success: true,
        message: '이미 처리 중인 응급 상황이 있습니다.',
        data: {
          emergencyCase: {
            id: active._id,
            emergencyLevel: active.emergencyLevel,
            status: active.status,
            detectedAt: active.detectedAt,
          },
        },
      });
    }

    const detectedAt = timestamp ? new Date(timestamp) : new Date();

    const emergencyCase = new EmergencyCase({
      userId: user._id,
      emergencyLevel: 5,
      detectedAnomalies: [
        {
          type: 'other',
          description: eventType === 'WATCH_REMOVED' ? '워치 탈착 감지' : `이벤트 감지: ${eventType}`,
          severity: 'critical',
        },
      ],
      locations: {
        detectedAt: buildCaseLocation(location, '현재 위치'),
        current: {
          ...buildCaseLocation(location, '현재 위치'),
          updatedAt: new Date(),
        },
      },
      biometricSnapshot: buildEmergencyCaseBiometricSnapshot({
        source: 'event_payload',
        biometric: {
          collectedAt: detectedAt,
          heartRate: biometric?.heartRate,
          spO2: biometric?.spO2,
          bodyTemperature: biometric?.temperature,
          bloodPressureSys: biometric?.bloodPressureSys,
          bloodPressureDia: biometric?.bloodPressureDia,
          location,
          analysis: {
            emergencyLevel: 5
          }
        }
      }),
      status: 'detected',
      detectedAt,
      matchingType: 'auto',
    });

    await emergencyCase.save();

    const lat =
      typeof location?.lat === 'number' && Number.isFinite(location.lat) ? location.lat : undefined;
    const lng =
      typeof location?.lng === 'number' && Number.isFinite(location.lng) ? location.lng : undefined;

    emergencyCase.llmAnalysis = {
      analysisText:
        eventType === 'WATCH_REMOVED'
          ? '워치 탈착이 감지되었습니다. 사용자의 반응 여부를 확인하고, 미응답 시 즉시 현장 확인을 진행하세요.'
          : `응급 이벤트가 감지되었습니다(${eventType}). 사용자의 상태 확인이 필요합니다.`,
      confidence: 0.95,
      analyzedAt: new Date(),
      model: 'rule-based',
    };
    await emergencyCase.save();
    invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${user._id}:`);

    emitEmergencyCaseCreated({
      caseId: emergencyCase._id,
      userId: String(user._id),
      emergencyLevel: emergencyCase.emergencyLevel,
      status: emergencyCase.status,
      detectedAt: emergencyCase.detectedAt,
      detectedAnomalies: emergencyCase.detectedAnomalies,
      locations: emergencyCase.locations,
      aiAnalysis: emergencyCase.llmAnalysis?.analysisText,
      vitals: {
        heartRate: typeof biometric?.heartRate === 'number' ? biometric.heartRate : 0,
        oxygenLevel: typeof biometric?.spO2 === 'number' ? biometric.spO2 : 0,
        bloodPressure:
          typeof biometric?.bloodPressure === 'string'
            ? biometric.bloodPressure
            : `${biometric?.bloodPressureSys ?? 0}/${biometric?.bloodPressureDia ?? 0}`,
        bodyTemp: typeof biometric?.temperature === 'number' ? biometric.temperature : 36.5,
      },
    });

    logger.warn(`응급 이벤트 수신: mac=${mac} user=${user._id} type=${eventType}`);

    res.status(201).json({
      success: true,
      message: '응급 이벤트가 처리되었습니다.',
      data: {
        emergencyCase: {
          id: emergencyCase._id,
          emergencyLevel: emergencyCase.emergencyLevel,
          status: emergencyCase.status,
          detectedAt: emergencyCase.detectedAt,
        },
      },
    });
  } catch (error) {
    logger.error('응급 이벤트 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 이벤트 처리 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 디바이스 또는 사용자 해제 신호로 진행 중 응급 케이스를 취소 처리합니다.
 */
router.post('/emergency-resolve', async (req, res) => {
  try {
    const { mac, timestamp, reason } = req.body || {};

    const user = await User.findOne({ 'wearableDevice.deviceId': String(mac || '').trim().toUpperCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const active = await EmergencyCase.findOne({
      userId: user._id,
      status: { $in: ['detected', 'matched', 'in_progress', 'transporting'] },
    }).sort({ createdAt: -1 });

    if (!active) {
      return res.status(200).json({
        success: true,
        message: '처리 중인 응급 상황이 없습니다.',
      });
    }

    active.status = 'cancelled';
    active.cancelledAt = timestamp ? new Date(timestamp) : new Date();
    active.cancelledReason = String(reason || 'resolved_by_user');
    await active.save();
    invalidateCache(`^cache:/api/mobile/emergency/history:[^:]+:${user._id}:`);

    emitCaseStatusUpdated(String(active._id), 'cancelled', { userId: String(user._id) });

    res.status(200).json({
      success: true,
      message: '응급 상황이 해제되었습니다.',
      data: {
        emergencyCase: {
          id: active._id,
          status: active.status,
          cancelledAt: active.cancelledAt,
        },
      },
    });
  } catch (error) {
    logger.error('응급 해제 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 해제 처리 중 오류가 발생했습니다.',
    });
  }
});

/**
 * @swagger
 * /api/mobile/emergency/history:
 *   get:
 *     summary: 응급 상황 이력 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [detected, matched, in_progress, transporting, completed, cancelled]
 *     responses:
 *       200:
 *         description: 응급 이력 조회 성공
 */
/**
 * 사용자의 응급 상황 이력을 상태별로 조회합니다.
 */
router.get(
  '/emergency/history',
  authenticateToken,
  requireReadableEmergencyUserOrGuardian,
  cacheMiddleware({
    ttlSeconds: 20,
    keyBuilder: async (req) =>
      `cache:/api/mobile/emergency/history:${req.user?.role || 'user'}:${req.user?.sub || 'anonymous'}:${JSON.stringify(req.query || {})}`,
  }),
  async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = { userId: req.user.sub };
    if (status) {
      query.status = status;
    }

    const emergencyCases = await EmergencyCase.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('paramedic.paramedicId', 'name phone')
      .populate('hospital.localHospitalId', 'name location contact')
      .lean();

    res.json({
      success: true,
      data: {
        emergencyCases: emergencyCases.map(ec => ({
          id: ec._id,
          emergencyLevel: ec.emergencyLevel,
          status: ec.status,
          detectedAt: ec.detectedAt,
          detectedAnomalies: ec.detectedAnomalies,
          paramedic: ec.paramedic,
          hospital: ec.hospital,
          locations: ec.locations
        })),
        total: emergencyCases.length
      }
    });
  } catch (error) {
    logger.error('응급 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '응급 이력 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/mobile/biometric/recent:
 *   get:
 *     summary: 최근 생체 데이터 조회
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: 생체 데이터 조회 성공
 */
/**
 * 최근 수집된 생체 데이터 목록을 시간 범위 기준으로 조회합니다.
 */
router.get(
  '/biometric/recent',
  authenticateToken,
  requireReadableEmergencyUserOrGuardian,
  cacheMiddleware({
    ttlSeconds: 15,
    keyBuilder: async (req) =>
      `cache:/api/mobile/biometric/recent:${req.user?.role || 'user'}:${req.user?.sub || 'anonymous'}:${JSON.stringify(req.query || {})}`,
  }),
  async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const hours = parseInt(req.query.hours) || 24;

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const debugUser = await User.findById(req.user.sub).select('name wearableDevice').lean();

    const biometricData = await BiometricData.find({
      userId: req.user.sub,
      collectedAt: { $gte: startTime }
    })
      .sort({ collectedAt: -1 })
      .limit(limit)
      .lean();

    // #region debug-point A:biometric-dummy-map-recent-response
    (()=>{const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='biometric-dummy-map';try{const e=fs.readFileSync('.dbg/biometric-dummy-map.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}const _latest=Array.isArray(biometricData)&&biometricData.length>0?biometricData[0]:null;fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'A',location:'backend/api/mobile.js:2628',msg:'[DEBUG] member recent biometrics response',data:{userId:String(req.user?.sub||''),name:debugUser?.name||null,total:Array.isArray(biometricData)?biometricData.length:0,latestCollectedAt:_latest?.collectedAt instanceof Date?_latest.collectedAt.toISOString():_latest?.collectedAt||null,heartRate:typeof _latest?.heartRate==='number'?_latest.heartRate:null,spO2:typeof _latest?.spO2==='number'?_latest.spO2:null,bodyTemperature:typeof _latest?.bodyTemperature==='number'?_latest.bodyTemperature:null,steps:typeof _latest?.steps==='number'?_latest.steps:null,lastSyncAt:debugUser?.wearableDevice?.lastSyncAt instanceof Date?debugUser.wearableDevice.lastSyncAt.toISOString():debugUser?.wearableDevice?.lastSyncAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    // #region debug-point B:kim-taeyun-guardian-biometrics
    (()=>{if(debugUser?.name!=='김태윤')return;const fs=require('fs');let _u='http://127.0.0.1:7777/event',_s='kim-taeyun-realtime';try{const e=fs.readFileSync('.dbg/kim-taeyun-realtime.env','utf8');_u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||_u;_s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||_s}catch{}const _latest=Array.isArray(biometricData)&&biometricData.length>0?biometricData[0]:null;fetch(_u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:_s,runId:'pre-fix',hypothesisId:'B',location:'backend/api/mobile.js:2271',msg:'[DEBUG] 김태윤 recent biometrics response',data:{userId:String(req.user.sub),name:debugUser?.name||null,role:req.user?.role||null,total:biometricData.length,latestCollectedAt:_latest?.collectedAt||null,heartRate:_latest?.heartRate??null,spO2:_latest?.spO2??null,bodyTemperature:_latest?.bodyTemperature??null,lastSyncAt:debugUser?.wearableDevice?.lastSyncAt||null},ts:Date.now()})}).catch(()=>{});})();
    // #endregion

    res.json({
      success: true,
      data: {
        biometricData: biometricData.map(data => ({
          id: data._id,
          collectedAt: data.collectedAt,
          heartRate: data.heartRate,
          bloodPressure: data.bloodPressure,
          spO2: data.spO2,
          bodyTemperature: data.bodyTemperature,
          steps: data.steps,
          stressLevel: data.stressLevel,
          hrv: data.hrv,
          batteryLevel: data.batteryLevel,
          barometer: data.barometer,
          acceleration: data.acceleration,
          gyroscope: data.gyroscope,
          noiseDb: data.noiseDb,
          sleepStatus: data.sleepStatus,
          movementStatus: data.movementStatus,
          location: data.location,
          analysis: data.analysis
        })),
        total: biometricData.length,
        timeRange: `${hours}시간`
      }
    });
  } catch (error) {
    logger.error('생체 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '생체 데이터 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/mobile/find-email
 * 이름과 전화번호로 가입된 이메일을 찾아 마스킹하여 반환합니다.
 */
router.post('/find-email', authLimiter, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: '이름과 전화번호를 입력해주세요.' });
    }

    const normalizedPhone = String(phone).replace(/[^\d]/g, '');
    const user = await User.findOne({
      name: String(name).trim(),
      phone: { $regex: normalizedPhone },
    }).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    }

    const [localPart, domain] = user.email.split('@');
    const maskedEmail = `${localPart.slice(0, 2)}***@${domain}`;

    res.json({ success: true, email: maskedEmail });
  } catch (error) {
    logger.error('이메일 찾기 오류:', error);
    res.status(500).json({ success: false, message: '이메일 찾기 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/mobile/reset-password/send-code
 * 비밀번호 재설정을 위한 SMS 인증코드를 발송합니다. (1단계)
 */
router.post('/reset-password/send-code', authLimiter, async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) {
      return res.status(400).json({ success: false, message: '이메일과 전화번호를 모두 입력해주세요.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).replace(/[^\d]/g, '');
    const user = await User.findOne({ email: normalizedEmail, phone: { $regex: normalizedPhone } });

    if (!user) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    }

    // 6자리 인증코드 생성 및 3분 만료 설정
    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    user.passwordResetCode = resetCode;
    user.passwordResetCodeExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분
    await user.save();

    // SMS 발송
    const maskedPhone = normalizedPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    const message = `[골든타임] 비밀번호 재설정 인증코드: ${resetCode}\n3분 안에 입력해주세요.`;
    await sendSMS(normalizedPhone, message);

    logger.info(`비밀번호 재설정 SMS 발송: ${normalizedEmail}`);
    res.json({ success: true, message: `인증코드가 ${maskedPhone}로 발송되었습니다.`, maskedPhone });
  } catch (error) {
    logger.error('비밀번호 재설정 SMS 발송 오류:', error);
    res.status(500).json({ success: false, message: '인증코드 발송 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/mobile/reset-password
 * SMS 인증코드 확인 후 비밀번호를 재설정합니다. (2단계)
 */
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, phone, code, newPassword } = req.body;
    if (!email || !phone || !code || !newPassword) {
      return res.status(400).json({ success: false, message: '필수 정보를 모두 입력해주세요.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).replace(/[^\d]/g, '');
    const normalizedCode = String(code).replace(/[^\d]/g, '');
    const user = await User.findOne({ email: normalizedEmail, phone: { $regex: normalizedPhone } });

    if (!user) {
      return res.status(404).json({ success: false, message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    }

    // 인증코드 검증
    if (!user.passwordResetCode || user.passwordResetCode !== normalizedCode) {
      return res.status(400).json({ success: false, message: '인증코드가 일치하지 않습니다.' });
    }
    if (!user.passwordResetCodeExpiresAt || user.passwordResetCodeExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: '인증코드가 만료되었습니다. 다시 요청해주세요.' });
    }

    // 비밀번호 변경
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    // 인증코드 즉시 소멸
    user.passwordResetCode = null;
    user.passwordResetCodeExpiresAt = null;
    user.lastActivity = new Date();
    await user.save();

    logger.info(`비밀번호 재설정 완료: ${normalizedEmail}`);
    res.json({ success: true, message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' });
  } catch (error) {
    logger.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ success: false, message: '비밀번호 재설정 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/mobile/check-email
 * 회원가입 시 이메일 중복 여부를 확인합니다.
 */
router.post('/check-email', async (req, res) => {
  try {
    const normalizedEmail = normalizeMemberEmail(req.body.email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      isEmergencyAppUser: true,
      accountStatus: { $nin: ['withdrawn'] },
    });

    if (existingUser) {
      return res.json({ success: true, available: false, message: '이미 가입된 이메일입니다.' });
    }

    return res.json({ success: true, available: true, message: '사용 가능한 이메일입니다.' });
  } catch (error) {
    logger.error('이메일 중복 확인 오류:', error);
    res.status(500).json({ success: false, message: '이메일 확인 중 오류가 발생했습니다.' });
  }
});

/**
 * 모바일 앱 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
