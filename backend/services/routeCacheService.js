const cacheService = require('./cacheService');

const ACTIVE_ROUTE_KEY_PREFIX = 'route:active:';
const ACTIVE_ROUTE_TTL_SECONDS = 60 * 60;

/**
 * 활성 경로 캐시 키를 생성합니다.
 */
function buildActiveRouteKey(routeId) {
  return `${ACTIVE_ROUTE_KEY_PREFIX}${String(routeId || '').trim()}`;
}

/**
 * 활성 경로 요약을 shared cache에 저장합니다.
 */
async function setActiveRoute(routeId, payload, ttlSeconds = ACTIVE_ROUTE_TTL_SECONDS) {
  if (!routeId) return;
  await cacheService.set(buildActiveRouteKey(routeId), payload, ttlSeconds);
}

/**
 * 활성 경로 요약을 shared cache에서 읽습니다.
 */
async function getActiveRoute(routeId) {
  if (!routeId) return null;
  return cacheService.get(buildActiveRouteKey(routeId));
}

/**
 * 활성 경로 요약을 shared cache에서 제거합니다.
 */
async function deleteActiveRoute(routeId) {
  if (!routeId) return;
  await cacheService.delete(buildActiveRouteKey(routeId));
}

module.exports = {
  setActiveRoute,
  getActiveRoute,
  deleteActiveRoute,
};
