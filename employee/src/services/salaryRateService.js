import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * 💰 SALARY RATE SERVICE
 * Manage dynamic salary rates across the system
 */

// Get current active salary rate
export const getCurrentSalaryRate = async () => {
  try {
    const response = await axios.get(`${API_URL}/salary-rate/current`);
    return response.data.rate;
  } catch (error) {
    console.error('❌ Error fetching current salary rate:', error);
    // Return default rate as fallback
    return {
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94,
      effectiveDate: new Date(),
      isActive: true
    };
  }
};

// Get salary rate history (admin only)
export const getSalaryRateHistory = async (limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/salary-rate/history`, {
      params: { limit },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.history;
  } catch (error) {
    console.error('❌ Error fetching salary rate history:', error);
    throw error;
  }
};

// Get salary rate for specific date (for historical payroll)
export const getSalaryRateForDate = async (date) => {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const response = await axios.get(`${API_URL}/salary-rate/for-date/${dateStr}`);
    return response.data.rate;
  } catch (error) {
    console.error('❌ Error fetching salary rate for date:', error);
    // Return default rate as fallback
    return {
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94
    };
  }
};

// Create new salary rate (admin only)
export const createSalaryRate = async (rateData) => {
  try {
    const token = localStorage.getItem('token');
    
    // ✅ FIX: Add comprehensive logging for debugging
    console.log('🔐 Salary Rate Service - Token Check:');
    console.log('  - Token exists:', !!token);
    console.log('  - Token length:', token ? token.length : 0);
    console.log('  - Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
    console.log('  - API URL:', `${API_URL}/salary-rate`);
    console.log('  - Rate Data:', rateData);
    
    if (!token) {
      console.error('❌ NO TOKEN FOUND! User might not be logged in.');
      throw new Error('Authentication token not found. Please login again.');
    }
    
    const response = await axios.post(`${API_URL}/salary-rate`, rateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Salary rate created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating salary rate:', error);
    console.error('  - Error message:', error.message);
    console.error('  - Response data:', error.response?.data);
    console.error('  - Response status:', error.response?.status);
    
    // ✅ Provide user-friendly error messages
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Your session may have expired. Please login again.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update salary rate');
    }
  }
};

export default {
  getCurrentSalaryRate,
  getSalaryRateHistory,
  getSalaryRateForDate,
  createSalaryRate
};
