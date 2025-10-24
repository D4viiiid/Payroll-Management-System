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

// Get salary rate history (admin only)
export const getSalaryRateHistory = async (limit = 10) => {
  try {
    // ✅ CRITICAL FIX: Make rate history available without auth
    // History is read-only and useful for context when creating new rates
    // Only creation requires authentication
    const token = localStorage.getItem('token');
    
    const headers = {};
    // Only add Authorization header if token exists (optional)
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.get(`${API_URL}/salary-rate/history`, {
      params: { limit },
      headers
    });
    return response.data.history;
  } catch (error) {
    console.error('❌ Error fetching salary rate history:', error);
    
    // ✅ Don't throw - just return empty array
    // Rate history is optional for modal functionality
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
    // ✅ CRITICAL FIX: Validate token BEFORE making request
    const token = validateToken(); // Will throw if token is missing/invalid/expired
    
    console.log('🔐 Salary Rate Service - Token Validated Successfully');
    console.log('  - API URL:', `${API_URL}/salary-rate`);
    console.log('  - Rate Data:', rateData);
    
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
    
    // ✅ CRITICAL FIX: Handle token validation errors - redirect to home page (login)
    if (error.message === 'NO_TOKEN' || error.message?.includes('NO_TOKEN')) {
      localStorage.clear();
      window.location.href = '/?reason=no_token';
      throw new Error('You are not logged in. Redirecting to login...');
    }
    
    if (error.message === 'TOKEN_EXPIRED' || error.message?.includes('TOKEN_EXPIRED')) {
      localStorage.clear();
      window.location.href = '/?reason=session_expired';
      throw new Error('Your session has expired. Redirecting to login...');
    }
    
    if (error.message === 'INVALID_TOKEN' || error.message?.includes('INVALID_TOKEN')) {
      localStorage.clear();
      window.location.href = '/?reason=invalid_token';
      throw new Error('Invalid authentication token. Redirecting to login...');
    }
    
    // ✅ Provide user-friendly error messages for API errors
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
