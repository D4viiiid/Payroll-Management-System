/**
 * 🚀 Cache Middleware
 * Adds Cache-Control headers to responses
 * Implements server-side caching with node-cache
 */

/**
 * Set Cache-Control headers based on route type
 * @param {number} maxAge - Maximum age in seconds
 * @param {boolean} isPrivate - Whether cache is private (user-specific)
 */
export const setCacheHeaders = (maxAge = 300, isPrivate = false) => {
  return (req, res, next) => {
    const cacheType = isPrivate ? 'private' : 'public';
    res.set('Cache-Control', `${cacheType}, max-age=${maxAge}`);
    next();
  };
};

/**
 * Cache middleware for frequently accessed data
 * Uses node-cache for server-side caching
 */
export const cacheMiddleware = (cache) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedBody = cache.get(key);

    if (cachedBody) {
      // Return cached response
      res.set('X-Cache', 'HIT');
      return res.send(cachedBody);
    }

    // Store original res.send
    const originalSend = res.send.bind(res);

    // Override res.send
    res.send = (body) => {
      // Cache successful responses (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body);
      }
      res.set('X-Cache', 'MISS');
      return originalSend(body);
    };

    next();
  };
};

/**
 * Clear cache for specific routes
 * @param {NodeCache} cache - Cache instance
 * @param {string[]} patterns - Array of URL patterns to clear
 */
export const clearCache = (cache, patterns = []) => {
  return (req, res, next) => {
    // Clear cache on POST, PUT, PATCH, DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (patterns.length === 0) {
        // Clear all cache
        cache.flushAll();
      } else {
        // Clear specific patterns
        const keys = cache.keys();
        keys.forEach(key => {
          patterns.forEach(pattern => {
            if (key.includes(pattern)) {
              cache.del(key);
            }
          });
        });
      }
    }
    next();
  };
};

/**
 * No-cache middleware for sensitive routes
 */
export const noCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
};

export default {
  setCacheHeaders,
  cacheMiddleware,
  clearCache,
  noCache
};
