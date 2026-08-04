const cacheService = require('../services/cacheService');

/**
 * GET 요청 응답을 URL 기준 키로 캐시에 저장하는 미들웨어를 생성합니다.
 */
function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    try {
      // GET 요청만 캐시
      if (req.method !== 'GET') {
        return next();
      }

      // URL과 query 조합으로 동일 조회 요청을 구분합니다.
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      // 캐시 미스일 때는 실제 응답 직전에 결과를 저장하도록 res.json을 감쌉니다.
      const originalJson = res.json.bind(res);
      /**
       * 응답 본문을 전송하면서 캐시 저장은 비동기로 병행합니다.
       */
      res.json = function(data) {
        Promise.resolve(cacheService.set(cacheKey, data, ttlSeconds)).catch((error) => {
          console.warn('[cacheMiddleware] failed to persist cache:', error.message);
        });
        return originalJson(data);
      };

      return next();
    } catch (error) {
      console.warn('[cacheMiddleware] cache lookup failed, fallback to live handler:', error.message);
      return next();
    }
  };
}

/**
 * 패턴과 일치하는 캐시 엔트리를 서비스 계층에서 일괄 삭제합니다.
 */
function invalidateCache(pattern) {
  // 목록/상세처럼 연관 키가 여러 개인 경우 패턴 삭제로 한 번에 비웁니다.
  Promise.resolve(cacheService.deletePattern(pattern)).catch((error) => {
    console.warn('[cacheMiddleware] cache invalidation failed:', error.message);
  });
}

/**
 * 캐시 미들웨어와 캐시 무효화 헬퍼를 함께 export 합니다.
 */
module.exports = {
  cacheMiddleware,
  invalidateCache
};
