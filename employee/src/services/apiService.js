// apiService.js - Centralized API service for all database connections
import { toast } from 'react-toastify';
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
    toast.error(errorMessage);
  }
  return { error: errorMessage };
};

// Generic fetch function with error handling
const fetchApi = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
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
  // Get all employees with pagination support
  getAll: async (params = {}) => {
    const { page = 1, limit = 50 } = params;
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/employees`, { page, limit });
    
    const fetchFn = async () => {
      return await fetchApi(`${cacheKey}`);
    };
    
    const data = await requestDeduplicator.dedupe(cacheKey, fetchFn, 10000);
    
    if (!data.error) {
      eventBus.emit('employees-updated', data);
    }
    return data;
  },
  
  // Get employee by ID
  getById: async (id) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/${id}`);
  },
  
  // Create new employee
  create: async (employeeData) => {
    const data = await fetchApi(`${BACKEND_API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    
    if (!data.error) {
      // Notify all components about the new employee
      eventBus.emit('employee-created', data);
      // Refresh the employee list
      employeeApi.getAll();
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
      // Notify all components about the updated employee
      eventBus.emit('employee-updated', data);
      // Refresh the employee list
      employeeApi.getAll();
    }
    
    return data;
  },
  
  // Delete employee
  delete: async (id) => {
    const data = await fetchApi(`${BACKEND_API_URL}/employees/${id}`, {
      method: 'DELETE'
    });

    if (!data.error) {
      // Notify all components about the deleted employee
      eventBus.emit('employee-deleted', { id });
      // Refresh the employee list
      employeeApi.getAll();
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
    const { page = 1, limit = 50 } = params;
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/attendance`, { page, limit });
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
    const cacheKey = createCacheKey(url, filters);
    const fetchFn = async () => await fetchApi(url);
    return await requestDeduplicator.dedupe(cacheKey, fetchFn, 5000);
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
      // Notify all components about the new attendance record
      eventBus.emit('attendance-recorded', data);
      // Refresh the attendance list
      attendanceApi.getAll();
    }
    
    return data;
  }
};

// Salary API functions
export const salaryApi = {
  // Get all salaries
  getAll: async (params = {}) => {
    const { page = 1, limit = 50 } = params;
    const cacheKey = createCacheKey(`${BACKEND_API_URL}/salary`, { page, limit });
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
      eventBus.emit('salary-created', data);
      salaryApi.getAll();
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
      eventBus.emit('salary-updated', data);
      salaryApi.getAll();
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
      eventBus.emit('salary-archived', { id });
      salaryApi.getAll();
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
      eventBus.emit('salary-restored', { id });
      salaryApi.getAll();
    }

    return data;
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
        toast.error('Fingerprint device not connected');
        return { error: 'Fingerprint device not connected' };
      }

      const data = await fetchApi(`${BACKEND_API_URL}/biometric-integrated/attendance/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!data.error) {
        eventBus.emit('attendance-recorded', data);
        const actionText = data.action === 'time_in' ? 'Time In' : 'Time Out';
        toast.success(`${actionText} recorded successfully!`);
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
  
  // Initial fetch
  employeeApi.getAll();
  
  // Set up polling
  pollingInterval = setInterval(() => {
    employeeApi.getAll();
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
  fingerprint: fingerprintApi,
  events: eventBus,
  startRealTimeUpdates,
  stopRealTimeUpdates
};
