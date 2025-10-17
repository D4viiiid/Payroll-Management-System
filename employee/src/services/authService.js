import { logger } from '../utils/logger.js';

const API_BASE_URL = 'http://localhost:5000/api';

// Employee login
export const employeeLogin = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/employees/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store employee data in localStorage
    localStorage.setItem('employee', JSON.stringify(data.employee));
    localStorage.setItem('isEmployeeLoggedIn', 'true');
    
    return data;
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

// Create employee account
export const createEmployeeAccount = async (employeeId, username = null, password = null) => {
  try {
    const requestBody = {};
    if (username && password) {
      requestBody.username = username;
      requestBody.password = password;
    }

    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create account');
    }

    return data;
  } catch (error) {
    logger.error('Create account error:', error);
    throw error;
  }
};

// Change employee password
export const changeEmployeePassword = async (employeeId, currentPassword, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }

    return data;
  } catch (error) {
    logger.error('Change password error:', error);
    throw error;
  }
};

// Get current employee from localStorage
export const getCurrentEmployee = () => {
  const employee = localStorage.getItem('employee');
  return employee ? JSON.parse(employee) : null;
};

// Check if employee is logged in
export const isEmployeeLoggedIn = () => {
  return localStorage.getItem('isEmployeeLoggedIn') === 'true';
};

// Logout employee
export const employeeLogout = () => {
  localStorage.removeItem('employee');
  localStorage.removeItem('isEmployeeLoggedIn');
};
