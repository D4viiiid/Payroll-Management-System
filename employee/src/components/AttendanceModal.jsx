import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger.js';
import notifSound from '../assets/notif.mp3';

/**
 * AttendanceModal - Modal for recording Time In/Time Out via fingerprint
 */
const AttendanceModal = ({ isOpen, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('checking');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      checkDeviceStatus();
      loadCurrentUserAttendance();
    }
  }, [isOpen]);

  const checkDeviceStatus = async () => {
    try {
      setDeviceStatus('checking');
      const response = await fetch('/api/biometric-integrated/device/health');
      const data = await response.json();
      // Save optional message for UI
      if (data && data.message) {
        setDeviceMessage(data.message);
      } else {
        setDeviceMessage('');
      }
      setDeviceStatus(data.connected ? 'connected' : 'disconnected');
    } catch (error) {
      logger.error('Error checking device:', error);
      setDeviceStatus('disconnected');
    }
  };
  const [deviceMessage, setDeviceMessage] = useState('');

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
      toast.error('Biometric device not connected. Please connect device and try again.');
      return;
    }

    try {
      setProcessing(true);
      
      const toastId = toast.info('Please place your finger on the scanner...', { 
        autoClose: false,
        closeButton: false
      });

      const response = await fetch('/api/biometric-integrated/attendance/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      toast.dismiss(toastId);

      if (data.success) {
        // Play notification sound
        if (audioRef.current) {
          audioRef.current.play().catch(err => logger.error('Error playing sound:', err));
        }
        
        const action = data.action === 'time_in' ? 'Time In' : 'Time Out';
        toast.success(`✅ ${action} recorded successfully!`, {
          autoClose: 3000
        });

        // ✅ FIX ISSUE #1: Emit event to update dashboard immediately
        // Import eventBus dynamically to avoid circular dependencies
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
        toast.error(data.message || 'Failed to record attendance');
      }
    } catch (error) {
      logger.error('Error recording attendance:', error);
      toast.error('Error recording attendance: ' + error.message);
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
              <p className="text-sm text-red-800 font-medium">⚠️ Device Not Connected</p>
              <p className="text-xs text-red-700 mt-1">
                Please connect the ZKTeco biometric scanner and refresh the device status.
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
