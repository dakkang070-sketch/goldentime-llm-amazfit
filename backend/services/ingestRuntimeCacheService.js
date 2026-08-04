const cacheService = require('./cacheService');

const AMAZFIT_WEAR_REF_TTL_SECONDS = 15;
const AMAZFIT_LOCATION_REF_TTL_SECONDS = 2 * 60;

/**
 * Amazfit 런타임 상태 공용 캐시 키를 생성합니다.
 */
function buildIngestRuntimeCacheKey(scope, userId) {
  return `ingest:amazfit:${String(scope || 'default').trim()}:${String(userId || '').trim()}`;
}

/**
 * 사용자별 최신 착용 상태를 공용 캐시에 저장합니다.
 */
async function setAmazfitWearEntry(userId, entry) {
  if (!userId) return;
  await cacheService.set(
    buildIngestRuntimeCacheKey('wear', userId),
    entry,
    AMAZFIT_WEAR_REF_TTL_SECONDS,
  );
}

/**
 * 사용자별 최신 착용 상태를 공용 캐시에서 조회합니다.
 */
async function getAmazfitWearEntry(userId) {
  if (!userId) return null;
  return cacheService.get(buildIngestRuntimeCacheKey('wear', userId));
}

/**
 * 사용자별 최신 위치 스냅샷을 공용 캐시에 저장합니다.
 */
async function setAmazfitLocationEntry(userId, entry) {
  if (!userId) return;
  await cacheService.set(
    buildIngestRuntimeCacheKey('location', userId),
    entry,
    AMAZFIT_LOCATION_REF_TTL_SECONDS,
  );
}

module.exports = {
  setAmazfitWearEntry,
  getAmazfitWearEntry,
  setAmazfitLocationEntry,
};
