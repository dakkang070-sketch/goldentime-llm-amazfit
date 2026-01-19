const cacheService = require('../services/cacheService');

/**
 * 캐시 미들웨어
 * GET 요청에 대해 응답을 캐시합니다.
 */
function cacheMiddleware(ttlSeconds = 60) {
  return (req, res, next) => {
    // GET 요청만 캐시
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // 원본 res.json 저장
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      cacheService.set(cacheKey, data, ttlSeconds);
      return originalJson(data);
    };

    next();
  };
}

/**
 * 캐시 무효화 헬퍼
 */
function invalidateCache(pattern) {
  cacheService.deletePattern(pattern);
}

module.exports = {
  cacheMiddleware,
  invalidateCache
};
