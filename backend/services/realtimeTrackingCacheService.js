const cacheService = require('./cacheService');

const TRACKING_STATUS_KEY = 'realtime-tracking:status';
const TRACKING_HISTORY_KEY_PREFIX = 'realtime-tracking:history:';
const TRACKING_TTL_SECONDS = 60 * 30;

/**
 * 위치 기록용 캐시 키를 생성합니다.
 */
function buildTrackingHistoryKey(trackingKey) {
  return `${TRACKING_HISTORY_KEY_PREFIX}${String(trackingKey || '').trim()}`;
}

/**
 * 현재 활성 추적 상태 요약을 공용 캐시에 저장합니다.
 */
async function setTrackingStatusSnapshot(payload, ttlSeconds = TRACKING_TTL_SECONDS) {
  await cacheService.set(TRACKING_STATUS_KEY, payload, ttlSeconds);
}

/**
 * 현재 활성 추적 상태 요약을 공용 캐시에서 읽습니다.
 */
async function getTrackingStatusSnapshot() {
  return cacheService.get(TRACKING_STATUS_KEY);
}

/**
 * 특정 추적 키의 최근 위치 기록을 공용 캐시에 저장합니다.
 */
async function setTrackingHistory(trackingKey, payload, ttlSeconds = TRACKING_TTL_SECONDS) {
  if (!trackingKey) return;
  await cacheService.set(buildTrackingHistoryKey(trackingKey), payload, ttlSeconds);
}

/**
 * 특정 추적 키의 최근 위치 기록을 공용 캐시에서 제거합니다.
 */
async function deleteTrackingHistory(trackingKey) {
  if (!trackingKey) return;
  await cacheService.delete(buildTrackingHistoryKey(trackingKey));
}

module.exports = {
  setTrackingStatusSnapshot,
  getTrackingStatusSnapshot,
  setTrackingHistory,
  deleteTrackingHistory,
};
