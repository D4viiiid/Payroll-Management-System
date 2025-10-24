import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * 💰 SALARY RATE SERVICE
 * Manage dynamic salary rates across the system
 */

// ✅ CRITICAL FIX: Token validation helper
const validateToken = () => {
  const token = localStorage.getItem('token');
  
  // Check 1: Token exists and is not null/undefined/empty
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    console.error('❌ NO TOKEN: User is not logged in');
    console.error('   Token value in localStorage:', token);
    localStorage.removeItem('token'); // Clear invalid token
    throw new Error('NO_TOKEN: Please login to continue.');
  }
  
  // Check 2: Token is a string (not null, undefined, or object)
  if (typeof token !== 'string') {
    console.error('❌ INVALID TOKEN TYPE: Token is not a string');
    console.error('   Token type:', typeof token);
    localStorage.removeItem('token');
    throw new Error('INVALID_TOKEN: Please login again.');
  }
  
  // Check 3: Token format (JWT should have 3 parts: header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ INVALID TOKEN FORMAT: Token does not have 3 parts');
    console.error('   Token value:', token.substring(0, 100) + '...');
    console.error('   Parts found:', parts.length);
    console.error('   Token is likely corrupted or is string "undefined"');
    localStorage.removeItem('token'); // Clear invalid token
    localStorage.removeItem('user'); // Also clear user data
    throw new Error('INVALID_TOKEN: Please login again.');
  }
  
  // Check 4: Token expiration (decode payload and check 'exp' claim)
  try {
    const payload = JSON.parse(atob(parts[1])); // Decode base64 payload
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        console.error('❌ TOKEN EXPIRED:', new Date(expirationTime).toISOString());
        localStorage.removeItem('token'); // Clear expired token
        localStorage.removeItem('user');
        throw new Error('TOKEN_EXPIRED: Your session has expired. Please login again.');
      }
      
      // Log remaining time
      const remainingTime = expirationTime - currentTime;
      const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
      console.log(`✅ Token valid - Expires in ${remainingDays} days`);
    }
  } catch (decodeError) {
    if (decodeError.message?.includes('TOKEN_EXPIRED')) {
      throw decodeError; // Re-throw expiration error
    }
    console.error('❌ TOKEN DECODE ERROR:', decodeError.message);
    localStorage.removeItem('token'); // Clear malformed token
    localStorage.removeItem('user');
    throw new Error('INVALID_TOKEN: Token is malformed. Please login again.');
  }
  
  return token;
};

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

// Get salary rate history (now public - no auth required)
export const getSalaryRateHistory = async (limit = 10) => {
  try {
    // ✅ CRITICAL FIX ISSUE #2: Backend now allows public access to rate history
    // No authentication required for read-only history viewing
    const response = await axios.get(`${API_URL}/salary-rate/history`, {
      params: { limit }
    });
    return response.data.history;
  } catch (error) {
    console.error('❌ Error fetching salary rate history:', error);
    // Return empty array as graceful fallback
    return [];
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
    // ✅ SIMPLIFIED FIX: Just get token from localStorage, let backend validate it
    const token = localStorage.getItem('token');
    
    // Basic check: token exists
    if (!token || token === 'null' || token === 'undefined') {
      console.error('❌ NO TOKEN: User is not logged in');
      throw new Error('You are not logged in. Please login again.');
    }
    
    console.log('🔐 Salary Rate Service - Sending create request');
    console.log('  - API URL:', `${API_URL}/salary-rate`);
    console.log('  - Rate Data:', rateData);
    console.log('  - Token exists:', !!token);
    console.log('  - Token length:', token.length);
    
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
    
    // ✅ Handle backend authentication errors (let backend do the validation)
    if (error.response?.status === 401) {
      const backendMessage = error.response?.data?.message || 'Authentication failed';
      throw new Error(`Authentication error: ${backendMessage}`);
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
