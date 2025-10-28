// apiService.js - Centralized API service for all database connections
import { showSuccess, showError, showInfo } from '../utils/toast';
import { logger } from '../utils/logger.js';
import { requestDeduplicator, createCacheKey } from '../utils/requestDeduplication.js';

// Base API URLs
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Event bus for real-time updates
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.removeListener(event, listener);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(data));
  }

  removeListener(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
}

export const eventBus = new EventEmitter();

// Error handling
const handleApiError = (error, customMessage = 'An error occurred') => {
  logger.error('API Error:', error);
  const errorMessage = error.message || customMessage;
  // Don't show toast for 404 errors to avoid spam
  if (!errorMessage.includes('404')) {
    showError(errorMessage);
  }
  return { error: errorMessage };
};

// Generic fetch function with error handling
const fetchApi = async (url, options = {}) => {
  try {
    // ✅ CRITICAL FIX: Get JWT token from localStorage
    const token = localStorage.getItem('token');
    
    // ✅ CRITICAL FIX: Add cache-busting headers to prevent browser HTTP caching
    const defaultHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // ✅ CRITICAL FIX: Add Authorization header if token exists
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };
    
    const response = await fetch(url, mergedOptions);
    
    // ✅ CRITICAL FIX: Handle 401 Unauthorized globally
    // If session expired or token invalid, clear storage and redirect to login
    if (response.status === 401) {
      console.error('🔒 Authentication failed (401) - Session expired or invalid token');
      
      // ✅ FIX v1.0.4: Only clear authentication-related data, not everything
      // OLD: localStorage.clear() - TOO AGGRESSIVE, deleted ALL data
      // NEW: Selective removal - only delete auth-related items
      localStorage.removeItem('token');
      localStorage.removeItem('currentEmployee');
      localStorage.removeItem('userRole');
      console.warn('🗑️ Cleared authentication data (token, currentEmployee, userRole)');
      
      // Show user-friendly error message
      showError('Session expired. Please login again.', {
        position: 'top-center',
        autoClose: 3000
      });
      
      // Redirect to home page (login) after short delay
      setTimeout(() => {
        window.location.href = '/?session=expired';
      }, 1500);
      
      throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

// Employee API functions
export const employeeApi = {
  // Get all employees with pagination
  getAll: async (params = {}) => {
    const { page = 1, limit = 50, bypassCache = false } = params;
    
    // ✅ CRITICAL FIX: Add timestamp to URL to bust browser HTTP cache
    const timestamp = Date.now();
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/employees`, { page, limit, _t: timestamp });
    
    console.log(`🔍 employeeApi.getAll: Called with bypassCache=${bypassCache}, cacheKey=${cacheKey}`);
    
    // ✅ FIX: If bypassCache is true, clear cache first and don't use deduplication
    if (bypassCache) {
      console.log('⚡ employeeApi.getAll: Bypassing cache, clearing and fetching fresh data');
      requestDeduplicator.clearAll(); // Clear all to be safe
      const data = await fetchApi(`${cacheKey}`);
      if (!data.error) {
        console.log('✅ employeeApi.getAll: Fresh data fetched, emitting employees-updated event');
        eventBus.emit('employees-updated', data);
      } else {
        console.error('❌ employeeApi.getAll: Error fetching data:', data.error);
      }
      console.log('✅ employeeApi.getAll: Fresh data fetched (bypassed cache), returning', Array.isArray(data) ? data.length : (data.data?.length || 0), 'employees');
      return data;
    }
    
    console.log('🔄 employeeApi.getAll: Using dedupe with cache');
    const fetchFn = async () => {
      return await fetchApi(`${cacheKey}`);
    };
    
    const data = await requestDeduplicator.dedupe(cacheKey, fetchFn, 10000);
    
    if (!data.error) {
      console.log('✅ employeeApi.getAll: Data fetched from cache/fresh, emitting employees-updated event');
      eventBus.emit('employees-updated', data);
    }
    console.log('✅ employeeApi.getAll: Returning', Array.isArray(data) ? data.length : (data.data?.length || 0), 'employees');
    return data;
  },
  
  // Get employee by ID
  getById: async (id) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/${id}`);
  },
  
  // Create new employee
  create: async (employeeData) => {
    console.log('🚀 apiService.create: Starting employee creation...', employeeData);
    const data = await fetchApi(`${BACKEND_API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    
    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL possible employee list cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      console.log('🎯 apiService.create: About to emit employee-created event');
      console.log('🔥 EVENT BUS STATE:', eventBus.events);
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('employee-created', data);
      console.log('✅ apiService.create: Event employee-created emitted with data:', data);
      
      // ✅ ADDITIONAL: Also trigger a manual refresh via employees-updated event
      setTimeout(async () => {
        console.log('⏰ apiService.create: Triggering delayed refresh...');
        const freshData = await fetchApi(`${BACKEND_API_URL}/employees?page=1&limit=50`);
        if (!freshData.error) {
          eventBus.emit('employees-updated', freshData);
          console.log('✅ apiService.create: Delayed employees-updated event emitted');
        }
      }, 100);
    } else {
      console.error('❌ apiService.create: Error creating employee:', data.error);
    }
    
    return data;
  },
  
  // Update employee
  update: async (id, employeeData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    
    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL possible employee list cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('employee-updated', data);
    }
    
    return data;
  },
  
  // Delete employee
  delete: async (id) => {
    console.log('🗑️ apiService.delete: Starting employee deletion for ID:', id);
    const data = await fetchApi(`${BACKEND_API_URL}/employees/${id}`, {
      method: 'DELETE'
    });

    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL possible employee list cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      console.log('🎯 apiService.delete: About to emit employee-deleted event for ID:', id);
      console.log('🔥 EVENT BUS STATE:', eventBus.events);
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('employee-deleted', { id });
      console.log('✅ apiService.delete: Event employee-deleted emitted for ID:', id);
      
      // ✅ ADDITIONAL: Also trigger a manual refresh via employees-updated event
      setTimeout(async () => {
        console.log('⏰ apiService.delete: Triggering delayed refresh...');
        const freshData = await fetchApi(`${BACKEND_API_URL}/employees?page=1&limit=50`);
        if (!freshData.error) {
          eventBus.emit('employees-updated', freshData);
          console.log('✅ apiService.delete: Delayed employees-updated event emitted');
        }
      }, 100);
    } else {
      console.error('❌ apiService.delete: Error deleting employee:', data.error);
    }

    return data;
  },

  // Employee login
  login: async (credentials) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  },

  // Verify admin PIN
  verifyPin: async (employeeId, pin) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/admin/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, pin })
    });
  },

  // Change password
  changePassword: async (id, passwordData) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/${id}/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    });
  },

  // Update profile picture
  updateProfilePicture: async (employeeId, profilePictureData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/employees/${employeeId}/profile-picture`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilePicture: profilePictureData })
    });
    
    if (!data.error) {
      eventBus.emit('profile-picture-updated', data);
    }
    
    return data;
  }
};

