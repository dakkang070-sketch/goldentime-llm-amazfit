const cacheService = require('./cacheService');

/**
 * shadow state 캐시 키를 생성합니다.
 */
function buildShadowStateKey(scope, entityId) {
  return `shadow-state:${String(scope || 'default').trim()}:${String(entityId || '').trim()}`;
}

/**
 * 직렬화 가능한 shadow state 요약본을 TTL과 함께 저장합니다.
 */
async function setShadowState(scope, entityId, payload, ttlSeconds = 3600) {
  if (!entityId) return;
  await cacheService.set(buildShadowStateKey(scope, entityId), payload, ttlSeconds);
}

/**
 * shadow state 요약본을 삭제합니다.
 */
async function deleteShadowState(scope, entityId) {
  if (!entityId) return;
  await cacheService.delete(buildShadowStateKey(scope, entityId));
}

module.exports = {
  setShadowState,
  deleteShadowState,
};
