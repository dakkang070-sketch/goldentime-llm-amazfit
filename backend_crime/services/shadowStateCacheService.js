const cacheService = require('./cacheService');

function buildShadowStateKey(scope, entityId) {
  return `shadow:state:${scope}:${entityId}`;
}

/**
 * shadow 상태 요약본을 저장합니다.
 */
async function setShadowState(scope, entityId, value, ttlSeconds = 60 * 60 * 24) {
  if (!entityId) return;
  await cacheService.set(
    buildShadowStateKey(scope, entityId),
    {
      ...value,
      updatedAt: new Date().toISOString(),
    },
    ttlSeconds,
  );
}

/**
 * shadow 상태를 제거합니다.
 */
async function deleteShadowState(scope, entityId) {
  if (!entityId) return;
  await cacheService.delete(buildShadowStateKey(scope, entityId));
}

/**
 * 특정 scope의 shadow 상태 목록을 조회합니다.
 */
async function listShadowStates(scope, limit = 200) {
  const normalizedScope = String(scope || '').trim();
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  const keyPrefix = buildShadowStateKey(normalizedScope, '');
  const collectedKeys = new Set();

  for (const key of cacheService.cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      collectedKeys.add(key);
    }
  }

  const redis = await cacheService.ensureRedisConnection?.();
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
      console.warn('[crime shadowStateCacheService] Redis scan failed:', error.message);
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
  listShadowStates,
};
