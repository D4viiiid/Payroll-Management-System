/**
 * 🔧 PERFORMANCE OPTIMIZATION: Production-Safe Logger
 * 
 * Replaces console.log statements with conditional logging
 * Only logs in development mode to improve production performance
 * 
 * Usage:
 *   import { logger } from './utils/logger.js';
 *   logger.log('Debug message');  // Only appears in development
 *   logger.error('Error message'); // Always appears
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVerbose = process.env.VERBOSE_LOGGING === 'true';

export const logger = {
  /**
   * General logging - only in development
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (isDevelopment || isVerbose) {
      console.log(...args);
    }
  },

  /**
   * Error logging - always enabled
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Warning logging - only in development
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (isDevelopment || isVerbose) {
      console.warn(...args);
    }
  },

  /**
   * Info logging - only in development
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (isDevelopment || isVerbose) {
      console.info(...args);
    }
  },

  /**
   * Debug logging - only in development with verbose flag
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (isDevelopment && isVerbose) {
      console.debug(...args);
    }
  }
};

/**
 * Performance logger for measuring execution time
 * @param {string} label - Label for the operation
 * @returns {Function} - End function to call when operation completes
 */
export const perfLogger = (label) => {
  if (!isDevelopment) return () => {};
  
  const start = Date.now();
  logger.log(`⏱️  [PERF] ${label} - Started`);
  
  return () => {
    const duration = Date.now() - start;
    const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
    logger.log(`${color} [PERF] ${label} - Completed in ${duration}ms`);
  };
};

export default logger;
