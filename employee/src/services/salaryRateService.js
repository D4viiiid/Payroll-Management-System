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
    const response = await axios.post(`${API_URL}/salary-rate`, rateData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error creating salary rate:', error);
    throw error;
  }
};

export default {
  getCurrentSalaryRate,
  getSalaryRateHistory,
  getSalaryRateForDate,
  createSalaryRate
};
