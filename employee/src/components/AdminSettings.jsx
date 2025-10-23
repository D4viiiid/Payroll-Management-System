import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaKey, FaUser, FaLock, FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';
import './AdminSettings.css';

/**
 * Admin Settings Component
 * Allows admin to change username, password, and 6-digit PIN
 * Only accessible to admin users
 * Requires current password for verification
 */
const AdminSettings = () => {
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
    newPin: '',
    confirmPin: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [showPins, setShowPins] = useState({
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Get current admin employee data
    const employeeData = localStorage.getItem('currentEmployee');
    if (employeeData) {
      setCurrentEmployee(JSON.parse(employeeData));
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Current password is required
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    // At least one field must be filled
    if (!formData.newUsername && !formData.newPassword && !formData.newPin) {
      newErrors.general = 'Please update at least one field (Username, Password, or PIN)';
    }

    // Username validation (if provided)
    if (formData.newUsername) {
      if (formData.newUsername.length < 3) {
        newErrors.newUsername = 'Username must be at least 3 characters';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.newUsername)) {
        newErrors.newUsername = 'Username can only contain letters, numbers, and underscores';
      }
    }

    // Password validation (if provided)
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (!/[A-Z]/.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one uppercase letter';
      }
      if (!/[a-z]/.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one lowercase letter';
      }
      if (!/[0-9]/.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one number';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // PIN validation (if provided)
    if (formData.newPin) {
      if (!/^\d{6}$/.test(formData.newPin)) {
        newErrors.newPin = 'PIN must be exactly 6 digits';
      }
      if (formData.newPin !== formData.confirmPin) {
        newErrors.confirmPin = 'PINs do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        currentPassword: formData.currentPassword,
        employeeId: currentEmployee?._id || currentEmployee?.employeeId // Include employee ID
      };

      // Only include fields that are being updated
      if (formData.newUsername) {
        payload.newUsername = formData.newUsername;
      }
      if (formData.newPassword) {
        payload.newPassword = formData.newPassword;
      }
      if (formData.newPin) {
        payload.newPin = formData.newPin;
      }

      console.log('Changing admin credentials:', formData);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/employees/admin/change-credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || 'Failed to update credentials');
        setLoading(false);
        return;
      }

      // Success
      toast.success(result.message || 'Credentials updated successfully');
      
      // Update local storage with new data if username changed
      if (formData.newUsername && result.employee) {
        localStorage.setItem('currentEmployee', JSON.stringify(result.employee));
        setCurrentEmployee(result.employee);
      }

      // Clear form
      setFormData({
        currentPassword: '',
        newUsername: '',
        newPassword: '',
        confirmPassword: '',
        newPin: '',
        confirmPin: ''
      });
      setErrors({});

      // If password or username changed, prompt re-login
      if (formData.newPassword || formData.newUsername) {
        setTimeout(() => {
          toast.info('Please login again with your new credentials');
          localStorage.clear();
          window.location.href = '/';
        }, 2000);
      }

    } catch (error) {
      console.error('Error updating credentials:', error);
      toast.error('Failed to update credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const togglePinVisibility = (field) => {
    setShowPins(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!currentEmployee || !currentEmployee.isAdmin) {
    return (
      <div className="admin-settings-unauthorized">
        <FaShieldAlt className="unauthorized-icon" />
        <h2>Access Denied</h2>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-container">
      <div className="admin-settings-header">
        <FaShieldAlt className="header-icon" />
        <h1>Admin Settings</h1>
        <p>Update your administrator credentials</p>
      </div>

      <div className="admin-settings-card">
        <div className="current-admin-info">
          <h3>Current Admin Account</h3>
          <p><strong>Username:</strong> {currentEmployee.username || 'N/A'}</p>
          <p><strong>Employee ID:</strong> {currentEmployee.employeeId || 'N/A'}</p>
          <p><strong>Name:</strong> {currentEmployee.firstName} {currentEmployee.lastName}</p>
        </div>

        <form className="admin-settings-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          {/* Current Password - REQUIRED */}
          <div className="form-group">
            <label className="form-label required">
              <FaLock /> Current Password
            </label>
            <div className="input-wrapper">
              <input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                placeholder="Enter your current password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="error-text">{errors.currentPassword}</span>
            )}
            <small className="form-hint">Required to verify your identity</small>
          </div>

          <hr className="divider" />

          {/* New Username - Optional */}
          <div className="form-group">
            <label className="form-label">
              <FaUser /> New Username
            </label>
            <input
              type="text"
              name="newUsername"
              value={formData.newUsername}
              onChange={handleInputChange}
              className={`form-input ${errors.newUsername ? 'error' : ''}`}
              placeholder="Leave blank to keep current username"
              disabled={loading}
            />
            {errors.newUsername && (
              <span className="error-text">{errors.newUsername}</span>
            )}
            <small className="form-hint">Optional - Minimum 3 characters, alphanumeric only</small>
          </div>

          {/* New Password - Optional */}
          <div className="form-group">
            <label className="form-label">
              <FaLock /> New Password
            </label>
            <div className="input-wrapper">
              <input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Leave blank to keep current password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.newPassword && (
              <span className="error-text">{errors.newPassword}</span>
            )}
            <small className="form-hint">Optional - Min 6 chars, must include uppercase, lowercase, and number</small>
          </div>

          {/* Confirm New Password */}
          {formData.newPassword && (
            <div className="form-group">
              <label className="form-label required">
                <FaLock /> Confirm New Password
              </label>
              <div className="input-wrapper">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Re-enter your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          <hr className="divider" />

          {/* New PIN - Optional */}
          <div className="form-group">
            <label className="form-label">
              <FaKey /> New 6-Digit PIN
            </label>
            <div className="input-wrapper">
              <input
                type={showPins.new ? "text" : "password"}
                name="newPin"
                value={formData.newPin}
                onChange={handleInputChange}
                className={`form-input ${errors.newPin ? 'error' : ''}`}
                placeholder="Leave blank to keep current PIN"
                maxLength={6}
                inputMode="numeric"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => togglePinVisibility('new')}
              >
                {showPins.new ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.newPin && (
              <span className="error-text">{errors.newPin}</span>
            )}
            <small className="form-hint">Optional - Must be exactly 6 digits (numbers only)</small>
          </div>

          {/* Confirm New PIN */}
          {formData.newPin && (
            <div className="form-group">
              <label className="form-label required">
                <FaKey /> Confirm New PIN
              </label>
              <div className="input-wrapper">
                <input
                  type={showPins.confirm ? "text" : "password"}
                  name="confirmPin"
                  value={formData.confirmPin}
                  onChange={handleInputChange}
                  className={`form-input ${errors.confirmPin ? 'error' : ''}`}
                  placeholder="Re-enter your new PIN"
                  maxLength={6}
                  inputMode="numeric"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => togglePinVisibility('confirm')}
                >
                  {showPins.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPin && (
                <span className="error-text">{errors.confirmPin}</span>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating...
                </>
              ) : (
                <>
                  <FaShieldAlt /> Update Credentials
                </>
              )}
            </button>
          </div>
        </form>

        <div className="security-notice">
          <FaShieldAlt className="notice-icon" />
          <div className="notice-content">
            <strong>Security Notice:</strong>
            <p>
              After updating your username or password, you will be automatically logged out.
              Please login again with your new credentials.
            </p>
            <p>
              Your PIN provides an additional layer of security when accessing the admin panel.
              Keep it confidential and do not share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
