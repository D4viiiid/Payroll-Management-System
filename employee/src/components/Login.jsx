
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi } from "../services/apiService";
import { toast } from 'react-toastify';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaFacebookF, FaMapMarkerAlt } from "react-icons/fa";
import logo from '../assets/logo.png';
import loginImage from '../assets/login.png';
import loginImage1 from '../assets/login1.png';
import loginImage2 from '../assets/login2.png';
import PinInput from './PinInput';
import './Login.responsive.css';

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
    <span className="login-clock-text">
      {day} | {date} {time}
    </span>
  );
}

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // PIN verification state
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pendingAdminData, setPendingAdminData] = useState(null);

  const navigate = useNavigate();

  // Image slider array
  const sliderImages = [loginImage, loginImage1, loginImage2];

  // Auto-slide effect - only forward, loop back to start
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        // Always move forward, loop back to 0 after last image
        return (prevIndex + 1) % sliderImages.length;
      });
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(slideInterval);
  }, []);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Validate credentials first - removed hardcoded admin check
    try {
      const loginResult = await employeeApi.login({ username, password });

      if (loginResult.error) {
        setError(loginResult.error);
        toast.error(loginResult.error);
        return;
      }

      // ✅ FIX: Check if backend requires PIN verification (for admins with PIN)
      if (loginResult.requiresPin === true) {
        // Backend explicitly requires PIN verification
        setPendingAdminData({
          token: loginResult.token,
          employee: loginResult.employee,
          employeeId: loginResult.employee.employeeId || loginResult.employee.username
        });
        
        // Show PIN verification screen
        setShowPinVerification(true);
        toast.info('Please enter your 6-digit PIN');
        return;
      }

      // Check if this is an admin account without PIN (legacy check)
      if (loginResult.employee && loginResult.employee.isAdmin) {
        // Check if PIN is set up
        if (!loginResult.employee.adminPin) {
          toast.error('Admin PIN not configured. Please contact system administrator.');
          setError("Admin PIN not configured. Please contact system administrator.");
          return;
        }
        
        // Admin with PIN - this path should not be reached if backend is working correctly
        // because backend should return requiresPin: true
        setPendingAdminData({
          token: loginResult.token,
          employee: loginResult.employee,
          employeeId: loginResult.employee.employeeId || loginResult.employee.username
        });
        
        // Show PIN verification screen
        setShowPinVerification(true);
        toast.info('Please enter your 6-digit PIN');
        return;
      }

      // Regular employee login - no PIN required
      if (loginResult.token) {
        localStorage.setItem('token', loginResult.token);
      }

      const employeeData = {
        ...loginResult.employee,
        requiresPasswordChange: loginResult.requiresPasswordChange || false
      };
      localStorage.setItem('userRole', 'employee');
      localStorage.setItem('currentEmployee', JSON.stringify(employeeData));
      toast.success(loginResult.message || 'Login successful');
      navigate("/employee-dashboard");

    } catch (error) {
      console.error('Login error:', error);
      setError("Login failed. Please try again.");
      toast.error("Login failed. Please try again.");
    }
  };

  const handlePinComplete = async (pin) => {
    if (!pendingAdminData) {
      setError("Session expired. Please login again.");
      setShowPinVerification(false);
      return;
    }

    // Prevent multiple submissions
    if (pinLoading) {
      return;
    }

    setPinLoading(true);
    setError("");

    try {
      // Verify PIN with backend using apiService
      const result = await employeeApi.verifyPin(pendingAdminData.employeeId, pin);

      if (result.error || !result.success) {
        setError(result.message || result.error || 'Invalid PIN');
        toast.error(result.message || result.error || 'Invalid PIN');
        setPinLoading(false);
        
        // Reset PIN input after failed attempt
        setTimeout(() => {
          setShowPinVerification(false);
          setPendingAdminData(null);
          setPassword("");
        }, 2000);
        return;
      }

      // PIN verified successfully - complete admin login
      localStorage.setItem('token', pendingAdminData.token);
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('currentEmployee', JSON.stringify(pendingAdminData.employee));
      
      // Show success message ONCE
      toast.success('PIN verified successfully');
      
      // Hide PIN overlay and navigate
      setShowPinVerification(false);
      setPinLoading(false);
      setPendingAdminData(null);
      
      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);

    } catch (error) {
      console.error('PIN verification error:', error);
      setError("PIN verification failed. Please try again.");
      toast.error("PIN verification failed. Please try again.");
      setPinLoading(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinVerification(false);
    setPendingAdminData(null);
    setPassword("");
    setError("");
    toast.info('Login cancelled');
  };



  return (
    <div className="login-wrapper">
      {/* PIN Verification Modal Overlay */}
      {showPinVerification && (
        <div className="pin-verification-overlay">
          <PinInput 
            onComplete={handlePinComplete}
            onCancel={handlePinCancel}
            loading={pinLoading}
          />
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="login-bg-circle login-bg-circle-top" />
      <div className="login-bg-circle login-bg-circle-bottom" />

      {/* Real-time Clock Header */}
      <div className="login-clock-bar">
        <ClockBar />
      </div>

      {/* Main Login Container */}
      <div className="login-main-container">
        {/* Left Side - Login Form */}
        <div className="login-form-section">
          {/* Logo */}
          <img
            src={logo}
            alt="Garden & Landscaping Logo"
            className="login-logo"
          />
          
          {/* Welcome Text */}
          <h2 className="login-welcome-title">
            Welcome Back
          </h2>
          <p className="login-subtitle">
            Payroll Management System
          </p>
          
          {/* Login Form */}
          <form className="login-form" onSubmit={handleLogin}>
            {/* Username Input */}
            <div className="login-input-wrapper">
              <label className="login-label">
                Username or Employee ID
              </label>
              <div className="login-input-container">
                <FaUser className="login-input-icon" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input-field"
                  autoComplete="username"
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="login-input-wrapper">
              <label className="login-label">
                Password
              </label>
              <div className="login-input-container">
                <FaLock className="login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input-field"
                  autoComplete="current-password"
                />
                <span 
                  onClick={togglePassword} 
                  className="login-password-toggle"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <p className="login-error-message">
                {error}
              </p>
            )}
            
            {/* Login Button */}
            <button
              type="submit"
              className="login-button"
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Right Side - Image Slider */}
        <div className="login-image-section">
          {/* Background Pattern */}
          <div className="login-image-bg-pattern" />
          
          {/* Image Slider */}
          <div className="login-image-slider-container">
            {sliderImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Garden & Landscaping ${index + 1}`}
                className={`login-slider-image ${currentImageIndex === index ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Slider Indicators */}
          <div className="login-slider-indicators">
            {sliderImages.map((_, index) => (
              <div
                key={index}
                className={`login-slider-indicator ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Social Media Icons */}
      <div className="login-social-container">
        {/* Facebook Icon */}
        <a
          href="https://www.facebook.com/balajadiarachel.com.ph"
          target="_blank"
          rel="noopener noreferrer"
          className="login-social-icon login-social-icon-facebook"
        >
          <FaFacebookF />
        </a>

        {/* Google Maps Icon */}
        <a
          href="https://maps.app.goo.gl/RNvRoSwEbEi7cr81A"
          target="_blank"
          rel="noopener noreferrer"
          className="login-social-icon login-social-icon-maps"
        >
          <FaMapMarkerAlt />
        </a>
      </div>

      {/* Footer Text */}
      <p className="login-footer-text">
       <i> © 2025 Rae Disenyo Garden & Landscaping Services. All rights reserved.</i>
      </p>
    </div>
  );
};

export default Login;
