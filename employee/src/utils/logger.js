/**
 * 🔧 PERFORMANCE OPTIMIZATION: Frontend Production-Safe Logger
 * 
 * Replaces console.log statements with conditional logging
 * Only logs in development mode to improve production performance
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.log('Debug message');  // Only appears in development
 *   logger.error('Error message'); // Always appears
 */

const isDevelopment = import.meta.env.MODE !== 'production';
const isVerbose = import.meta.env.VITE_VERBOSE_LOGGING === 'true';

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
  },

  /**
   * Group logging - only in development
   * @param {string} label - Group label
   */
  group: (label) => {
    if (isDevelopment || isVerbose) {
      console.group(label);
    }
  },

  /**
   * End group logging
   */
  groupEnd: () => {
    if (isDevelopment || isVerbose) {
      console.groupEnd();
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
  
  const start = performance.now();
  logger.log(`⏱️  [PERF] ${label} - Started`);
  
  return () => {
    const duration = performance.now() - start;
    const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
    logger.log(`${color} [PERF] ${label} - Completed in ${duration.toFixed(2)}ms`);
  };
};

/**
 * Render logger for tracking React re-renders
 * @param {string} componentName - Name of the component
 * @param {Object} props - Component props
 */
export const renderLogger = (componentName, props = {}) => {
  if (!isDevelopment) return;
  
  logger.debug(`🔄 [RENDER] ${componentName}`, props);
};

export default logger;
