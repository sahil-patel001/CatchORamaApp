import { asyncHandler } from "./errorHandler.js";

// Simple in-memory cache
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    this.maxSize = 1000; // Maximum number of cached items
  }

  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const cache = new MemoryCache();

// Clean up expired entries every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in milliseconds
 * @param {function} keyGenerator - Function to generate cache key from request
 */
export const cacheMiddleware = (ttl = 5 * 60 * 1000, keyGenerator = null) => {
  return asyncHandler(async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `${req.originalUrl}:${JSON.stringify(req.query)}:${
          req.user?.id || "anonymous"
        }:${req.user?.role || "none"}`;

    // Try to get cached response
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        _cached: true,
        _cacheKey:
          process.env.NODE_ENV === "development" ? cacheKey : undefined,
      });
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function (data) {
      // Only cache successful responses
      if (res.statusCode === 200 && data.success !== false) {
        cache.set(cacheKey, data, ttl);
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  });
};

/**
 * Cache invalidation middleware - clears cache entries based on patterns
 * @param {string|array} patterns - Cache key patterns to invalidate
 */
export const invalidateCache = (patterns) => {
  return asyncHandler(async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to invalidate cache after successful operations
    res.json = function (data) {
      // Only invalidate on successful operations
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        data.success !== false
      ) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

        // Invalidate cache entries matching patterns
        for (const [key] of cache.cache.entries()) {
          for (const pattern of patternsArray) {
            if (key.includes(pattern)) {
              cache.delete(key);
            }
          }
        }
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  });
};

/**
 * Dashboard cache middleware - longer TTL for dashboard data
 */
export const dashboardCache = cacheMiddleware(10 * 60 * 1000, (req) => {
  return `dashboard:${req.route.path}:${JSON.stringify(req.query)}:${
    req.user?.id
  }:${req.user?.role}`;
});

/**
 * Product list cache middleware
 */
export const productListCache = cacheMiddleware(3 * 60 * 1000, (req) => {
  return `products:list:${JSON.stringify(req.query)}:${req.user?.id}:${
    req.user?.role
  }`;
});

/**
 * Order list cache middleware
 */
export const orderListCache = cacheMiddleware(2 * 60 * 1000, (req) => {
  return `orders:list:${JSON.stringify(req.query)}:${req.user?.id}:${
    req.user?.role
  }`;
});

/**
 * Vendor cache invalidation patterns
 */
export const invalidateVendorCache = invalidateCache([
  "vendors:",
  "dashboard:",
  "users:",
]);

/**
 * Product cache invalidation patterns
 */
export const invalidateProductCache = invalidateCache([
  "products:",
  "dashboard:",
]);

/**
 * Order cache invalidation patterns
 */
export const invalidateOrderCache = invalidateCache([
  "orders:",
  "dashboard:",
  "products:",
]);

// Export cache instance for manual operations
export { cache };
