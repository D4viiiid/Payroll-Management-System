import React, { useState } from 'react';
import webUSBFingerprint from '../services/webUSBFingerprint';
import { employeeApi } from '../services/apiService';

const WebUSBBiometricButton = ({ mode = 'login', employeeData = null }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Connect to USB fingerprint device
   */
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setMessage('📱 Requesting USB device access...');

      const connected = await webUSBFingerprint.connect();
      
      if (connected) {
        setIsConnected(true);
        setMessage('✅ Fingerprint device connected!');
      }

    } catch (error) {
      console.error('Connection error:', error);
      
      if (error.message.includes('No device selected')) {
        setMessage('❌ No device selected. Please select your fingerprint scanner.');
      } else if (error.message.includes('not supported')) {
        setMessage('❌ WebUSB not supported. Please use Chrome, Edge, or Opera browser.');
      } else {
        setMessage(`❌ Connection failed: ${error.message}`);
      }
      
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Enroll fingerprint for new employee
   */
  const handleEnroll = async () => {
    if (!isConnected) {
      setMessage('⚠️ Please connect to fingerprint device first');
      return;
    }

    if (!employeeData || !employeeData._id) {
      setMessage('❌ Employee data missing');
      return;
    }

    try {
      setIsScanning(true);
      setMessage('👆 Starting enrollment... Place finger on scanner (1/3)');

      // Capture 3 fingerprints and merge
      const fingerprintTemplate = await webUSBFingerprint.enrollFingerprint(employeeData._id);

      setMessage('💾 Saving fingerprint to database...');

      // Save to backend
      await employeeApi.update(employeeData._id, {
        fingerprintTemplate: fingerprintTemplate,
        fingerprintEnrolled: true
      });

      setMessage('✅ Fingerprint enrolled successfully!');
      
      // Notify parent component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fingerprintEnrolled', {
          detail: { employeeId: employeeData._id }
        }));
      }

    } catch (error) {
      console.error('Enrollment error:', error);
      setMessage(`❌ Enrollment failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Login with fingerprint
   */
  const handleLogin = async () => {
    if (!isConnected) {
      setMessage('⚠️ Please connect to fingerprint device first');
      return;
    }

    try {
      setIsScanning(true);
      setMessage('👆 Place finger on scanner...');

      // Capture fingerprint
      const capturedTemplate = await webUSBFingerprint.captureFingerprint();

      setMessage('🔍 Searching for matching fingerprint...');

      // Send to backend for verification
      const response = await employeeApi.verifyFingerprint(capturedTemplate);

      if (response.success && response.employee) {
        setMessage(`✅ Welcome, ${response.employee.firstName}!`);
        
        // Store token and redirect
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.employee));
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);

      } else {
        setMessage('❌ Fingerprint not recognized. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ Login failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Record attendance with fingerprint
   */
  const handleAttendance = async () => {
    if (!isConnected) {
      setMessage('⚠️ Please connect to fingerprint device first');
      return;
    }

    try {
      setIsScanning(true);
      setMessage('👆 Place finger on scanner...');

      // Capture fingerprint
      const capturedTemplate = await webUSBFingerprint.captureFingerprint();

      setMessage('🔍 Verifying identity...');

      // Send to backend for verification and attendance
      const response = await employeeApi.recordAttendanceByFingerprint(capturedTemplate);

      if (response.success) {
        setMessage(`✅ Attendance recorded for ${response.employee.firstName}!`);
      } else {
        setMessage('❌ Fingerprint not recognized.');
      }

    } catch (error) {
      console.error('Attendance error:', error);
      setMessage(`❌ Attendance failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Disconnect from device
   */
  const handleDisconnect = async () => {
    await webUSBFingerprint.disconnect();
    setIsConnected(false);
    setMessage('Disconnected from fingerprint device');
  };

  return (
    <div className="webusb-biometric-container">
      <style>{`
        .webusb-biometric-container {
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          margin: 20px 0;
        }
        .webusb-button {
          padding: 12px 24px;
          margin: 8px 4px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .webusb-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .webusb-button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .webusb-button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .webusb-button-success {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
        }
        .webusb-button-danger {
          background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
          color: white;
        }
        .webusb-message {
          padding: 12px;
          margin: 12px 0;
          border-radius: 6px;
          background: #f5f5f5;
          font-size: 14px;
          text-align: center;
        }
        .webusb-status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .webusb-status-connected {
          background: #d4edda;
          color: #155724;
        }
        .webusb-status-disconnected {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>

      <div className="text-center">
        <h4>🔐 WebUSB Fingerprint {mode === 'enroll' ? 'Enrollment' : mode === 'login' ? 'Login' : 'Attendance'}</h4>
        
        <div className={`webusb-status ${isConnected ? 'webusb-status-connected' : 'webusb-status-disconnected'}`}>
          {isConnected ? '✅ Device Connected' : '⚠️ Device Not Connected'}
        </div>

        {!isConnected ? (
          <button
            className="webusb-button webusb-button-primary"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? '📱 Connecting...' : '📱 Connect Fingerprint Device'}
          </button>
        ) : (
          <>
            {mode === 'enroll' && (
              <button
                className="webusb-button webusb-button-success"
                onClick={handleEnroll}
                disabled={isScanning}
              >
                {isScanning ? '👆 Scanning...' : '👆 Enroll Fingerprint'}
              </button>
            )}

            {mode === 'login' && (
              <button
                className="webusb-button webusb-button-primary"
                onClick={handleLogin}
                disabled={isScanning}
              >
                {isScanning ? '🔍 Verifying...' : '🔐 Login with Fingerprint'}
              </button>
            )}

            {mode === 'attendance' && (
              <button
                className="webusb-button webusb-button-success"
                onClick={handleAttendance}
                disabled={isScanning}
              >
                {isScanning ? '📝 Recording...' : '📝 Record Attendance'}
              </button>
            )}

            <button
              className="webusb-button webusb-button-danger"
              onClick={handleDisconnect}
              disabled={isScanning}
            >
              🔌 Disconnect
            </button>
          </>
        )}

        {message && (
          <div className="webusb-message">
            {message}
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <p>💡 <strong>Browser Compatibility:</strong></p>
          <p>✅ Chrome, Edge, Opera | ❌ Firefox, Safari</p>
          <p>🔌 Make sure your ZKTeco device is connected via USB</p>
        </div>
      </div>
    </div>
  );
};

export default WebUSBBiometricButton;
