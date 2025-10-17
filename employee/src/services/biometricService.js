// employee/src/services/biometricService.js
import axios from 'axios';
import { logger } from '../utils/logger.js';

const BIOMETRIC_API = 'http://localhost:5000/api/biometric';
const FINGERPRINT_API = 'http://localhost:5001/api';

class BiometricService {
  async enrollEmployee(employeeData) {
    const response = await axios.post(`${BIOMETRIC_API}/enroll`, employeeData);
    return response.data;
  }

  async connectDevice() {
    const response = await axios.post(`${BIOMETRIC_API}/connect`);
    return response.data;
  }

  async getAttendance() {
    const response = await axios.get(`${BIOMETRIC_API}/attendance`);
    return response.data;
  }

  async startMonitoring() {
    const response = await axios.post(`${BIOMETRIC_API}/start-live`);
    return response.data;
  }
  
  async checkService() {
    try {
      const response = await fetch(`${FINGERPRINT_API}/fingerprint/status`);
      return response.ok;
    } catch (error) {
      logger.error('Fingerprint service check failed:', error);
      return false;
    }
  }
}

const biometricService = new BiometricService();
export default biometricService;
export const checkFingerprintService = () => biometricService.checkService();
