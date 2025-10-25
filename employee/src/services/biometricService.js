// employee/src/services/biometricService.js
// Updated to use Fingerprint Bridge Server with HTTPS support
import axios from 'axios';

// Local bridge server URLs (tries HTTPS first, falls back to HTTP)
const BRIDGE_URLS = {
  https: 'https://localhost:3003/api',
  http: 'http://localhost:3003/api'
};

class BiometricService {
  constructor() {
    this.healthCheckInterval = null;
    this.deviceStatus = {
      serverRunning: false,
      deviceConnected: false,
      lastCheck: null
    };
    this.activeBridgeUrl = null; // Will be set after detecting which URL works
  }

  /**
   * Find which bridge URL works (HTTPS or HTTP)
   * @returns {Promise<string|null>} - Working bridge URL or null
   */
  async findWorkingBridgeUrl() {
    // If already found, return cached URL
    if (this.activeBridgeUrl) {
      return this.activeBridgeUrl;
    }

    // Try HTTPS first (required for Vercel production)
    for (const protocol of ['https', 'http']) {
      const url = BRIDGE_URLS[protocol];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Bridge found: ${url}`);
          this.activeBridgeUrl = url;
          return url;
        }
      } catch (error) {
        console.log(`❌ Bridge not available at ${url}`);
      }
    }

    console.log('❌ No working bridge URL found');
    return null;
  }

  /**
   * Check if fingerprint bridge server is running
   * @returns {Promise<boolean>} - True if server is running
   */
  async checkBridgeHealth() {
    const isProduction = import.meta.env.VITE_APP_ENV === 'production';
    
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available');
      }

      const response = await fetch(`${bridgeUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      this.deviceStatus.serverRunning = data.success;
      this.deviceStatus.deviceConnected = data.deviceConnected || false;
      this.deviceStatus.lastCheck = new Date();
      
      return data.success && data.deviceConnected;
    } catch (error) {
      // ✅ Only log errors in development to avoid console spam in production
      if (!isProduction) {
        console.error('❌ Bridge server not reachable:', error);
      }
      
      this.deviceStatus.serverRunning = false;
      this.deviceStatus.deviceConnected = false;
      this.deviceStatus.lastCheck = new Date();
      return false;
    }
  }

  /**
   * Get detailed device status
   * @returns {Promise<Object>} - Device status object
   */
  async getDeviceStatus() {
    const isProduction = import.meta.env.VITE_APP_ENV === 'production';
    
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available');
      }

      const response = await fetch(`${bridgeUrl}/device/status`);
      const data = await response.json();
      
      this.deviceStatus.serverRunning = true;
      this.deviceStatus.deviceConnected = data.connected;
      this.deviceStatus.lastCheck = new Date();
      
      return data;
    } catch (error) {
      // ✅ Only log errors in development to avoid console spam in production
      if (!isProduction) {
        console.error('❌ Cannot get device status:', error);
      }
      
      return {
        success: false,
        connected: false,
        status: isProduction ? 'not-available-in-production' : 'error',
        message: isProduction 
          ? 'Fingerprint scanner is only available on local machine (not in cloud deployment).'
          : 'Bridge server not running. Please start the Fingerprint Bridge Service.'
      };
    }
  }

  /**
   * Start auto health checking (polls every 5 seconds)
   * @param {Function} callback - Called when status changes
   */
  startAutoHealthCheck(callback) {
    // ✅ Bridge health checks work in production now (uses HTTPS)
    console.log('🔍 Starting bridge health checks (HTTPS supported)...');
    
    if (this.healthCheckInterval) {
      this.stopAutoHealthCheck();
    }

    // Check immediately (development only)
    this.checkBridgeHealth().then(callback);

    // Then check every 5 seconds (development only)
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.checkBridgeHealth();
      if (callback) callback(isHealthy);
    }, 5000);
  }

  /**
   * Stop auto health checking
   */
  stopAutoHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get current device status (cached)
   */
  getCurrentStatus() {
    return this.deviceStatus;
  }

  /**
   * Enroll new fingerprint (3 scans + merge)
   */
  async enrollEmployee(employeeData) {
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available. Please install and start the Fingerprint Bridge Service.');
      }

      const response = await axios.post(`${bridgeUrl}/fingerprint/enroll`, {
        employeeId: employeeData._id,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email
      });
      return response.data;
    } catch (error) {
      console.error('❌ Enrollment failed:', error);
      throw error;
    }
  }

  /**
   * Login with fingerprint
   */
  async loginWithFingerprint() {
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available. Please install and start the Fingerprint Bridge Service.');
      }

      const response = await axios.post(`${bridgeUrl}/fingerprint/login`);
      return response.data;
    } catch (error) {
      console.error('❌ Fingerprint login failed:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint (for verification)
   */
  async captureFingerprint() {
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available. Please install and start the Fingerprint Bridge Service.');
      }

      const response = await axios.post(`${bridgeUrl}/fingerprint/capture`);
      return response.data;
    } catch (error) {
      console.error('❌ Fingerprint capture failed:', error);
      throw error;
    }
  }

  /**
   * Record attendance with fingerprint
   */
  async recordAttendance() {
    try {
      const bridgeUrl = await this.findWorkingBridgeUrl();
      if (!bridgeUrl) {
        throw new Error('Bridge server not available. Please install and start the Fingerprint Bridge Service.');
      }

      const response = await axios.post(`${bridgeUrl}/attendance/record`);
      
      // ✅ FIX BUG #14: Check if backend returned success=false with error message
      if (response.data && response.data.success === false && response.data.error) {
        // Backend returned an error (e.g., "Attendance already completed")
        // Return the error in the same format so frontend can display it
        return {
          success: false,
          message: response.data.error, // ✅ Use backend error message
          error: response.data.error
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Attendance recording failed:', error);
      
      // ✅ FIX BUG #14: Extract backend error message from axios error
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          // Backend returned {"success": false, "error": "..."}
          return {
            success: false,
            message: errorData.error,
            error: errorData.error
          };
        }
      }
      
      throw error;
    }
  }

  /**
   * Legacy method - for backwards compatibility
   */
  async connectDevice() {
    return this.checkBridgeHealth();
  }

  /**
   * Legacy method - for backwards compatibility
   */
  async checkService() {
    return this.checkBridgeHealth();
  }
}

const biometricService = new BiometricService();

// Export default service instance
export default biometricService;

// Export individual functions for convenience
export const checkBridgeHealth = () => biometricService.checkBridgeHealth();
export const enrollEmployee = (data) => biometricService.enrollEmployee(data);
export const loginWithFingerprint = () => biometricService.loginWithFingerprint();
export const captureFingerprint = () => biometricService.captureFingerprint();
export const recordAttendance = () => biometricService.recordAttendance();

// Legacy export for backwards compatibility
export const checkFingerprintService = () => biometricService.checkService();
