import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger.js';
import biometricService from '../services/biometricService';
import notifSound from '../assets/notif.mp3';

/**
 * AttendanceModal - Modal for recording Time In/Time Out via fingerprint
 * Updated to use Fingerprint Bridge Server
 */
const AttendanceModal = ({ isOpen, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('checking');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentUserAttendance();
      checkDeviceStatus();
      
      // Start auto health check (polls every 5 seconds)
      biometricService.startAutoHealthCheck((isHealthy) => {
        const status = biometricService.getCurrentStatus();
        
        if (status.serverRunning && status.deviceConnected) {
          setDeviceStatus('connected');
          setDeviceMessage('✅ ZKTeco device ready on localhost:3003');
        } else if (status.serverRunning && !status.deviceConnected) {
          setDeviceStatus('disconnected');
          setDeviceMessage('⚠️ Bridge running, but no ZKTeco device detected. Please plug in the scanner.');
        } else {
          setDeviceStatus('disconnected');
          setDeviceMessage('❌ Bridge server not running. Service may be stopped or not installed.');
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (isOpen) {
        biometricService.stopAutoHealthCheck();
      }
    };
  }, [isOpen]);

  const checkDeviceStatus = async () => {
    try {
      setDeviceStatus('checking');
      setDeviceMessage('Checking device connection...');
      
      // Get detailed device status
      const statusData = await biometricService.getDeviceStatus();
      
      if (statusData.connected) {
        setDeviceStatus('connected');
        setDeviceMessage('✅ ' + statusData.message);
      } else {
        setDeviceStatus('disconnected');
        setDeviceMessage('⚠️ ' + statusData.message);
      }
    } catch (error) {
      logger.error('Error checking device:', error);
      setDeviceStatus('disconnected');
      setDeviceMessage('❌ Cannot connect to bridge server');
    }
  };
  const [deviceMessage, setDeviceMessage] = useState('Checking...');

  const loadCurrentUserAttendance = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        // Could fetch today's attendance if needed
      }
    } catch (error) {
      logger.error('Error loading user data:', error);
    }
  };

  const handleTimeInOut = async () => {
    if (deviceStatus !== 'connected') {
      toast.error('Bridge server not connected. Please run START_BRIDGE.bat first.');
      return;
    }

    try {
      setProcessing(true);
      
      const toastId = toast.info('👆 Please place your finger on the scanner...', { 
        autoClose: false,
        closeButton: false
      });

      // Call bridge server to record attendance
      const data = await biometricService.recordAttendance();

      toast.dismiss(toastId);

      if (data.success) {
        // Play notification sound
        if (audioRef.current) {
          audioRef.current.play().catch(err => logger.error('Error playing sound:', err));
        }
        
        const employeeName = data.employee ? `${data.employee.firstName} ${data.employee.lastName}` : 'Unknown';
        const timeLabel = data.attendance?.timeOut ? 'Time Out' : 'Time In';
        
        toast.success(`✅ ${timeLabel} recorded for ${employeeName}!`, {
          autoClose: 3000
        });

        // ✅ Emit event to update dashboard immediately
        import('../services/apiService').then(({ eventBus }) => {
          eventBus.emit('attendance-recorded', data);
        });

        // Show attendance details
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(data);
          }
          onClose();
        }, 2000);
      } else {
        // ✅ FIX BUG #14: Show the actual backend error message
        const errorMessage = data.error || data.message || 'Fingerprint not recognized. Please try again.';
        toast.error(errorMessage, {
          autoClose: 5000 // Show error longer so user can read it
        });
      }
    } catch (error) {
      logger.error('Error recording attendance:', error);
      
      // ✅ FIX BUG #14: Extract error message from response
      const errorMessage = error.response?.data?.error || error.message || 'Failed to connect to bridge server';
      toast.error('Error: ' + errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src={notifSound} preload="auto" />
      
      <div className="bg-white rounded-xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: '450px', maxHeight: '85vh' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold" style={{ fontSize: '1.4rem' }}>Fingerprint Attendance</h2>
              <p className="text-blue-100 mt-1" style={{ fontSize: '0.85rem' }}>Record your time in/out</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
              style={{ fontSize: '1.75rem' }}
              disabled={processing}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4" style={{ padding: '1.25rem', maxHeight: 'calc(85vh - 200px)', overflowY: 'auto' }}>
          {/* Device Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {deviceStatus === 'connected' ? '🟢' : '🔴'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Device Status</p>
                <p className="text-xs text-gray-500">
                  {deviceStatus === 'checking' && 'Checking connection...'}
                  {deviceStatus === 'connected' && 'Ready to scan'}
                  {deviceStatus === 'disconnected' && 'Not connected'}
                  {deviceMessage && ` — ${deviceMessage}`}
                </p>
              </div>
            </div>
            <button
              onClick={checkDeviceStatus}
              disabled={processing}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Refresh
            </button>
          </div>

          {/* Current Time */}
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-gray-600 mb-1" style={{ fontSize: '0.8rem' }}>Current Time</p>
            <p className="font-bold text-blue-600" style={{ fontSize: '1.75rem' }}>
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
            <p className="text-gray-500 mt-1" style={{ fontSize: '0.8rem' }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium mb-2" style={{ fontSize: '0.85rem' }}>📋 Instructions:</p>
            <ol className="text-yellow-700 space-y-1 ml-4 list-decimal" style={{ fontSize: '0.75rem' }}>
              <li>Ensure biometric device is connected</li>
              <li>Click the "Scan Fingerprint" button below</li>
              <li>Place your enrolled finger on the scanner</li>
              <li>Wait for confirmation</li>
            </ol>
          </div>

          {/* Action Button */}
          <button
            onClick={handleTimeInOut}
            disabled={processing || deviceStatus !== 'connected'}
            className={`w-full rounded-lg font-bold flex items-center justify-center gap-3 transition-all ${
              processing || deviceStatus !== 'connected'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            }`}
            style={{ padding: '0.9rem 1.25rem', fontSize: '1rem' }}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🖐️</span>
                <span>Scan Fingerprint</span>
              </>
            )}
          </button>

          {deviceStatus !== 'connected' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">⚠️ Bridge Server Not Connected</p>
              <p className="text-xs text-red-700 mt-1">
                Please start the bridge server by running <code className="bg-red-100 px-1 rounded">START_BRIDGE.bat</code> in the <code className="bg-red-100 px-1 rounded">employee/fingerprint-bridge</code> folder.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModal;
