
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi } from "../services/apiService";
import { toast } from 'react-toastify';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaFacebookF, FaMapMarkerAlt } from "react-icons/fa";
import logo from '../assets/logo.png';
import loginImage from '../assets/login.png';
import loginImage1 from '../assets/login1.png';
import loginImage2 from '../assets/login2.png';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    // Admin login
    if (username === "admin" && password === "admin123") {
      localStorage.setItem('userRole', 'admin');
      navigate("/dashboard");
      return;
    }

    // Employee login - authenticate against MongoDB
    try {
      const loginResult = await employeeApi.login({ username, password });

      if (loginResult.error) {
        setError(loginResult.error);
        return;
      }

      // Successful login
      const employeeData = {
        ...loginResult.employee,
        requiresPasswordChange: loginResult.requiresPasswordChange || false
      };
      localStorage.setItem('userRole', 'employee');
      localStorage.setItem('currentEmployee', JSON.stringify(employeeData));
      toast.success(loginResult.message || 'Login successful');
      navigate("/employee-dashboard");

    } catch (error) {
      logger.error('Login error:', error);
      setError("Login failed. Please try again.");
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '300px',
        height: '300px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)',
      }} />

      {/* Real-time Clock Header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #f8b6c1 0%, #f06a98 100%)',
        color: 'white',
        padding: '10px 30px',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(240, 106, 152, 0.3)',
        zIndex: 100,
      }}>
        <ClockBar />
      </div>

      {/* Main Login Container */}
      <div style={{
        display: 'flex',
        width: '1200px',
        minHeight: '650px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        background: '#fff',
        marginTop: '40px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Left Side - Login Form */}
        <div style={{
          flex: '1',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 50px',
        }}>
          {/* Logo */}
          <img
            src={logo}
            alt="Garden & Landscaping Logo"
            style={{
              width: '350px',
              marginBottom: '2rem',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
            }}
          />
          
          {/* Welcome Text */}
          <h2 style={{
            fontSize: '2.7rem',
            fontWeight: '700',
            color: '#2d3748',
            marginBottom: '0.7rem',
            textAlign: 'center',
          }}>
            Welcome Back
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#718096',
            marginBottom: '2.5rem',
            textAlign: 'center',
          }}>
            Payroll Management System
          </p>
          
          {/* Login Form */}
          <form style={{ width: '100%', maxWidth: '400px' }} onSubmit={handleLogin}>
            {/* Username Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4a5568',
                marginBottom: '0.6rem',
              }}>
                Username or Employee ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f7fafc',
                borderRadius: '10px',
                padding: '0.9rem 1.2rem',
                border: '2px solid #e2e8f0',
                transition: 'all 0.3s',
              }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#f06a98'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <FaUser style={{ color: '#a0aec0', marginRight: 10, fontSize: '1.2rem' }} />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '1.05rem',
                    color: '#2d3748',
                  }}
                  autoComplete="username"
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#4a5568',
                marginBottom: '0.6rem',
              }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f7fafc',
                borderRadius: '10px',
                padding: '0.9rem 1.2rem',
                border: '2px solid #e2e8f0',
                transition: 'all 0.3s',
              }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#f06a98'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <FaLock style={{ color: '#a0aec0', marginRight: 10, fontSize: '1.2rem' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '1.05rem',
                    color: '#2d3748',
                  }}
                  autoComplete="current-password"
                />
                <span 
                  onClick={togglePassword} 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#a0aec0', 
                    marginLeft: 8,
                    fontSize: '1.2rem',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#f06a98'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#a0aec0'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <p style={{ 
                color: '#e53e3e', 
                textAlign: 'center', 
                marginBottom: '1.2rem',
                fontSize: '1rem',
                background: '#fff5f5',
                padding: '0.9rem',
                borderRadius: '8px',
                border: '1px solid #feb2b2',
              }}>
                {error}
              </p>
            )}
            
            {/* Login Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f06a98 0%, #ec407a 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '1rem 0',
                fontWeight: '600',
                fontSize: '1.1rem',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 15px rgba(240, 106, 152, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(240, 106, 152, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(240, 106, 152, 0.3)';
              }}
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Right Side - Image Slider */}
        <div style={{
          flex: '1',
          background: '#f06a98',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          }} />
          
          {/* Image Slider */}
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {sliderImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Garden & Landscaping ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: currentImageIndex === index ? 1 : 0,
                  transition: 'opacity 1s ease-in-out',
                  zIndex: currentImageIndex === index ? 2 : 1,
                  filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))',
                }}
              />
            ))}
          </div>

          {/* Slider Indicators */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            zIndex: 3,
          }}>
            {sliderImages.map((_, index) => (
              <div
                key={index}
                style={{
                  width: currentImageIndex === index ? '30px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: currentImageIndex === index ? 'white' : 'rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Social Media Icons */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Facebook Icon */}
        <a
          href="https://www.facebook.com/balajadiarachel.com.ph"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#1877f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(24, 119, 242, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px) scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(24, 119, 242, 0.3)';
          }}
        >
          <FaFacebookF />
        </a>

        {/* Google Maps Icon */}
        <a
          href="https://maps.app.goo.gl/RNvRoSwEbEi7cr81A"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#34a853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(52, 168, 83, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px) scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(52, 168, 83, 0.3)';
          }}
        >
          <FaMapMarkerAlt />
        </a>
      </div>

      {/* Footer Text */}
      <p style={{
        marginTop: '1rem',
        color: '#2d3748',
        fontSize: '0.875rem',
        textAlign: 'center',
        fontWeight: '500',
        textShadow: '0 2px 4px rgba(255, 255, 255, 0.5)',
      }}>
       <i> © 2025 Rae Disenyo Garden & Landscaping Services. All rights reserved.</i>
      </p>
    </div>
  );
};

export default Login;
