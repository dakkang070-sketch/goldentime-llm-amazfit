const cacheService = require('./cacheService');

/**
 * 분석 스로틀 종류와 사용자 ID를 조합해 공용 캐시 키를 생성합니다.
 */
function buildAnalysisThrottleKey(scope, userId) {
  return `analysis-throttle:${String(scope || 'default').trim()}:${String(userId || '').trim()}`;
}

/**
 * 사용자별 마지막 분석 시각을 조회합니다.
 */
async function getAnalysisThrottleTimestamp(scope, userId) {
  if (!userId) return 0;
  const value = await cacheService.get(buildAnalysisThrottleKey(scope, userId));
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * 사용자별 마지막 분석 시각을 TTL과 함께 저장합니다.
 */
async function setAnalysisThrottleTimestamp(scope, userId, timestamp, ttlMs) {
  if (!userId) return;
  const ttlSeconds = Math.max(1, Math.ceil(Number(ttlMs || 0) / 1000));
  await cacheService.set(buildAnalysisThrottleKey(scope, userId), Number(timestamp || 0), ttlSeconds);
}

module.exports = {
  getAnalysisThrottleTimestamp,
  setAnalysisThrottleTimestamp,
};
