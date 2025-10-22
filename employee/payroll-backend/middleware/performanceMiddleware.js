/**
 * 🚀 PERFORMANCE OPTIMIZATION: Response Time Monitoring Middleware
 * 
 * Tracks API endpoint performance and logs slow requests
 * Helps identify performance bottlenecks
 */

import { logger } from '../utils/logger.js';

/**
 * Middleware to track response times
 * Logs warnings for slow requests (>100ms)
 * ✅ PERFORMANCE FIX: Reduced threshold from 1000ms to 100ms for aggressive monitoring
 */
export const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture when response completes
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    // Log slow requests (>100ms is considered slow for optimal UX)
    if (duration > 100) {
      logger.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Add custom header with response time
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Call original end function
    originalEnd.apply(res, args);
  };
  
  next();
};

/**
 * Middleware to add cache control headers
 * @param {number} maxAge - Cache duration in seconds
 * @returns {Function} Express middleware
 */
export const cacheControl = (maxAge = 300) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

/**
 * Middleware to add "no-cache" headers for dynamic content
 */
export const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

/**
 * Cache helper middleware
 * Checks cache before processing request
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      // Import cache from server.js
      const { cache } = await import('../server.js');
      const cachedResponse = cache.get(key);
      
      if (cachedResponse) {
        logger.debug(`✅ Cache HIT: ${req.originalUrl}`);
        return res.json(cachedResponse);
      }
      
      logger.debug(`❌ Cache MISS: ${req.originalUrl}`);
      
      // Store original json function
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        cache.set(key, data, ttl);
        originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Database query performance logger
 * Wraps Mongoose queries to log slow operations
 */
export const logSlowQueries = () => {
  // This would be added to mongoose plugins
  return function(schema) {
    schema.pre('find', function() {
      this._startTime = Date.now();
    });
    
    schema.post('find', function() {
      const duration = Date.now() - this._startTime;
      if (duration > 500) {
        logger.warn(`🐌 SLOW QUERY: ${this.mongooseCollection.name}.find() took ${duration}ms`);
      }
    });
    
    schema.pre('findOne', function() {
      this._startTime = Date.now();
    });
    
    schema.post('findOne', function() {
      const duration = Date.now() - this._startTime;
      if (duration > 500) {
        logger.warn(`🐌 SLOW QUERY: ${this.mongooseCollection.name}.findOne() took ${duration}ms`);
      }
    });
  };
};

export default {
  responseTimeMiddleware,
  cacheControl,
  noCache,
  cacheMiddleware,
  logSlowQueries
};
