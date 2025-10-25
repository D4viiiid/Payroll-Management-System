import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import apiService, { eventBus, startRealTimeUpdates, stopRealTimeUpdates } from '../services/apiService';
import BiometricEnrollmentSection from './BiometricEnrollmentSection';
import FingerprintBridgeStatus from './FingerprintBridgeStatus';
import { logger } from '../utils/logger';
import './Admin.responsive.css';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [enrollingEmployee, setEnrollingEmployee] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [fingerprintServiceStatus, setFingerprintServiceStatus] = useState('checking');
  const [showFingerprintScanner, setShowFingerprintScanner] = useState(false);
  const [scanningEmployee, setScanningEmployee] = useState(null);
  const [scanStatus, setScanStatus] = useState('');
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentCredentials, setEnrollmentCredentials] = useState({ email: '', password: '' });
  const [editingEmployee, setEditingEmployee] = useState(null); // Track employee being edited
  const [showBiometricSection, setShowBiometricSection] = useState(false); // Show biometric section
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    employeeId: '',
    position: '',
    salary: '',
    hireDate: new Date().toISOString().split('T')[0], // Today's date as default
    date: new Date().toISOString().split('T')[0], // Today's date as default
    // 💰 Phase 1 Enhancement: Salary Rate Fields
    employmentType: 'Regular',
    dailyRate: 550,
    hourlyRate: 68.75,
    overtimeRate: 85.94
  });

  // Debug: Log the initial date
  useEffect(() => {
    logger.log('Initial hireDate:', formData.hireDate);
  }, []);

  // Fetch employees when the component is mounted
  useEffect(() => {
    fetchEmployees();
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    setFingerprintServiceStatus('checking');
    try {
      const isAvailable = await apiService.fingerprint.checkService();
      setFingerprintServiceStatus(isAvailable ? 'available' : 'unavailable');
    } catch (error) {
      logger.error('Error checking fingerprint service:', error);
      setFingerprintServiceStatus('unavailable');
    }
  };

  // ✅ FIX: Use useCallback to prevent stale closures in event listeners
  const fetchEmployees = useCallback(async () => {
    try {
      // ✅ FIX: Always bypass cache to get fresh data
      const data = await apiService.employee.getAll({ bypassCache: true });
      if (!data.error) {
        // Handle both paginated response {data: []} and plain array []
        const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
        setEmployees(employeeList);
        logger.log('✅ Employees data refreshed successfully:', employeeList.length, 'employees');
      }
    } catch (error) {
      logger.error('Error fetching employees:', error);
    }
  }, []); // Empty deps because it doesn't depend on any props or state
  
  // Set up real-time updates using the centralized API service
  useEffect(() => {
    // Start real-time updates
    const stopUpdates = startRealTimeUpdates(5000); // Update every 5 seconds
    
    // ✅ FIX: Listen for ALL employee events for immediate updates
    const unsubscribeUpdated = eventBus.on('employees-updated', (data) => {
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
      setEmployees(employeeList);
      logger.log('🔄 Employee data updated via event bus');
    });
    
    // ✅ NEW: Listen for employee creation event
    const unsubscribeCreated = eventBus.on('employee-created', () => {
      logger.log('🎉 Employee created event received, refreshing data immediately...');
      fetchEmployees(); // Immediately fetch fresh data
    });
    
    // ✅ NEW: Listen for employee update event
    const unsubscribeUpdatedSingle = eventBus.on('employee-updated', () => {
      logger.log('🔄 Employee updated event received, refreshing data immediately...');
      fetchEmployees(); // Immediately fetch fresh data
    });
    
    // ✅ NEW: Listen for employee deletion event
    const unsubscribeDeleted = eventBus.on('employee-deleted', () => {
      logger.log('🗑️ Employee deleted event received, refreshing data immediately...');
      fetchEmployees(); // Immediately fetch fresh data
    });
    
    // Clean up on component unmount
    return () => {
      stopUpdates();
      unsubscribeUpdated();
      unsubscribeCreated();
      unsubscribeUpdatedSingle();
      unsubscribeDeleted();
    };
  }, [fetchEmployees]); // ✅ FIX: Add fetchEmployees as dependency

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // ✅ FIX: Use centralized API service for deletion to trigger events
      const result = await apiService.employee.delete(employeeToDelete._id);

      if (result.error) {
        throw new Error(result.error);
      }

      // ✅ FIX: The event listener will automatically refresh the data
      // No need to manually update state here
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      alert('Employee deleted successfully!');
    } catch (error) {
      logger.error('Error deleting employee:', error);
      alert('Error deleting employee: ' + error.message);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setEmployeeToDelete(null);
  };

  const checkFingerprintService = async () => {
    try {
      // ✅ FIX: Check the biometric-integrated service (returns graceful error in production)
      const response = await fetch('/api/biometric-integrated/device/health', {
        method: 'GET',
      });
      const data = await response.json();
      
      // Don't log errors in production
      if (data.success && data.connected) {
        logger.log("✅ Fingerprint service available");
      }
      
      return data.success && data.connected;
    } catch (error) {
      // Silently fail - fingerprint service is optional
      return false;
    }
  };

  const handleFingerprintEnroll = async (employee) => {
    try {
      setEnrollingEmployee(employee);
      setEnrollmentStatus('Checking fingerprint service...');
      
      // ✅ FIX BUG #15: Use biometricService to call bridge server
      const biometricService = (await import('../services/biometricService')).default;
      
      // Check if bridge server is available
      const deviceStatus = await biometricService.getDeviceStatus();
      if (!deviceStatus.connected) {
        throw new Error('Biometric device not available. Please make sure the Fingerprint Bridge is running and the ZKTeco scanner is connected.');
      }
      
      setEnrollmentStatus('Starting fingerprint enrollment via bridge...');
      
      // ✅ FIX BUG #15: Call bridge server's enroll endpoint
      const result = await biometricService.enrollEmployee({
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        contactNumber: employee.contactNumber,
        position: employee.position,
        employeeId: employee.employeeId
      });
      
      if (result.success) {
        setEnrollmentStatus('Fingerprint enrollment completed!');
        alert(`✅ Fingerprint enrolled successfully for ${employee.firstName} ${employee.lastName}!`);
        
        // Refresh employee data
        fetchEmployees();
        setEnrollmentStatus('');
        setEnrollingEmployee(null);
      } else {
        throw new Error(result.message || result.error || 'Fingerprint enrollment failed');
      }
      
    } catch (error) {
      logger.error('Error starting fingerprint enrollment:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      setEnrollmentStatus('Error: ' + errorMessage);
      alert('❌ Fingerprint Biometric Failed: ' + errorMessage);
      setEnrollingEmployee(null);
    }
  };

  const handleDirectFingerprintScan = (employee) => {
    setScanningEmployee(employee);
    setShowFingerprintScanner(true);
    setScanStatus('Ready to scan fingerprint...');
  };

  const handleFingerprintScan = async () => {
    if (!scanningEmployee) return;
    
    try {
      setScanStatus('Scanning fingerprint...');
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Call the direct fingerprint scan API
      const response = await fetch(`${API_URL}/fingerprint/scan/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: scanningEmployee.firstName,
          lastName: scanningEmployee.lastName,
          email: scanningEmployee.email,
          contactNumber: scanningEmployee.contactNumber,
          position: scanningEmployee.position,
          employeeId: scanningEmployee.employeeId || scanningEmployee._id,
          salary: scanningEmployee.salary,
          hireDate: scanningEmployee.hireDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan fingerprint');
      }

      const result = await response.json();
      setScanStatus('Fingerprint scanned successfully!');
      
      // Show success message
      alert(`Fingerprint scanned and saved for ${scanningEmployee.firstName} ${scanningEmployee.lastName}!`);
      
      // Close scanner and refresh data
      setTimeout(() => {
        setShowFingerprintScanner(false);
        setScanningEmployee(null);
        setScanStatus('');
        fetchEmployees();
      }, 2000);
      
    } catch (error) {
      logger.error('Error scanning fingerprint:', error);
      setScanStatus('Error: ' + error.message);
      alert('Error scanning fingerprint: ' + error.message);
    }
  };

  const handleCloseScanner = () => {
    setShowFingerprintScanner(false);
    setScanningEmployee(null);
    setScanStatus('');
  };
  
  const handleEnrollmentClick = (employee) => {
    setEnrollingEmployee(employee);
    setEnrollmentCredentials({ email: employee.email || '', password: '' });
    setShowEnrollmentModal(true);
  };
  
  const handleEnrollmentCancel = () => {
    setShowEnrollmentModal(false);
    setEnrollingEmployee(null);
    setEnrollmentCredentials({ email: '', password: '' });
  };
  
  const handleEnrollmentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setEnrollmentStatus('Checking fingerprint service...');
      
      // Check if fingerprint service is available
      const serviceAvailable = await checkFingerprintService();
      if (!serviceAvailable) {
        throw new Error('Fingerprint service not available. Please make sure the ZKTeco fingerprint scanner is connected.');
      }
      
      setEnrollmentStatus('Starting fingerprint enrollment...');
      
      // Use the NEW biometric-integrated endpoint
      const response = await fetch(`/api/biometric-integrated/enroll/${enrollingEmployee._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finger: 'unknown' // User can select finger type later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start fingerprint enrollment');
      }

      const result = await response.json();
      
      if (result.success) {
        setEnrollmentStatus('Fingerprint enrollment completed!');
        
        // Show success message
        alert(`✅ Fingerprint enrolled successfully for ${enrollingEmployee.firstName} ${enrollingEmployee.lastName}!`);
        
        // Close the modal
        setShowEnrollmentModal(false);
        
        // Refresh employee data
        fetchEmployees();
        setEnrollmentStatus('');
        setEnrollingEmployee(null);
      } else {
        throw new Error(result.message || 'Fingerprint enrollment failed');
      }
      
    } catch (error) {
      logger.error('Error in fingerprint enrollment:', error);
      setEnrollmentStatus('Error: ' + error.message);
      alert('Fingerprint Enrollment Failed: ' + error.message);
      setEnrollingEmployee(null);
    }
  };

  const handleAddEmployeeClick = () => {
    setShowAddForm(true);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      employeeId: '',
      position: '',
      salary: '',
      hireDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddFormCancel = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setShowBiometricSection(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      employeeId: '',
      position: '',
      salary: '',
      hireDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      logger.log('Sending data:', formData);
      
      // Validate all required fields
      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }
      if (!formData.lastName.trim()) {
        throw new Error('Last name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.contactNumber.trim()) {
        throw new Error('Contact number is required');
      }
      // Temporarily make employeeId optional
      // if (!formData.employeeId.trim()) {
      //   throw new Error('Employee ID is required');
      // }
      if (!formData.position.trim()) {
        throw new Error('Position is required');
      }
      // Temporarily make department optional
      // if (!formData.department.trim()) {
      //   throw new Error('Department is required');
      // }
      if (!formData.salary || formData.salary <= 0) {
        throw new Error('Salary must be greater than 0');
      }
      if (!formData.hireDate) {
        throw new Error('Hire date is required');
      }
      
      // Ensure hireDate is properly formatted
      const hireDate = new Date(formData.hireDate);
      if (isNaN(hireDate.getTime())) {
        throw new Error('Invalid hire date');
      }
      
      const requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        contactNumber: formData.contactNumber,
        employeeId: formData.employeeId,
        position: formData.position,
        salary: parseFloat(formData.salary),
        hireDate: hireDate.toISOString()
      };
      
      logger.log('Sending request data:', requestData);
      
      // Use the centralized API service to create a new employee
      const result = await apiService.employee.create(requestData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      logger.log('Success response:', result);
      
      // Store the created employee and show biometric enrollment section
      setEditingEmployee(result);
      setShowBiometricSection(true);
      
      // Don't close the modal yet - let user enroll fingerprints
      alert('Employee added successfully! You can now enroll fingerprints (optional).');
      
      // Reset form but keep modal open for biometric enrollment
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        employeeId: '',
        position: '',
        salary: '',
        hireDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('Error adding employee:', error);
      alert('Error adding employee: ' + error.message);
    }
  };

  return (
    <div className="admin-page-wrapper">
      {/* Mobile Hamburger Menu */}
      <button
        className="hamburger-menu-button"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Admin Sidebar */}
      <AdminSidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="admin-main-content">
        {/* Desktop Header */}
        <AdminHeader />
        
        {/* Content Area with consistent padding */}
        <div className="admin-content-area">
          <div className="employee-content-card">
        <div className="employee-header-section">
          <h1 className="employee-title">Employee Management</h1>
          <button
            onClick={handleAddEmployeeClick}
            className="add-employee-btn"
          >
            <span>+</span> Add Employee
          </button>
        </div>
        
        {/* Service Status */}
        <div className="service-status-mobile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500 }}>Fingerprint Service:</span>
            {fingerprintServiceStatus === 'checking' && (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                background: '#fef3c7', 
                color: '#92400e' 
              }}>
                <div style={{ 
                  animation: 'spin 1s linear infinite', 
                  borderRadius: '50%', 
                  width: '0.75rem', 
                  height: '0.75rem', 
                  borderWidth: '2px', 
                  borderStyle: 'solid', 
                  borderColor: '#92400e transparent transparent transparent', 
                  marginRight: '0.25rem' 
                }}></div>
                Checking...
              </span>
            )}
            {fingerprintServiceStatus === 'available' && (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                background: '#d1fae5', 
                color: '#065f46' 
              }}>
                ✅ Available
              </span>
            )}
            {fingerprintServiceStatus === 'unavailable' && (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                background: '#fee2e2', 
                color: '#991b1b' 
              }}>
                ❌ Unavailable
              </span>
            )}
            <button
              onClick={checkServiceStatus}
              style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
          {fingerprintServiceStatus === 'unavailable' && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: 600 }}>
                Fingerprint service is not available.
              </p>
              <ul style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.25rem', marginLeft: '1rem', listStyle: 'disc' }}>
                <li>Backend server is running (port 5000)</li>
                <li>Python fingerprint app is running</li>
                <li>Fingerprint scanner is connected</li>
              </ul>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        {enrollmentStatus && (
          <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                animation: 'spin 1s linear infinite', 
                borderRadius: '50%', 
                width: '1rem', 
                height: '1rem', 
                borderWidth: '2px', 
                borderStyle: 'solid', 
                borderColor: '#2563eb transparent transparent transparent', 
                marginRight: '0.75rem' 
              }}></div>
              <span style={{ color: '#1e40af', fontWeight: 500 }}>{enrollmentStatus}</span>
            </div>
          </div>
        )}
        
       
        
        {/* History Section */}
        {showHistory && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Employee History</h2>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Employees:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{employees.length}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Latest Addition:</span>
                  <span className="text-gray-600">
                    {employees.length > 0 
                      ? `${employees[0].firstName} ${employees[0].lastName} - ${new Date(employees[0].createdAt || employees[0].hireDate).toLocaleDateString()}`
                      : 'No employees yet'
                    }
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Average Salary:</span>
                  <span className="text-green-600 font-medium">
                    ₱{employees.length > 0 
                      ? (employees.reduce((sum, emp) => sum + (emp.salary || 0), 0) / employees.length).toLocaleString(undefined, {maximumFractionDigits: 2})
                      : '0'
                    }
                  </span>
                </div>
              </div>
              {null}
            </div>
          </div>
        )}
        

        <div className="table-responsive-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Employee ID</th>
                <th>Position</th>
                <th>Salary</th>
                <th>Hire Date</th>
                <th>Fingerprint</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr key={employee._id}>
                  <td>{index + 1}</td>
                  <td>{`${employee.firstName} ${employee.lastName}`}</td>
                  <td>{employee.email}</td>
                  <td>{employee.employeeId}</td>
                  <td>{employee.position}</td>
                  <td>₱{employee.salary?.toLocaleString()}</td>
                  <td>{new Date(employee.hireDate).toLocaleDateString()}</td>
                  <td>
                    {employee.fingerprintEnrolled ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Enrolled
                        </span>
                        <span className="text-xs text-gray-500">
                          ({employee.fingerprintTemplates?.length || 1}/3)
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEnrollmentClick(employee)}
                          disabled={enrollingEmployee && enrollingEmployee._id === employee._id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            enrollingEmployee && enrollingEmployee._id === employee._id
                              ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                          title="Enroll Fingerprint with Credentials"
                        >
                          {enrollingEmployee && enrollingEmployee._id === employee._id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
                              Enrolling...
                            </>
                          ) : (
                            '👆 Enroll Fingerprint'
                          )}
                        </button>
                        <button
                          onClick={() => handleDirectFingerprintScan(employee)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
                          title="Direct Fingerprint Scan"
                        >
                          📱 Scan
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteClick(employee)}
                      className="table-action-btn"
                      style={{ background: '#fee2e2', color: '#991b1b' }}
                      title="Delete Employee"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div className="employee-modal-overlay">
          <div className="employee-modal-content">
            <div className="employee-modal-header">
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Add New Employee</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fill in the employee details below</p>
            </div>
            
            <div className="employee-modal-body">
            <form onSubmit={handleAddEmployee}>
              <div className="form-grid-mobile">
                <div className="form-field">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    placeholder="Enter first name"
                    className="form-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    placeholder="Enter last name"
                    className="form-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter contact number"
                    className="form-input"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Employee ID</label>
                  <input
                    type="text"
                    placeholder="Enter employee ID"
                    className="form-input"
                    style={{ background: '#fef3c7' }}
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Position *</label>
                  <input
                    type="text"
                    placeholder="Enter position"
                    className="form-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Salary *</label>
                  <input
                    type="number"
                    placeholder="Enter salary"
                    className="form-input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Hire Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.hireDate}
                    onChange={(e) => {
                      logger.log('Date changed to:', e.target.value);
                      setFormData({ ...formData, hireDate: e.target.value });
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Employment Type *</label>
                  <select
                    className="form-input"
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    required
                  >
                    <option value="Regular">Regular</option>
                    <option value="On-Call">On-Call</option>
                    <option value="Administrative">Administrative</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Daily Rate *</label>
                  <input
                    type="number"
                    placeholder="550"
                    className="form-input"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                  <small style={{ fontSize: '0.75rem', color: '#6b7280' }}>Default: ₱550/day</small>
                </div>
                <div className="form-field">
                  <label className="form-label">Hourly Rate *</label>
                  <input
                    type="number"
                    placeholder="68.75"
                    className="form-input"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                  <small style={{ fontSize: '0.75rem', color: '#6b7280' }}>Default: ₱68.75/hour</small>
                </div>
                <div className="form-field">
                  <label className="form-label">Overtime Rate *</label>
                  <input
                    type="number"
                    placeholder="85.94"
                    className="form-input"
                    value={formData.overtimeRate}
                    onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                  <small style={{ fontSize: '0.75rem', color: '#6b7280' }}>Default: ₱85.94/hour</small>
                </div>
              </div>
              
              {/* Biometric Enrollment Section - Show after employee is created */}
              {showBiometricSection && editingEmployee && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
                    Biometric Enrollment (Optional)
                  </h4>
                  
                  {/* ✅ ISSUE #3 FIX: Fingerprint Bridge Status in Employee Page */}
                  <FingerprintBridgeStatus />
                  
                  <BiometricEnrollmentSection
                    employeeId={editingEmployee._id}
                    onEnrollmentComplete={(data) => {
                      logger.log('Fingerprint enrolled:', data);
                      fetchEmployees(); // Refresh employee list
                    }}
                  />
                </div>
              )}
              
              <div className="employee-modal-footer">
                <button
                  type="button"
                  onClick={handleAddFormCancel}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#e5e7eb', 
                    color: '#374151', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 500, 
                    cursor: 'pointer' 
                  }}
                >
                  {showBiometricSection ? 'Close' : 'Cancel'}
                </button>
                {!showBiometricSection && (
                  <button
                    type="submit"
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      background: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: 500, 
                      cursor: 'pointer' 
                    }}
                  >
                    Add Employee
                  </button>
                )}
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Fingerprint Scanner Modal */}
      {showFingerprintScanner && scanningEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">Fingerprint Scanner</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  Scanning fingerprint for: <strong>{scanningEmployee.firstName} {scanningEmployee.lastName}</strong>
                </p>
                
                {/* Scanner Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{scanStatus}</p>
                </div>
                
                {/* Scanner Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                  <ul className="text-xs text-blue-800 text-left space-y-1">
                    <li>• Place your finger on the scanner</li>
                    <li>• Keep finger steady for 2-3 seconds</li>
                    <li>• Wait for confirmation message</li>
                  </ul>
                </div>
              </div>
              
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleFingerprintScan}
                  className="px-4 py-2 bg-purple-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                >
                  📱 Start Scan
                </button>
                <button
                  onClick={handleCloseScanner}
                  className="px-4 py-2 bg-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fingerprint Enrollment Modal */}
      {showEnrollmentModal && enrollingEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">Enroll Fingerprint</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  Enter credentials for: <strong>{enrollingEmployee.firstName} {enrollingEmployee.lastName}</strong>
                </p>
                
                <form onSubmit={handleEnrollmentSubmit} className="space-y-4">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={enrollmentCredentials.email}
                      onChange={(e) => setEnrollmentCredentials({ ...enrollmentCredentials, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={enrollmentCredentials.password}
                      onChange={(e) => setEnrollmentCredentials({ ...enrollmentCredentials, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Enter your email and password</li>
                      <li>• Click "Start Enrollment" to begin</li>
                      <li>• Follow the prompts to scan your fingerprint</li>
                    </ul>
                  </div>
                  
                  <div className="items-center pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                    >
                      Start Enrollment
                    </button>
                    <button
                      type="button"
                      onClick={handleEnrollmentCancel}
                      className="px-4 py-2 bg-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">Confirm Deletion</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {employeeToDelete.firstName} {employeeToDelete.lastName}?
                  This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="mt-3 px-4 py-2 bg-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Employees;
