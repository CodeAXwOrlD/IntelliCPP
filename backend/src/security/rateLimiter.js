/**
 * Token Bucket & Concurrency Rate Limiter for IntelliCPP
 * Provides burst capacity, continuous token refill, per-IP tracking,
 * and concurrent compilation throttling (semaphore).
 *
 * Designed with a pluggable Store architecture (MemoryBucketStore / RedisBucketStore)
 * so multiple server instances behind a load balancer can share state.
 */

/**
 * In-memory state store for single-instance / development
 */
class MemoryBucketStore {
  constructor() {
    this.buckets = new Map();
  }

  async getBucket(ip, capacity, now) {
    let bucket = this.buckets.get(ip);
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        activeExecutions: 0
      };
      this.buckets.set(ip, bucket);
    }
    return bucket;
  }

  async saveBucket(ip, bucket) {
    this.buckets.set(ip, bucket);
  }

  async decrementActive(ip) {
    const bucket = this.buckets.get(ip);
    if (bucket) {
      bucket.activeExecutions = Math.max(0, bucket.activeExecutions - 1);
    }
  }

  cleanup(maxIdleTimeMs) {
    const now = Date.now();
    for (const [ip, bucket] of this.buckets.entries()) {
      if (bucket.activeExecutions === 0 && (now - bucket.lastRefill) > maxIdleTimeMs) {
        this.buckets.delete(ip);
      }
    }
  }
}

/**
 * Redis-backed store stub for horizontal scaling across multiple server instances.
 * In a multi-node deployment, replace MemoryBucketStore with RedisBucketStore:
 * - Uses atomic Lua script or Redis Hashes (HSET / HGET / INCRBY)
 * - Sets automatic key expiration (TTL) eliminating manual cleanup intervals
 */
class RedisBucketStore {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async getBucket(ip, capacity, now) {
    if (!this.redis) throw new Error('Redis client not configured for RedisBucketStore');
    // Implementation: Fetch hash or evaluate atomic Lua refill script
    return null;
  }

  async saveBucket(ip, bucket) {
    if (!this.redis) throw new Error('Redis client not configured for RedisBucketStore');
  }

  async decrementActive(ip) {
    if (!this.redis) throw new Error('Redis client not configured for RedisBucketStore');
  }
}

class TokenBucketLimiter {
  /**
   * @param {Object} options
   * @param {number} options.capacity - Max tokens bucket can hold (burst capacity)
   * @param {number} options.refillRatePerSec - Tokens added per second
   * @param {number} options.maxConcurrentPerIp - Maximum simultaneous executions per IP
   * @param {number} [options.costPerRequest=1] - Tokens consumed per request
   * @param {string} [options.message] - Custom 429 error message
   * @param {Object} [options.store] - State store instance (defaults to MemoryBucketStore)
   */
  constructor({
    capacity = 5,
    refillRatePerSec = 0.166, // 1 token every 6s => ~10 runs per minute
    maxConcurrentPerIp = 2,
    costPerRequest = 1,
    message = 'Too many execution requests. Please wait a moment before trying again.',
    store = null
  } = {}) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.maxConcurrentPerIp = maxConcurrentPerIp;
    this.costPerRequest = costPerRequest;
    this.message = message;
    this.store = store || new MemoryBucketStore();

    // Garbage collection for in-memory store
    if (typeof this.store.cleanup === 'function') {
      this.gcInterval = setInterval(() => this.store.cleanup(10 * 60 * 1000), 5 * 60 * 1000);
      if (this.gcInterval.unref) {
        this.gcInterval.unref();
      }
    }
  }

  /**
   * Extract client IP address safely
   */
  getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '127.0.0.1';
  }

  /**
   * Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      const ip = this.getClientIp(req);
      const now = Date.now();
      const bucket = await this.store.getBucket(ip, this.capacity, now);

      // Refill tokens based on elapsed time
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      if (elapsedSeconds > 0) {
        const addedTokens = elapsedSeconds * this.refillRatePerSec;
        bucket.tokens = Math.min(this.capacity, bucket.tokens + addedTokens);
        bucket.lastRefill = now;
      }

      // 1. Check Concurrency Limit (active compiling/executing processes)
      if (bucket.activeExecutions >= this.maxConcurrentPerIp) {
        res.set('Retry-After', '2');
        return res.status(429).json({
          success: false,
          error: `Concurrency limit reached (${this.maxConcurrentPerIp} simultaneous executions). Please wait for your current execution to finish.`,
          code: 'CONCURRENCY_LIMIT_EXCEEDED'
        });
      }

      // 2. Check Token Bucket
      if (bucket.tokens < this.costPerRequest) {
        const needed = this.costPerRequest - bucket.tokens;
        const retryAfterSec = Math.max(1, Math.ceil(needed / this.refillRatePerSec));

        res.set('X-RateLimit-Limit', String(this.capacity));
        res.set('X-RateLimit-Remaining', '0');
        res.set('Retry-After', String(retryAfterSec));

        return res.status(429).json({
          success: false,
          error: `${this.message} (Refill in ${retryAfterSec}s)`,
          retryAfter: retryAfterSec,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // 3. Consume token & increment active execution
      bucket.tokens -= this.costPerRequest;
      bucket.activeExecutions += 1;
      await this.store.saveBucket(ip, bucket);

      res.set('X-RateLimit-Limit', String(this.capacity));
      res.set('X-RateLimit-Remaining', String(Math.max(0, Math.floor(bucket.tokens))));

      // Release active execution counter when response finishes or closes
      let released = false;
      const release = async () => {
        if (!released) {
          released = true;
          await this.store.decrementActive(ip);
        }
      };

      res.on('finish', release);
      res.on('close', release);

      next();
    };
  }
}

module.exports = {
  TokenBucketLimiter,
  MemoryBucketStore,
  RedisBucketStore
};