// Attendance API functions
export const attendanceApi = {
  // Get all attendance records
  getAll: async (params = {}) => {
    const { page = 1, limit = 50, bypassCache = false } = params;
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/attendance`, { page, limit });
    
    // ✅ FIX: If bypassCache is true, clear cache first and don't use deduplication
    if (bypassCache) {
      requestDeduplicator.clear(cacheKey);
      const data = await fetchApi(`${BACKEND_API_URL}/attendance?page=${page}&limit=${limit}`);
      if (!data.error) {
        eventBus.emit('attendance-updated', data);
      }
      return data;
    }
    
    const fetchFn = async () => await fetchApi(`${BACKEND_API_URL}/attendance?page=${page}&limit=${limit}`);
    const data = await requestDeduplicator.dedupe(cacheKey, fetchFn, 10000);
    if (!data.error) {
      eventBus.emit('attendance-updated', data);
    }
    return data;
  },

  // Get attendance statistics
  getStats: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `${BACKEND_API_URL}/attendance/stats${queryParams ? `?${queryParams}` : ''}`;
    // ✅ CRITICAL FIX: Disable caching for stats - they need to be real-time
    // Stats can change frequently (new attendance, updated records)
    // Always fetch fresh data from server
    return await fetchApi(url);
  },
  
  // Get attendance by employee ID
  getByEmployeeId: async (employeeId) => {
    return await fetchApi(`${BACKEND_API_URL}/attendance/${employeeId}`);
  },
  
  // Record new attendance
  record: async (attendanceData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceData)
    });
    
    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL attendance cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('attendance-recorded', data);
    }
    
    return data;
  }
};

// Salary API functions
export const salaryApi = {
  // Get all salaries
  getAll: async (params = {}) => {
    const { page = 1, limit = 50, bypassCache = false } = params;
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/salary`, { page, limit });
    
    // ✅ FIX: If bypassCache is true, clear cache first and don't use deduplication
    if (bypassCache) {
      requestDeduplicator.clear(cacheKey);
      const data = await fetchApi(`${BACKEND_API_URL}/salary?page=${page}&limit=${limit}`);
      if (!data.error) {
        eventBus.emit('salaries-updated', data);
      }
      return data;
    }
    
    const fetchFn = async () => await fetchApi(`${BACKEND_API_URL}/salary?page=${page}&limit=${limit}`);
    const data = await requestDeduplicator.dedupe(cacheKey, fetchFn, 10000);
    if (!data.error) {
      eventBus.emit('salaries-updated', data);
    }
    return data;
  },

  // Create new salary record
  create: async (salaryData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salaryData)
    });

    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL salary cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('salary-created', data);
    }

    return data;
  },

  // Update salary record
  update: async (id, salaryData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/salary/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salaryData)
    });

    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL salary cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('salary-updated', data);
    }

    return data;
  },

  // Archive salary record
  archive: async (id) => {
    const data = await fetchApi(`${BACKEND_API_URL}/salary/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });

    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL salary cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('salary-archived', { id });
    }

    return data;
  },

  // Restore salary record
  restore: async (id) => {
    const data = await fetchApi(`${BACKEND_API_URL}/salary/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false })
    });

    if (!data.error) {
      // ✅ CRITICAL FIX: Clear ALL salary cache variations
      requestDeduplicator.clearAll(); // Clear everything to be safe
      
      // ✅ Emit event BEFORE fetching to ensure components are ready
      eventBus.emit('salary-restored', { id });
    }

    return data;
  }
};

