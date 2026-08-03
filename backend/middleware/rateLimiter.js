const rateLimit = require('express-rate-limit');

/**
 * 숫자형 환경변수를 읽고, 잘못된 값이면 기본값으로 대체합니다.
 */
function readLimit(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Cloudflare 터널/프록시 뒤에서도 실제 사용자별로 제한이 분리되도록 요청 키를 계산합니다.
 */
function getClientKey(req) {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip;
}

/**
 * 관제/관리자/모바일 대시보드의 읽기 전용 조회는 공통 limiter에서 제외합니다.
 */
function shouldSkipApiLimiter(req) {
  const requestPath = String(req.originalUrl || '').split('?')[0];
  if (!requestPath) {
    return false;
  }

  if (req.method === 'POST' && requestPath === '/api/mobile/location') {
    return true;
  }

  if (req.method !== 'GET') {
    return false;
  }

  return (
    requestPath === '/api/users' ||
    requestPath === '/api/controllers' ||
    requestPath === '/api/controllers/monitored-users' ||
    requestPath === '/api/controllers/emergency-cases' ||
    requestPath === '/api/controllers/current-watch' ||
    requestPath === '/api/ingest/amazfit/latest' ||
    requestPath === '/api/mobile/device-profile' ||
    requestPath === '/api/mobile/profile' ||
    requestPath === '/api/mobile/biometric/recent' ||
    requestPath === '/api/mobile/emergency/history'
  );
}

/**
 * 일반 API 전체에 적용할 완화된 공통 요청 제한 미들웨어입니다.
 */
const apiLimiter = rateLimit({
  // 일반 조회/관리 요청은 막히지 않도록 넉넉한 기본 한도를 둡니다.
  windowMs: readLimit('API_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: readLimit('API_RATE_LIMIT_MAX', 1500),
  keyGenerator: getClientKey,
  skip: shouldSkipApiLimiter,
  message: {
    success: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 로그인 등 인증 엔드포인트의 반복 시도를 억제하는 엄격한 제한 미들웨어입니다.
 */
const authLimiter = rateLimit({
  windowMs: readLimit('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: readLimit('AUTH_RATE_LIMIT_MAX', 5),
  keyGenerator: getClientKey,
  message: {
    success: false,
    message: '인증 관련 요청이 너무 많습니다. 15분 후 다시 시도해주세요.'
  },
  // 정상 로그인까지 카운트하면 사용자가 너무 빨리 막히므로 실패 위주로만 제한합니다.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 워치·모바일에서 들어오는 생체 데이터 업로드 빈도를 분당 기준으로 제한합니다.
 */
const biometricLimiter = rateLimit({
  // 센서 업로드는 짧은 주기 반복이 많아 분 단위로만 완만하게 제어합니다.
  windowMs: readLimit('BIOMETRIC_RATE_LIMIT_WINDOW_MS', 60 * 1000),
  max: readLimit('BIOMETRIC_RATE_LIMIT_MAX', 120),
  keyGenerator: getClientKey,
  message: {
    success: false,
    message: '생체 데이터 업로드가 너무 빈번합니다.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 대시보드 통계 조회가 과도하게 반복되지 않도록 보호하는 제한 미들웨어입니다.
 */
const statsLimiter = rateLimit({
  // 통계 API는 polling 빈도가 높을 수 있어 인증보다 완화된 별도 한도를 둡니다.
  windowMs: readLimit('STATS_RATE_LIMIT_WINDOW_MS', 60 * 1000),
  max: readLimit('STATS_RATE_LIMIT_MAX', 90),
  keyGenerator: getClientKey,
  message: {
    success: false,
    message: '통계 조회가 너무 빈번합니다.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 엔드포인트 용도별 요청 제한 미들웨어들을 함께 export 합니다.
 */
module.exports = {
  apiLimiter,
  authLimiter,
  biometricLimiter,
  statsLimiter
};
