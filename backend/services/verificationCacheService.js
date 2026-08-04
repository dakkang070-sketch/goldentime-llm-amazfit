const cacheService = require('./cacheService');

const DEFAULT_VERIFICATION_TTL_SECONDS = 3 * 60;

/**
 * 인증 저장소 scope와 전화번호를 조합해 Redis fallback 캐시 키를 생성합니다.
 */
function buildVerificationCacheKey(scope, phone) {
  return `verification:${String(scope || 'default').trim()}:${String(phone || '').trim()}`;
}

/**
 * 인증 엔트리의 만료 시각 중 가장 먼 값을 기준으로 TTL을 계산합니다.
 */
function resolveVerificationTtlSeconds(entry = {}) {
  const now = Date.now();
  const candidates = [entry.expiresAt, entry.verifiedUntil]
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value > now);

  if (candidates.length === 0) {
    return DEFAULT_VERIFICATION_TTL_SECONDS;
  }

  const latestExpiry = Math.max(...candidates);
  return Math.max(1, Math.ceil((latestExpiry - now) / 1000) + 5);
}

/**
 * 전화번호 기준 인증 엔트리를 Redis fallback 캐시에 저장합니다.
 */
async function setVerificationEntry(scope, phone, entry) {
  const key = buildVerificationCacheKey(scope, phone);
  await cacheService.set(key, entry, resolveVerificationTtlSeconds(entry));
}

/**
 * 전화번호 기준 인증 엔트리를 조회합니다.
 */
async function getVerificationEntry(scope, phone) {
  const key = buildVerificationCacheKey(scope, phone);
  return cacheService.get(key);
}

/**
 * 전화번호 기준 인증 엔트리를 삭제합니다.
 */
async function deleteVerificationEntry(scope, phone) {
  const key = buildVerificationCacheKey(scope, phone);
  await cacheService.delete(key);
}

module.exports = {
  setVerificationEntry,
  getVerificationEntry,
  deleteVerificationEntry,
};
