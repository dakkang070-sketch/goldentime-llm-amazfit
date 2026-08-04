const cacheService = require('./cacheService');

/**
 * IP 위치 캐시 scope와 IP를 조합해 공용 캐시 키를 생성합니다.
 */
function buildIpLocationCacheKey(scope, ip) {
  return `geo:${String(scope || 'default').trim()}:${String(ip || '').trim()}`;
}

/**
 * 공용 캐시에서 IP 위치 값을 조회합니다.
 */
async function getIpLocationCache(scope, ip) {
  if (!ip) return null;
  return cacheService.get(buildIpLocationCacheKey(scope, ip));
}

/**
 * 공용 캐시에 IP 위치 값을 TTL과 함께 저장합니다.
 */
async function setIpLocationCache(scope, ip, value, ttlMs) {
  if (!ip) return;
  const ttlSeconds = Math.max(1, Math.ceil(Number(ttlMs || 0) / 1000));
  await cacheService.set(buildIpLocationCacheKey(scope, ip), value, ttlSeconds);
}

module.exports = {
  getIpLocationCache,
  setIpLocationCache,
};
