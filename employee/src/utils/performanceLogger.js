// 🚀 PERFORMANCE: Disable console.log in production
const isDevelopment = import.meta.env.MODE === 'development';

// Create a conditional console object
export const performanceLogger = {
  log: (...args) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args) => {
    console.error(...args); // Always log errors
  },
  warn: (...args) => {
    if (isDevelopment) console.warn(...args);
  },
  info: (...args) => {
    if (isDevelopment) console.info(...args);
  }
};

// Override global console in production
if (!isDevelopment) {
  const noop = () => {};
  window.console.log = noop;
  window.console.info = noop;
  window.console.warn = noop;
  // Keep console.error for debugging
}
