/**
 * 🔄 REQUEST DEDUPLICATION UTILITY
 * Prevents duplicate API requests from being sent simultaneously
 * Improves performance by sharing pending requests
 */

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Deduplicate a request by its key
   * If a request with the same key is already pending, return that promise
   * Otherwise, execute the request and cache it
   * 
   * @param {string} key - Unique identifier for the request
   * @param {Function} requestFn - Function that returns a promise
   * @param {number} cacheDuration - How long to cache the result (ms)
   * @returns {Promise} The request promise
   * 
   * @example
   * const deduplicator = new RequestDeduplicator();
   * 
   * // Multiple calls to getEmployees() will only trigger one API request
   * const employees1 = await deduplicator.dedupe('employees', () => fetch('/api/employees'));
   * const employees2 = await deduplicator.dedupe('employees', () => fetch('/api/employees'));
   * // employees1 and employees2 will be the same, but only one fetch was made
   */
  async dedupe(key, requestFn, cacheDuration = 5000) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Reusing pending request for: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Execute the request
    const promise = requestFn()
      .then(result => {
        // Cache result for short duration
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, cacheDuration);
        return result;
      })
      .catch(error => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, promise);
    
    return promise;
  }

  /**
   * Clear a specific cached request
   * @param {string} key - The request key to clear
   */
  clear(key) {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all cached requests
   */
  clearAll() {
    this.pendingRequests.clear();
  }

  /**
   * Check if a request is pending
   * @param {string} key - The request key
   * @returns {boolean}
   */
  isPending(key) {
    return this.pendingRequests.has(key);
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * React Hook: useDeduplicatedFetch
 * Automatically deduplicates fetch requests in React components
 * 
 * @param {string} key - Unique key for the request
 * @param {Function} fetchFn - Function that performs the fetch
 * @param {Array} deps - Dependencies that trigger refetch
 * @returns {Object} { data, loading, error, refetch }
 * 
 * @example
 * function EmployeeList() {
 *   const { data, loading, error } = useDeduplicatedFetch(
 *     'employees',
 *     () => fetch('/api/employees').then(r => r.json()),
 *     []
 *   );
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   return <div>{data.map(emp => <div key={emp.id}>{emp.name}</div>)}</div>;
 * }
 */
import { useState, useEffect, useCallback } from 'react';

export const useDeduplicatedFetch = (key, fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await requestDeduplicator.dedupe(key, fetchFn);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  const refetch = useCallback(() => {
    requestDeduplicator.clear(key);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Wrapper for fetch API with automatic deduplication
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} deduplicate - Whether to deduplicate (default: true)
 * @returns {Promise} Fetch promise
 * 
 * @example
 * // These two calls will only trigger one network request
 * const data1 = await deduplicatedFetch('/api/employees');
 * const data2 = await deduplicatedFetch('/api/employees');
 */
export const deduplicatedFetch = async (url, options = {}, deduplicate = true) => {
  if (!deduplicate || options.method !== 'GET') {
    return fetch(url, options);
  }

  const key = `${options.method || 'GET'}:${url}`;
  return requestDeduplicator.dedupe(key, () => fetch(url, options));
};

/**
 * Clear cache for specific endpoints (useful after mutations)
 * 
 * @param {string|Array} keys - Key or array of keys to invalidate
 * 
 * @example
 * // After creating an employee, invalidate the employees list
 * await createEmployee(data);
 * invalidateCache(['employees', 'GET:/api/employees']);
 */
export const invalidateCache = (keys) => {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  keyArray.forEach(key => requestDeduplicator.clear(key));
};

/**
 * Create a cache key from URL and params
 * @param {string} url - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 * 
 * @example
 * const key = createCacheKey('/api/employees', { page: 1, limit: 50 });
 * // Returns: "/api/employees?page=1&limit=50"
 */
export const createCacheKey = (url, params = {}) => {
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return queryString ? `${url}?${queryString}` : url;
};

export default {
  RequestDeduplicator,
  requestDeduplicator,
  useDeduplicatedFetch,
  deduplicatedFetch,
  invalidateCache,
  createCacheKey
};