// Payroll API functions
export const payrollApi = {
  // Get all payroll records
  getAll: async (page = 1, limit = 1000) => {
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/payrolls`, { page, limit });
    
    // ✅ FIX: Use requestDeduplicator.dedupe instead of undefined requestCache
    const fetchFn = async () => await fetchApi(`${BACKEND_API_URL}/payrolls?page=${page}&limit=${limit}`);
    const data = await requestDeduplicator.dedupe(cacheKey, fetchFn, 10000);
    
    if (!data.error) {
      eventBus.emit('payroll-updated', data);
    }
    
    return data;
  },

  // Get payroll by employee ID
  getByEmployeeId: async (employeeId) => {
    // ✅ FIX: Always fetch fresh payroll data for employee (no caching)
    // Payroll data is critical and should always be up-to-date
    const data = await fetchApi(`${BACKEND_API_URL}/payrolls?employeeId=${employeeId}`);
    
    if (!data.error) {
      logger.log('✅ Employee payroll data fetched:', data);
      eventBus.emit('employee-payroll-updated', data);
    } else {
      logger.error('❌ Error fetching employee payroll:', data.error);
    }
    
    return data;
  },

  // Calculate payroll
  calculate: async (payrollData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/payrolls/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payrollData)
    });

    if (!data.error) {
      // Clear cache
      requestDeduplicator.clearAll();
      eventBus.emit('payroll-calculated', data);
    }

    return data;
  },

  // Create payroll record
  create: async (payrollData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/payrolls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payrollData)
    });

    if (!data.error) {
      // Clear cache
      requestDeduplicator.clearAll();
      eventBus.emit('payroll-created', data);
    }

    return data;
  }
};

// ✅ NEW: Cash Advance API functions
export const cashAdvanceApi = {
  // Get all cash advances
  getAll: async () => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance`);
      if (!data.error) {
        eventBus.emit('cashAdvance-loaded', data);
      }
      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch cash advances');
    }
  },

  // Get cash advances for specific employee
  getByEmployeeId: async (employeeId) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance?employee=${employeeId}`);
      if (!data.error) {
        eventBus.emit('employeeCashAdvance-loaded', data);
      }
      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch employee cash advances');
    }
  },

  // Create new cash advance request
  create: async (cashAdvanceData) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cashAdvanceData)
      });

      if (!data.error) {
        eventBus.emit('cashAdvance-created', data);
        showSuccess('Cash advance request created successfully!');
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to create cash advance request');
    }
  },

  // Update cash advance
  update: async (id, updates) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!data.error) {
        eventBus.emit('cashAdvance-updated', data);
        showSuccess('Cash advance updated successfully!');
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to update cash advance');
    }
  },

  // Approve cash advance
  approve: async (id) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance/${id}/approve`, {
        method: 'POST'
      });

      if (!data.error) {
        eventBus.emit('cashAdvance-approved', data);
        showSuccess('Cash advance approved successfully!');
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to approve cash advance');
    }
  },

  // Reject cash advance
  reject: async (id, reason) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!data.error) {
        eventBus.emit('cashAdvance-rejected', data);
        showSuccess('Cash advance rejected');
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to reject cash advance');
    }
  },

  // Delete cash advance
  delete: async (id) => {
    try {
      const data = await fetchApi(`${BACKEND_API_URL}/cash-advance/${id}`, {
        method: 'DELETE'
      });

      if (!data.error) {
        eventBus.emit('cashAdvance-deleted', { id });
        showSuccess('Cash advance deleted successfully!');
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to delete cash advance');
    }
  }
};

