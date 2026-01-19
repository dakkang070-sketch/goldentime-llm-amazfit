/**
 * 간단한 인메모리 캐시 서비스
 * 프로덕션에서는 Redis 사용 권장
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time To Live
  }

  /**
   * 캐시에 저장
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.ttl.set(key, expiry);

    // TTL이 지난 항목 자동 삭제
    setTimeout(() => {
      if (this.ttl.get(key) && Date.now() >= this.ttl.get(key)) {
        this.delete(key);
      }
    }, ttlSeconds * 1000);
  }

  /**
   * 캐시에서 가져오기
   */
  get(key) {
    const expiry = this.ttl.get(key);
    
    // TTL 확인
    if (expiry && Date.now() >= expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  /**
   * 캐시 삭제
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * 키 패턴으로 삭제
   */
  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  /**
   * 캐시 전체 삭제
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * 캐시 크기
   */
  size() {
    return this.cache.size;
  }
}

// 싱글톤 인스턴스
const cacheService = new CacheService();

module.exports = cacheService;
