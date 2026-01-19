/**
 * 성능 모니터링 미들웨어
 */
const logger = require('../utils/logger');

function performanceMonitor(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // 응답 완료 시 측정
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024; // MB

    // 느린 요청 로깅 (1초 이상)
    if (duration > 1000) {
      logger.warn('느린 요청 감지', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        memoryUsed: `${memoryUsed.toFixed(2)}MB`,
        ip: req.ip
      });
    }

    // 개발 환경에서는 모든 요청 로깅
    if (process.env.NODE_ENV === 'development' && process.env.LOG_REQUESTS === 'true') {
      logger.debug('요청 처리', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        memoryUsed: `${memoryUsed.toFixed(2)}MB`
      });
    }

    // 응답 헤더에 성능 정보 추가 (선택사항)
    if (process.env.INCLUDE_PERFORMANCE_HEADERS === 'true') {
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Memory-Used', `${memoryUsed.toFixed(2)}MB`);
    }
  });

  next();
}

module.exports = performanceMonitor;
