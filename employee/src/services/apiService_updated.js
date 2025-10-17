// apiService.js - Centralized API service for all database connections
import { toast } from 'react-toastify';

// Base API URLs
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const FINGERPRINT_API_URL = 'http://localhost:5001/api';
const WEBSOCKET_URL = 'ws://localhost:8080';

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

// WebSocket connection for real-time updates
let wsConnection = null;

const connectWebSocket = () => {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return wsConnection;
  }

  try {
    // ✅ Fix: Use correct WebSocket port (8081) to match backend
    const wsUrl = 'ws://localhost:8081';
    logger.log('🔗 Connecting to WebSocket at:', wsUrl);
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onopen = () => {
      logger.log('🔗 WebSocket connected to attendance server');
    };

    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        logger.log('📨 WebSocket message received:', message);

        // Emit events based on message type
        if (message.type === 'attendance-recorded') {
          logger.log('📝 Attendance recorded event:', message.data);
          eventBus.emit('attendance-recorded', message.data);
        } else if (message.type === 'attendance-updated') {
          logger.log('🔄 Attendance updated event:', message.data);
          eventBus.emit('attendance-updated', message.data);
        } else if (message.type === 'employees-updated') {
          logger.log('👥 Employees updated event:', message.data);
          eventBus.emit('employees-updated', message.data);
        } else {
          logger.log('⚠️ Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        logger.error('❌ Error parsing WebSocket message:', error);
      }
    };

    wsConnection.onclose = (event) => {
      logger.log('🔌 WebSocket connection closed:', event.code, event.reason);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        logger.log('🔄 Attempting to reconnect WebSocket...');
        connectWebSocket();
      }, 5000);
    };

    wsConnection.onerror = (error) => {
      logger.error('❌ WebSocket error:', error);
    };

    return wsConnection;
  } catch (error) {
    logger.error('❌ Failed to connect WebSocket:', error);
    return null;
  }
};

// Initialize WebSocket connection when module loads
connectWebSocket();

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
  // Get all employees
  getAll: async () => {
    const data = await fetchApi(`${BACKEND_API_URL}/employees`);
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

  // Biometric login
  biometricLogin: async () => {
    return await fetchApi(`${BACKEND_API_URL}/biometric/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Change password
  changePassword: async (id, passwordData) => {
    return await fetchApi(`${BACKEND_API_URL}/employees/${id}/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    });
  }
};

// ... rest of the file remains the same
