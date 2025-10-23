// employee/src/services/biometricService.js
// Updated to use Fingerprint Bridge Server (localhost:3002)
import axios from 'axios';

// Local bridge server (runs on client machine with USB fingerprint scanner)
const BRIDGE_URL = 'http://localhost:3003/api';

class BiometricService {
  constructor() {
    this.healthCheckInterval = null;
    this.deviceStatus = {
      serverRunning: false,
      deviceConnected: false,
      lastCheck: null
    };
  }

  /**
   * Check if fingerprint bridge server is running
   * @returns {Promise<boolean>} - True if server is running
   */
  async checkBridgeHealth() {
    try {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      this.deviceStatus.serverRunning = data.success;
      this.deviceStatus.deviceConnected = data.deviceConnected || false;
      this.deviceStatus.lastCheck = new Date();
      
      return data.success && data.deviceConnected;
    } catch (error) {
      console.error('❌ Bridge server not reachable:', error);
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
    try {
      const response = await fetch(`${BRIDGE_URL}/device/status`);
      const data = await response.json();
      
      this.deviceStatus.serverRunning = true;
      this.deviceStatus.deviceConnected = data.connected;
      this.deviceStatus.lastCheck = new Date();
      
      return data;
    } catch (error) {
      console.error('❌ Cannot get device status:', error);
      return {
        success: false,
        connected: false,
        status: 'error',
        message: 'Bridge server not running. Please start the Fingerprint Bridge Service.'
      };
    }
  }

  /**
   * Start auto health checking (polls every 5 seconds)
   * @param {Function} callback - Called when status changes
   */
  startAutoHealthCheck(callback) {
    if (this.healthCheckInterval) {
      this.stopAutoHealthCheck();
    }

    // Check immediately
    this.checkBridgeHealth().then(callback);

    // Then check every 5 seconds
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
      const response = await axios.post(`${BRIDGE_URL}/fingerprint/enroll`, {
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
      const response = await axios.post(`${BRIDGE_URL}/fingerprint/login`);
      return response.data;
    } catch (error) {
      console.error('❌ Fingerprint login failed:', error);
      throw error;
    }
  }

  /**
   * Capture single fingerprint (for verification)
   */
  async captureFingerprint() {
    try {
      const response = await axios.post(`${BRIDGE_URL}/fingerprint/capture`);
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
      const response = await axios.post(`${BRIDGE_URL}/attendance/record`);
      return response.data;
    } catch (error) {
      console.error('❌ Attendance recording failed:', error);
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