// Fingerprint API functions
export const fingerprintApi = {
  // Check if fingerprint service is available
  checkService: async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/biometric-integrated/device/health`);
      const data = await response.json();
      return data.success === true && data.connected === true;
    } catch (error) {
      logger.error('Fingerprint service check failed:', error);
      return false;
    }
  },
  
  // Enroll fingerprint for employee
  enroll: async (employeeId, finger = 'unknown') => {
    return await fetchApi(`${BACKEND_API_URL}/biometric-integrated/enroll/${employeeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finger })
    });
  },
  
  // Record attendance with fingerprint (time in/out)
  recordAttendance: async () => {
    try {
      // Check if fingerprint service is available first
      const isServiceAvailable = await fingerprintApi.checkService();
      if (!isServiceAvailable) {
        showError('Fingerprint device not connected');
        return { error: 'Fingerprint device not connected' };
      }

      const data = await fetchApi(`${BACKEND_API_URL}/biometric-integrated/attendance/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!data.error) {
        eventBus.emit('attendance-recorded', data);
        const actionText = data.action === 'time_in' ? 'Time In' : 'Time Out';
        showSuccess(`${actionText} recorded successfully!`);
      }

      return data;
    } catch (error) {
      return handleApiError(error, 'Failed to record attendance');
    }
  }
};

// Start polling for real-time updates (every 10 seconds)
let pollingInterval = null;

export const startRealTimeUpdates = (intervalMs = 10000) => {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // ✅ FIX: Initial fetch with cache bypass to get fresh data
  employeeApi.getAll({ bypassCache: true });
  
  // ✅ FIX: Set up polling with cache bypass to always get fresh data
  pollingInterval = setInterval(() => {
    employeeApi.getAll({ bypassCache: true });
  }, intervalMs);
  
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
};

// Stop real-time updates
export const stopRealTimeUpdates = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

// Export default object with all services
export default {
  employee: employeeApi,
  attendance: attendanceApi,
  salary: salaryApi,
  payroll: payrollApi,
  cashAdvance: cashAdvanceApi,
  fingerprint: fingerprintApi,
  events: eventBus,
  startRealTimeUpdates,
  stopRealTimeUpdates
};
