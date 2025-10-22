/**
 * 🚀 PERFORMANCE OPTIMIZATION: Production Logger Utility
 * 
 * Conditional logging that:
 * - Disables all console.log in production (NODE_ENV=production)
 * - Keeps critical error logging always enabled
 * - Provides zero-overhead no-op functions in production
 * 
 * Usage:
 * import { logger } from './utils/productionLogger.js';
 * logger.log('Debug info');    // Only in development
 * logger.error('Error!');      // Always logged
 * logger.warn('Warning!');     // Only in development
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * No-operation function (does nothing)
 * Zero performance overhead
 */
const noop = () => {};

/**
 * Production-safe logger
 * In production: console.log/info/warn are disabled
 * In development: all logging enabled
 */
export const logger = {
  // Debug logging - disabled in production
  log: isProduction ? noop : console.log.bind(console),
  info: isProduction ? noop : console.info.bind(console),
  warn: isProduction ? noop : console.warn.bind(console),
  debug: isProduction ? noop : console.debug.bind(console),
  
  // Error logging - always enabled (critical for debugging)
  error: console.error.bind(console),
  
  // Table logging - disabled in production
  table: isProduction ? noop : console.table.bind(console),
};

/**
 * Override global console in production
 * This catches any console.log that weren't replaced with logger
 */
if (isProduction) {
  global.console.log = noop;
  global.console.info = noop;
  global.console.warn = noop;
  global.console.debug = noop;
  // Keep console.error for critical errors
}

export default logger;
