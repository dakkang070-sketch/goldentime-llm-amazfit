const Redis = require('ioredis');

/**
 * 인메모리 캐시를 기본값으로 유지하면서, 설정된 경우 Redis를 병행 사용하는 캐시 서비스입니다.
 */
class CacheService {
  /**
   * 값 저장 맵과 TTL 만료 시각 맵을 초기화합니다.
   */
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time To Live
    this.redis = null;
    this.redisEnabled =
      process.env.ENABLE_REDIS_CACHE === 'true' ||
      Boolean(process.env.REDIS_URL) ||
      Boolean(process.env.REDIS_HOST);
    this.redisConnectPromise = null;
  }

  /**
   * Redis 설정이 있을 때만 지연 연결을 시도하고, 실패하면 인메모리 캐시만 사용합니다.
   */
  async ensureRedisConnection() {
    if (!this.redisEnabled) {
      return null;
    }

    if (this.redis?.status === 'ready') {
      return this.redis;
    }

    if (!this.redis) {
      const redisOptions = {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
      };

      this.redis = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, redisOptions)
        : new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT || 6379),
            password: process.env.REDIS_PASSWORD || undefined,
            db: Number(process.env.REDIS_DB || 0),
            ...redisOptions,
          });

      // Redis 장애가 나더라도 요청 자체는 인메모리 캐시로 계속 처리합니다.
      this.redis.on('error', (error) => {
        console.warn('[cacheService] Redis connection error, fallback to memory cache:', error.message);
      });
    }

    if (!this.redisConnectPromise) {
      this.redisConnectPromise = this.redis.connect()
        .catch((error) => {
          console.warn('[cacheService] Redis unavailable, using memory cache only:', error.message);
          return null;
        })
        .finally(() => {
          this.redisConnectPromise = null;
        });
    }

    await this.redisConnectPromise;
    return this.redis?.status === 'ready' ? this.redis : null;
  }

  /**
   * 값을 저장하고 같은 TTL로 만료 예약도 함께 걸어 둡니다.
   */
  async set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.ttl.set(key, expiry);

    // 별도 스위퍼 없이도 오래된 키가 남지 않도록 타이머로 정리합니다.
    setTimeout(() => {
      if (this.ttl.get(key) && Date.now() >= this.ttl.get(key)) {
        this.delete(key);
      }
    }, ttlSeconds * 1000);

    const redis = await this.ensureRedisConnection();
    if (!redis) {
      return;
    }

    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.warn('[cacheService] Redis set failed, memory cache preserved:', error.message);
    }
  }

  /**
   * 만료 여부를 먼저 확인한 뒤 살아 있는 값만 반환합니다.
   */
  async get(key) {
    const redis = await this.ensureRedisConnection();
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.cache.set(key, parsed);
          this.ttl.set(key, Date.now() + 1000);
          return parsed;
        }
      } catch (error) {
        console.warn('[cacheService] Redis get failed, fallback to memory cache:', error.message);
      }
    }

    const expiry = this.ttl.get(key);
    
    // TTL 확인
    if (expiry && Date.now() >= expiry) {
      await this.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  /**
   * 값 맵과 TTL 맵에서 같은 키를 함께 제거합니다.
   */
  async delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);

    const redis = await this.ensureRedisConnection();
    if (!redis) {
      return;
    }

    try {
      await redis.del(key);
    } catch (error) {
      console.warn('[cacheService] Redis delete failed, memory cache already cleared:', error.message);
    }
  }

  /**
   * 라우트군 무효화처럼 여러 캐시 키를 한 번에 지울 때 사용합니다.
   */
  async deletePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
      }
    }

    const redis = await this.ensureRedisConnection();
    if (!redis) {
      return;
    }

    try {
      const redisPattern = pattern
        .replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/\.\*/g, '*');
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', redisPattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.warn('[cacheService] Redis pattern delete failed:', error.message);
    }
  }

  /**
   * 인메모리 캐시를 초기화해 전체 재계산이 가능하게 만듭니다.
   */
  async clear() {
    this.cache.clear();
    this.ttl.clear();

    const redis = await this.ensureRedisConnection();
    if (!redis) {
      return;
    }

    try {
      await redis.flushdb();
    } catch (error) {
      console.warn('[cacheService] Redis clear failed:', error.message);
    }
  }

  /**
   * 현재 메모리에 살아 있는 캐시 엔트리 수를 반환합니다.
   */
  size() {
    return this.cache.size;
  }
}

/**
 * 서버 전역에서 재사용하는 인메모리 캐시 싱글톤 인스턴스입니다.
 */
const cacheService = new CacheService();

module.exports = cacheService;
