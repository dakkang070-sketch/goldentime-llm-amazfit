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

/**
 * shadow state 요약본 하나를 조회합니다.
 */
async function getShadowState(scope, entityId) {
  if (!entityId) return null;
  return cacheService.get(buildShadowStateKey(scope, entityId));
}

/**
 * 특정 scope의 shadow state 목록을 조회합니다.
 */
async function listShadowStates(scope, limit = 20) {
  const normalizedScope = String(scope || '').trim();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const keyPrefix = buildShadowStateKey(normalizedScope, '');
  const collectedKeys = new Set();

  for (const key of cacheService.cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      collectedKeys.add(key);
    }
  }

  const redis = await cacheService.ensureRedisConnection();
  if (redis) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${keyPrefix}*`,
          'COUNT',
          Math.max(20, safeLimit),
        );
        cursor = nextCursor;
        keys.forEach((key) => collectedKeys.add(key));
      } while (cursor !== '0' && collectedKeys.size < safeLimit);
    } catch (error) {
      console.warn('[shadowStateCacheService] Redis scan failed, fallback to memory keys:', error.message);
    }
  }

  const keyList = [...collectedKeys].sort().slice(0, safeLimit);
  const items = [];
  for (const key of keyList) {
    const value = await cacheService.get(key);
    if (value) {
      items.push({
        key,
        entityId: key.slice(keyPrefix.length),
        value,
      });
    }
  }

  return items;
}

module.exports = {
  setShadowState,
  deleteShadowState,
  getShadowState,
  listShadowStates,
};
