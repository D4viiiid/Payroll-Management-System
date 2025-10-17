/**
 * 🛠️ DEBOUNCE UTILITY
 * Delays function execution until after a specified wait time has elapsed
 * since the last time the function was invoked.
 * 
 * Use for: Search inputs, filter fields, window resize events
 */

/**
 * Creates a debounced function that delays invoking func until after
 * wait milliseconds have elapsed since the last time it was invoked.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay (default: 300ms)
 * @param {boolean} immediate - If true, trigger function on leading edge instead of trailing
 * @returns {Function} Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   fetchSearchResults(query);
 * }, 300);
 * 
 * // In React component:
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export const debounce = (func, wait = 300, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

/**
 * Creates a throttled function that only invokes func at most once per
 * every wait milliseconds.
 * 
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle (default: 300ms)
 * @returns {Function} Throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = (func, wait = 300) => {
  let inThrottle;
  let lastTime;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
};

/**
 * Cancels a debounced or throttled function
 * 
 * @param {Function} func - The debounced/throttled function
 */
export const cancel = (func) => {
  if (func.cancel) {
    func.cancel();
  }
};

/**
 * React Hook: useDebounce
 * Returns a debounced value that only updates after the specified delay
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {any} Debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * React Hook: useDebouncedCallback
 * Returns a memoized debounced callback
 * 
 * @param {Function} callback - The callback function to debounce
 * @param {number} delay - The delay in milliseconds
 * @param {Array} deps - Dependencies array for useCallback
 * @returns {Function} Debounced callback
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query) => {
 *     fetchResults(query);
 *   },
 *   300,
 *   []
 * );
 */
import { useCallback, useRef } from 'react';

export const useDebouncedCallback = (callback, delay = 300, deps = []) => {
  const timeoutRef = useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );
};

export default {
  debounce,
  throttle,
  cancel,
  useDebounce,
  useDebouncedCallback
};
