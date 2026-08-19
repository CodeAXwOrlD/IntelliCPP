/**
 * In-Memory LRU (Least Recently Used) Cache with TTL support
 * Used for deterministic caching of autocomplete suggestions and parsing stats.
 */

class LRUCache {
  /**
   * @param {Object} options
   * @param {number} [options.capacity=1000] - Max number of entries
   * @param {number} [options.ttlMs=300000] - Time to live in ms (default: 5 minutes)
   */
  constructor({ capacity = 1000, ttlMs = 5 * 60 * 1000 } = {}) {
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieve item from cache, refreshing its recency
   * Returns null if key does not exist or has expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const item = this.cache.get(key);
    const now = Date.now();

    // Check expiration
    if (now > item.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Refresh recency (re-insert at the end of the Map)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;
    return item.value;
  }

  /**
   * Set item in cache, evicting oldest item if capacity is reached
   */
  set(key, value, customTtlMs = null) {
    if (!key) return;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = customTtlMs !== null ? customTtlMs : this.ttlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0.0%'
    };
  }
}

module.exports = {
  LRUCache
};
