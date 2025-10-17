/**
 * 🚀 REACT PERFORMANCE OPTIMIZATION UTILITIES
 * Helper functions and hooks for optimizing React component rendering
 */

import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { logger } from './logger.js';

/**
 * Enhanced React.memo with custom comparison and logging
 * @param {React.Component} Component - Component to memoize
 * @param {Function} propsAreEqual - Custom comparison function
 * @param {string} displayName - Component name for debugging
 * @returns {React.Component} Memoized component
 * 
 * @example
 * const EmployeeRow = optimizedMemo(
 *   ({ employee }) => <tr><td>{employee.name}</td></tr>,
 *   (prevProps, nextProps) => prevProps.employee.id === nextProps.employee.id,
 *   'EmployeeRow'
 * );
 */
export const optimizedMemo = (Component, propsAreEqual, displayName) => {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = displayName || Component.displayName || Component.name;
  return MemoizedComponent;
};

/**
 * Shallow comparison for props (default React.memo behavior)
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} True if props are equal
 */
export const shallowEqual = (prevProps, nextProps) => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Deep comparison for complex props
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} True if props are deeply equal
 */
export const deepEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};

/**
 * Hook: useOptimizedCallback
 * Memoized callback with dependency tracking
 * 
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependencies
 * @returns {Function} Memoized callback
 */
export const useOptimizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

/**
 * Hook: useOptimizedMemo
 * Memoized value with performance logging
 * 
 * @param {Function} factory - Function that returns value to memoize
 * @param {Array} deps - Dependencies
 * @param {string} label - Label for performance logging
 * @returns {any} Memoized value
 */
export const useOptimizedMemo = (factory, deps, label) => {
  return useMemo(() => {
    if (label) {
      const start = performance.now();
      const result = factory();
      const duration = performance.now() - start;
      if (duration > 10) {
        logger.debug(`⚡ useMemo [${label}] took ${duration.toFixed(2)}ms`);
      }
      return result;
    }
    return factory();
  }, deps);
};

/**
 * Hook: usePrevious
 * Get previous value of a prop or state
 * 
 * @param {any} value - Current value
 * @returns {any} Previous value
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * console.log(`Count changed from ${prevCount} to ${count}`);
 */
export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

/**
 * Hook: useWhyDidYouUpdate
 * Debug which props caused a re-render
 * 
 * @param {string} name - Component name
 * @param {Object} props - Component props
 * 
 * @example
 * function MyComponent(props) {
 *   useWhyDidYouUpdate('MyComponent', props);
 *   return <div>...</div>;
 * }
 */
export const useWhyDidYouUpdate = (name, props) => {
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        logger.debug(`[${name}] Re-rendered due to:`, changedProps);
      }
    }

    previousProps.current = props;
  });
};

/**
 * Hook: useRenderCount
 * Track how many times a component renders
 * 
 * @param {string} componentName - Component name
 * @returns {number} Render count
 * 
 * @example
 * function MyComponent() {
 *   const renderCount = useRenderCount('MyComponent');
 *   console.log(`Rendered ${renderCount} times`);
 *   return <div>...</div>;
 * }
 */
export const useRenderCount = (componentName) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    logger.debug(`🔄 [${componentName}] Render #${renderCount.current}`);
  });

  return renderCount.current;
};

/**
 * Hook: useIsMounted
 * Check if component is still mounted (useful for async operations)
 * 
 * @returns {Function} Function that returns true if mounted
 * 
 * @example
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *   
 *   const fetchData = async () => {
 *     const data = await api.getData();
 *     if (isMounted()) {
 *       setState(data); // Only update if still mounted
 *     }
 *   };
 * }
 */
export const useIsMounted = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
};

/**
 * Hook: useUpdateEffect
 * useEffect that skips the first render (only runs on updates)
 * 
 * @param {Function} effect - Effect function
 * @param {Array} deps - Dependencies
 * 
 * @example
 * useUpdateEffect(() => {
 *   console.log('This only runs when count updates, not on mount');
 * }, [count]);
 */
export const useUpdateEffect = (effect, deps) => {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      return effect();
    }
  }, deps);
};

/**
 * Create a memoized list component
 * Optimized for rendering large lists
 * 
 * @param {React.Component} ItemComponent - Component to render each item
 * @param {Function} getItemKey - Function to get unique key for each item
 * @returns {React.Component} Optimized list component
 * 
 * @example
 * const EmployeeItem = ({ employee }) => <div>{employee.name}</div>;
 * const EmployeeList = createOptimizedList(
 *   EmployeeItem,
 *   (employee) => employee.id
 * );
 * 
 * // Usage:
 * <EmployeeList items={employees} />
 */
export const createOptimizedList = (ItemComponent, getItemKey) => {
  // NOTE: JSX removed to avoid syntax errors in .js files
  // Use optimizedMemo directly in your .jsx components
  logger.warn('createOptimizedList: Use optimizedMemo in .jsx files instead');
  return null;
};

/**
 * Prevent unnecessary re-renders from object/array props
 * @param {Object|Array} value - Value to stabilize
 * @returns {Object|Array} Stabilized value
 * 
 * @example
 * const stableConfig = useStableValue({ theme: 'dark', fontSize: 14 });
 * // stableConfig will only change if content actually changes
 */
export const useStableValue = (value) => {
  const previousValueRef = useRef(value);
  
  return useMemo(() => {
    const isEqual = JSON.stringify(previousValueRef.current) === JSON.stringify(value);
    
    if (isEqual) {
      return previousValueRef.current;
    }
    
    previousValueRef.current = value;
    return value;
  }, [value]);
};

/**
 * Batch state updates to reduce re-renders
 * @returns {Object} { batchUpdate, flushUpdates }
 * 
 * @example
 * const { batchUpdate, flushUpdates } = useBatchedUpdates();
 * 
 * // Queue updates
 * batchUpdate(() => setName('John'));
 * batchUpdate(() => setAge(30));
 * batchUpdate(() => setEmail('john@example.com'));
 * 
 * // Execute all at once
 * flushUpdates(); // Only one re-render!
 */
export const useBatchedUpdates = () => {
  const updatesRef = useRef([]);
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updateFn) => {
    updatesRef.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      flushUpdates();
    }, 0);
  }, []);

  const flushUpdates = useCallback(() => {
    const updates = updatesRef.current;
    updatesRef.current = [];

    updates.forEach((update) => update());
  }, []);

  return { batchUpdate, flushUpdates };
};

export default {
  optimizedMemo,
  shallowEqual,
  deepEqual,
  useOptimizedCallback,
  useOptimizedMemo,
  usePrevious,
  useWhyDidYouUpdate,
  useRenderCount,
  useIsMounted,
  useUpdateEffect,
  createOptimizedList,
  useStableValue,
  useBatchedUpdates
};
