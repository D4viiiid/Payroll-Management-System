import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Add this import
import { fingerprintApi, employeeApi } from "../services/apiService";
import { biometricLoginIPC } from "../services/biometricService_updated";
import { toast } from 'react-toastify';
// Add react-icons import
import { FaUser, FaLock, FaEye, FaEyeSlash, FaFingerprint } from "react-icons/fa";
import BiometricLoginButton from './BiometricLoginButton';
import logo from '../assets/logo.png';

// Real-time clock component
function ClockBar() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'white' }}>
      {day} | {date} {time}
    </span>
  );
}

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showBiometrics, setShowBiometrics] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('unknown'); // unknown, connected, disconnected, initializing
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);

  const navigate = useNavigate();

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await employeeApi.login({ username, password });
      if (response.success) {
        localStorage.setItem('employee', JSON.stringify(response.employee));
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/dashboard');
        toast.success('Login successful!');
      } else {
        setError(response.error || 'Login failed');
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      setError('Login failed');
      toast.error('Login failed');
    }
  };

  const handleBiometricLogin = async () => {
    setIsScanning(true);
    try {
      const response = await biometricLoginIPC();
      if (response.success) {
        localStorage.setItem('employee', JSON.stringify(response.employee));
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/dashboard');
        toast.success('Biometric login successful!');
      } else {
        setError(response.error || 'Biometric login failed');
        toast.error(response.error || 'Biometric login failed');
      }
    } catch (error) {
      setError('Biometric login failed');
      toast.error('Biometric login failed');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const checkDeviceStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/biometric/health');
        const data = await response.json();
        setDeviceStatus(data.status);
      } catch (error) {
        setDeviceStatus('error');
      }
    };
    checkDeviceStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <img src={logo} alt="Logo" className="h-12" />
          <ClockBar />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Employee Login</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {!showBiometrics ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                <FaUser className="inline mr-2" />Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                <FaLock className="inline mr-2" />Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-4"
            >
              Login
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <FaFingerprint className="text-6xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Biometric Login</p>
              <p className="text-sm text-gray-500 mb-4">Device Status: {deviceStatus}</p>
            </div>
            <button
              onClick={handleBiometricLogin}
              disabled={deviceStatus !== 'connected' || isScanning}
              className={`font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-4 ${
                deviceStatus === 'connected' && !isScanning
                  ? 'bg-green-500 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isScanning ? 'Scanning...' : 'Login with Fingerprint'}
            </button>
          </div>
        )}
        <button
          onClick={() => setShowBiometrics(!showBiometrics)}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          {showBiometrics ? 'Use Password Login' : 'Use Biometric Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;
