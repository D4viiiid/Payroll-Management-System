import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import biometricService from '../services/biometricService';
import { employeeApi } from '../services/apiService';

/**
 * BiometricEnrollmentSection - Component for managing employee fingerprints
 * Updated to use Fingerprint Bridge Server
 */
const BiometricEnrollmentSection = ({ employeeId, onEnrollmentComplete }) => {
  const [fingerprints, setFingerprints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('checking');
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    if (employeeId) {
      checkDeviceStatus();
      loadEmployeeData();
    }
  }, [employeeId]);

  const checkDeviceStatus = async () => {
    try {
      setDeviceStatus('checking');
      const isConnected = await biometricService.checkBridgeHealth();
      setDeviceStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      // ✅ FIX: Silently fail device check (fingerprint is optional feature)
      setDeviceStatus('disconnected');
    }
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const employee = await employeeApi.getById(employeeId);
      setEmployeeData(employee);
      
      // Check if fingerprint is already enrolled
      if (employee.fingerprintEnrolled) {
        setFingerprints([{ id: 1, enrolled: true }]);
      } else {
        setFingerprints([]);
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollFingerprint = async () => {
    if (fingerprints.length >= 1 && fingerprints[0]?.enrolled) {
      toast.warning('Fingerprint already enrolled for this employee.');
      return;
    }

    if (deviceStatus !== 'connected') {
      toast.error('Bridge server not connected. Please run START_BRIDGE.bat first.');
      return;
    }

    if (!employeeData) {
      toast.error('Employee data not loaded');
      return;
    }

    try {
      setEnrolling(true);
      toast.info('👆 Please scan your finger 3 times on the scanner...', { 
        autoClose: false, 
        toastId: 'fingerprint-scan' 
      });

      // Call bridge server to enroll fingerprint
      const data = await biometricService.enrollEmployee({
        _id: employeeId,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email
      });

      toast.dismiss('fingerprint-scan');

      if (data.success) {
        toast.success('✅ Fingerprint enrolled successfully!');
        await loadEmployeeData();
        if (onEnrollmentComplete) {
          onEnrollmentComplete(data);
        }
      } else {
        toast.error(data.message || 'Failed to enroll fingerprint');
      }
    } catch (error) {
      // ✅ FIX: Better error handling without console spam
      toast.dismiss('fingerprint-scan');
      const errorMsg = error.response?.data?.message || error.message || 'Failed to connect to bridge server';
      toast.error('Error: ' + errorMsg);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDeleteFingerprint = async (index) => {
    if (!window.confirm('Are you sure you want to delete this fingerprint?')) {
      return;
    }

    try {
      const response = await fetch(`/api/biometric-integrated/fingerprint/${employeeId}/${index}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Fingerprint deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete fingerprint');
      }
    } catch (error) {
      // ✅ FIX: Simplified error message
      toast.error('Error deleting fingerprint');
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-600 mt-2">Loading fingerprints...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Device Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Device Status:</span>
          {deviceStatus === 'checking' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
              Checking...
            </span>
          )}
          {deviceStatus === 'connected' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Connected
            </span>
          )}
          {deviceStatus === 'disconnected' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ❌ Disconnected
            </span>
          )}
        </div>
        <button
          onClick={checkDeviceStatus}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Refresh
        </button>
      </div>

      {/* Enrolled Fingerprints */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Enrolled Fingerprints ({fingerprints.length}/3)
        </h4>
        
        {fingerprints.length === 0 ? (
          <div className="p-4 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm text-gray-500">No fingerprints enrolled yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {fingerprints.map((fp, index) => (
              <div key={index} className="p-3 bg-white border-2 border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {fp.finger === 'thumb' ? '👍' :
                         fp.finger === 'index' ? '☝️' :
                         fp.finger === 'middle' ? '🖕' :
                         fp.finger === 'ring' ? '💍' :
                         fp.finger === 'pinky' ? '🤙' : '❓'}
                      </span>
                      <span className="text-xs font-medium text-gray-700 capitalize">
                        {fp.finger}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(fp.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteFingerprint(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete fingerprint"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enroll New Fingerprint */}
      {fingerprints.length < 3 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">Enroll New Fingerprint</h4>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Finger
            </label>
            <select
              value={selectedFinger}
              onChange={(e) => setSelectedFinger(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              disabled={enrolling}
            >
              {fingerOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleEnrollFingerprint}
            disabled={enrolling || deviceStatus !== 'connected'}
            className={`w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              enrolling || deviceStatus !== 'connected'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {enrolling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enrolling... Place finger on scanner
              </>
            ) : (
              <>
                <span>🖐️</span>
                Enroll Fingerprint
              </>
            )}
          </button>

          {deviceStatus !== 'connected' && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ Device not connected. Please connect the biometric scanner.
            </p>
          )}
        </div>
      )}

      {fingerprints.length >= 3 && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            ✅ Maximum fingerprints enrolled (3/3)
          </p>
          <p className="text-xs text-green-700 mt-1">
            Delete a fingerprint to enroll a new one.
          </p>
        </div>
      )}
    </div>
  );
};

export default BiometricEnrollmentSection;
