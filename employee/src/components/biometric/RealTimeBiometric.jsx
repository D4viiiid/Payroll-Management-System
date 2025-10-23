// employee/src/components/biometric/RealTimeBiometric.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './biometric.css';

const RealTimeBiometric = ({ employee, onEnrollmentComplete, onCredentialsGenerated }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    // Connect to Python biometric server
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to biometric server');
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from biometric server');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    newSocket.on('enrollment_status', (data) => {
      setEnrollmentStatus(data.message);
      
      if (data.status === 'completed') {
        setIsEnrolling(false);
        if (onEnrollmentComplete) {
          onEnrollmentComplete(employee);
        }
        
        // Generate credentials after successful enrollment
        if (onCredentialsGenerated) {
          const employeeId = generateEmployeeId();
          const password = generatePassword();
          onCredentialsGenerated(employeeId, password);
        }
      }
      
      if (data.status === 'started') {
        setIsEnrolling(true);
      }
      
      if (data.status === 'error') {
        setIsEnrolling(false);
      }
    });

    return () => newSocket.close();
  }, [employee, onEnrollmentComplete, onCredentialsGenerated]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateEmployeeId = () => {
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `EMP-${random}`;
  };

  const connectDevice = async () => {
    try {
      setConnectionStatus('connecting');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${API_URL}/biometric/connect`);
      if (response.data.success) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      setEnrollmentStatus('Failed to connect to biometric device');
    }
  };

  const enrollEmployee = async () => {
    if (!employee) {
      alert('Please select an employee first');
      return;
    }

    if (!isConnected) {
      alert('Please connect to biometric device first');
      return;
    }

    try {
      setEnrollmentStatus('Starting enrollment... Please wait.');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/biometric/enroll`, {
        employee_id: employee.employeeId || 'temp',
        name: `${employee.firstName} ${employee.lastName}`
      });
    } catch (error) {
      setEnrollmentStatus(`Error: ${error.response?.data?.message || error.message}`);
      setIsEnrolling(false);
    }
  };

  return (
    <div className="biometric-card">
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Biometric Enrollment</h5>
        </div>
        <div className="card-body">
          <div className="connection-status mb-3">
            <span className={`status-dot ${connectionStatus}`}></span>
            Device Status: <strong className="text-capitalize">{connectionStatus}</strong>
          </div>

          <div className="controls mb-3">
            <button 
              onClick={connectDevice}
              disabled={isConnected}
              className="btn btn-outline-primary btn-sm me-2"
            >
              {isConnected ? 'Connected' : 'Connect Device'}
            </button>
            
            <button 
              onClick={enrollEmployee}
              disabled={!isConnected || isEnrolling}
              className="btn btn-primary btn-sm"
            >
              {isEnrolling ? (
                <>
                  <i className="fas fa-spinner fa-spin me-1"></i>
                  Enrolling...
                </>
              ) : (
                <>
                  <i className="fas fa-fingerprint me-1"></i>
                  Enroll Fingerprint
                </>
              )}
            </button>
          </div>

          {employee && (
            <div className="employee-info alert alert-info mb-3">
              <strong>Selected Employee:</strong><br />
              {employee.firstName} {employee.lastName}
              {employee.employeeId && <><br /><strong>ID:</strong> {employee.employeeId}</>}
            </div>
          )}

          {enrollmentStatus && (
            <div className={`alert ${
              enrollmentStatus.includes('successfully') ? 'alert-success' : 
              enrollmentStatus.includes('Error') ? 'alert-danger' : 'alert-info'
            }`}>
              {enrollmentStatus}
            </div>
          )}

          {!employee && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-1"></i>
              Please select an employee first
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeBiometric;