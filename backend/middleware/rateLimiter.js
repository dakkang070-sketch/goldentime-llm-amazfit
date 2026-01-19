const rateLimit = require('express-rate-limit');

/**
 * 일반 API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10000, // 최대 10000 요청 (개발용으로 대폭 완화)
  message: {
    success: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 인증 관련 Rate Limiter (더 엄격)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 시도
  message: {
    success: false,
    message: '너무 많은 로그인 시도가 발생했습니다. 15분 후 다시 시도해주세요.'
  },
  skipSuccessfulRequests: true,
});

/**
 * 생체 데이터 업로드 Rate Limiter
 */
const biometricLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 최대 10회 (1분에 1회 이상은 정상)
  message: {
    success: false,
    message: '생체 데이터 업로드가 너무 빈번합니다.'
  },
});

/**
 * 통계 API Rate Limiter
 */
const statsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 최대 30회
  message: {
    success: false,
    message: '통계 조회가 너무 빈번합니다.'
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  biometricLimiter,
  statsLimiter
};
