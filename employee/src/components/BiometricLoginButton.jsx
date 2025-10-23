import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFingerprint, FaSpinner, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const BiometricLoginButton = ({ onSuccess, onError }) => {
  const [deviceStatus, setDeviceStatus] = useState('checking'); // checking, connected, disconnected, error
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(''); // '', 'scanning', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Check device status on component mount
  useEffect(() => {
    checkDeviceStatus();
  }, []);

  const checkDeviceStatus = async () => {
    try {
      setDeviceStatus('checking');
      setErrorMessage('');
      const response = await fetch('http://localhost:5000/api/biometric/health');
      const data = await response.json();

      if (data.connected) {
        setDeviceStatus('connected');
      } else {
        setDeviceStatus('disconnected');
        setErrorMessage(data.message || 'Device not connected');
      }
    } catch (error) {
      logger.error('Device status check failed:', error);
      setDeviceStatus('error');
      setErrorMessage('Failed to check device status');
    }
  };

  const handleBiometricLogin = async () => {
    if (deviceStatus !== 'connected') {
      toast.error('Biometric device not connected');
      return;
    }

    setIsScanning(true);
    setScanStatus('scanning');
    setErrorMessage('');

    try {
      // Call the biometric login endpoint
      try {
      setIsLoading(true);
      setError(null);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/biometric/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setScanStatus('success');

        // Store employee data in localStorage
        localStorage.setItem('employee', JSON.stringify(data.employee));
        localStorage.setItem('isLoggedIn', 'true');

        toast.success(data.message || 'Biometric login successful!');

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(data.employee);
        }

        // Navigate to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } else {
        setScanStatus('error');
        const errorMessage = data.error || 'Biometric login failed';
        setErrorMessage(errorMessage);
        toast.error(errorMessage);

        // Call error callback if provided
        if (onError) {
          onError(errorMessage);
        }
      }

    } catch (error) {
      logger.error('Biometric login error:', error);
      setScanStatus('error');
      const errorMsg = 'Network error during biometric login';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);

      if (onError) {
        onError('Network error');
      }
    } finally {
      setIsScanning(false);
      // Reset scan status after 3 seconds
      setTimeout(() => {
        setScanStatus('');
      }, 3000);
    }
  };

  const getButtonColor = () => {
    if (scanStatus === 'success') return 'bg-green-500 hover:bg-green-600';
    if (scanStatus === 'error') return 'bg-red-500 hover:bg-red-600';
    if (deviceStatus === 'connected') return 'bg-blue-500 hover:bg-blue-700';
    return 'bg-gray-400 cursor-not-allowed';
  };

  const getButtonText = () => {
    if (scanStatus === 'scanning') return 'Scanning Fingerprint...';
    if (scanStatus === 'success') return 'Login Successful!';
    if (scanStatus === 'error') return 'Login Failed';
    return 'Login with Fingerprint';
  };

  const getDeviceStatusText = () => {
    switch (deviceStatus) {
      case 'checking': return 'Checking device...';
      case 'connected': return 'Device Connected ✓';
      case 'disconnected': return 'Device Not Connected';
      case 'error': return 'Device Error';
      default: return 'Unknown Status';
    }
  };

  const getDeviceStatusColor = () => {
    switch (deviceStatus) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="biometric-login-section bg-white p-6 rounded-lg shadow-md border">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Biometric Login</h3>
        <p className="text-sm text-gray-600">Secure authentication using fingerprint</p>
      </div>

      {/* Device Status Indicator */}
      <div className="mb-4 text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDeviceStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            deviceStatus === 'connected' ? 'bg-green-500' :
            deviceStatus === 'disconnected' || deviceStatus === 'error' ? 'bg-red-500' :
            'bg-yellow-500'
          }`}></div>
          {getDeviceStatusText()}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Biometric Login Button */}
      <button
        onClick={handleBiometricLogin}
        disabled={deviceStatus !== 'connected' || isScanning}
        className={`w-full py-4 px-6 rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center space-x-3 text-lg ${getButtonColor()} ${
          deviceStatus === 'connected' && !isScanning ? 'transform hover:scale-105' : ''
        }`}
      >
        {/* Icon based on status */}
        {scanStatus === 'scanning' && <FaSpinner className="animate-spin text-xl" />}
        {scanStatus === 'success' && <FaCheck className="text-xl" />}
        {scanStatus === 'error' && <FaTimes className="text-xl" />}
        {scanStatus === '' && <FaFingerprint className="text-xl" />}

        <span>{getButtonText()}</span>
      </button>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-600">
        {deviceStatus === 'connected' ? (
          <div>
            <p className="mb-2">Place your enrolled finger on the scanner</p>
            <p className="text-xs text-gray-500">The system will automatically log you in</p>
          </div>
        ) : (
          <div>
            <p className="mb-2">Please ensure the biometric device is connected and powered on</p>
            <p className="text-xs text-gray-500">Contact administrator if issues persist</p>
          </div>
        )}
      </div>

      {/* Retry button for device status */}
      {deviceStatus !== 'connected' && deviceStatus !== 'checking' && (
        <button
          onClick={checkDeviceStatus}
          className="mt-3 w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Check Device Again
        </button>
      )}

      {/* Progress indicator during scanning */}
      {scanStatus === 'scanning' && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">Processing fingerprint...</p>
        </div>
      )}
    </div>
  );
};

export default BiometricLoginButton;
