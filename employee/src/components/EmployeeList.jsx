import React, { useState, useEffect } from 'react';
import { employeeApi, eventBus } from '../services/apiService';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { optimizedMemo } from '../utils/reactOptimization';
import { logger } from '../utils/logger';

// Memoized Employee Row Component for better performance
const EmployeeRow = optimizedMemo(
  ({ employee, index, onEdit, onDelete }) => (
    <tr key={employee._id} className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
      <td className="px-4 py-3 whitespace-nowrap border">{employee.employeeId}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        {employee.firstName} {employee.lastName}
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          employee?.status === 'regular' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {employee?.status === 'regular' ? 'Regular' : 
           employee?.status === 'oncall' ? 'On Call' : 'Unknown'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">{employee.email}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        {employee.contactNumber ? employee.contactNumber : 'N/A'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">
        {new Date(employee.hireDate || employee.date).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          employee.fingerprintEnrolled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {employee.fingerprintEnrolled ? 'Enrolled' : 'Not Enrolled'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(employee)}
            className="bg-pink-400 text-black px-2 py-1 rounded text-xs hover:bg-pink-500 transition duration-200"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(employee._id)}
            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition duration-200"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  ),
  (prevProps, nextProps) => {
    // Only re-render if employee data changes
    return (
      prevProps.employee._id === nextProps.employee._id &&
      prevProps.employee.firstName === nextProps.employee.firstName &&
      prevProps.employee.lastName === nextProps.employee.lastName &&
      prevProps.employee.status === nextProps.employee.status &&
      prevProps.employee.fingerprintEnrolled === nextProps.employee.fingerprintEnrolled &&
      prevProps.index === nextProps.index
    );
  },
  'EmployeeRow'
);

const Employee = () => {
  // === AUTO-GENERATE FUNCTIONS ===
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Employee ID with EMP- prefix and 4 random numbers
  const generateEmployeeId = () => {
    const random = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `EMP-${random}`;
  };

  // === STATE MANAGEMENT ===
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEnrollingFingerprint, setIsEnrollingFingerprint] = useState(false);
  const [fingerprintStep, setFingerprintStep] = useState(0); // 0: not started, 1: scanning, 2: success
  const [capturedFingerprintTemplate, setCapturedFingerprintTemplate] = useState(null); // Store captured template
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '', // EMPTY by default
    contactNumber: '', // ✅ EMPTY BY DEFAULT
    date: new Date().toISOString().split('T')[0],
    salary: '',
    status: 'regular',
    username: '', // EMPTY by default
    password: '', // EMPTY by default
    plainTextPassword: '', // ✅ ADD PLAIN TEXT PASSWORD FIELD
    fingerprintEnrolled: false
  });

  useEffect(() => {
    fetchEmployees();

    // Listen to eventBus events for real-time updates
    const handleEmployeeCreated = () => fetchEmployees();
    const handleEmployeeUpdated = () => fetchEmployees();
    const handleEmployeeDeleted = (data) => {
      // Remove the deleted employee from the list
      setEmployees(prev => prev.filter(emp => emp._id !== data.id));
    };

    eventBus.on('employee-created', handleEmployeeCreated);
    eventBus.on('employee-updated', handleEmployeeUpdated);
    eventBus.on('employee-deleted', handleEmployeeDeleted);

    // Cleanup listeners on unmount
    return () => {
      eventBus.removeListener('employee-created', handleEmployeeCreated);
      eventBus.removeListener('employee-updated', handleEmployeeUpdated);
      eventBus.removeListener('employee-deleted', handleEmployeeDeleted);
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeApi.getAll();
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
      setEmployees(employeeList);
      setError(null);
    } catch (err) {
      logger.error('Error fetching employees:', err);
      setError(err.message || 'Failed to fetch employees.');
    } finally {
      setLoading(false);
    }
  };

  // === REAL FINGERPRINT ENROLLMENT ===
const handleFingerprintEnrollment = async () => {
  setIsEnrollingFingerprint(true);
  setFingerprintStep(0);
  
  try {
    logger.log('🔍 Testing biometric device connection...');
    
    // Test device connection first
    const healthCheck = await fetch('/api/biometric-integrated/device/health');
    
    if (!healthCheck.ok) {
      throw new Error('Biometric device not connected');
    }
    
    const healthData = await healthCheck.json();
    logger.log('✅ Device status:', healthData);
    
    if (!healthData.success || !healthData.connected) {
      throw new Error('Biometric device not available');
    }

    // Alert user to prepare for fingerprint scan
    alert('📱 Device ready! Place your finger on the scanner when prompted.\n\nYou will need to scan 3 times. Wait for the green light between scans.');
    
    setFingerprintStep(1); // Show scanning status
    logger.log('👆 Starting fingerprint capture...');
    
    // Call pre-enroll endpoint to capture fingerprint BEFORE creating employee
    const enrollResponse = await fetch('/api/biometric-integrated/pre-enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!enrollResponse.ok) {
      throw new Error('Fingerprint capture failed');
    }
    
    const enrollResult = await enrollResponse.json();
    logger.log('📸 Fingerprint capture result:', enrollResult);
    
    if (!enrollResult.success) {
      throw new Error(enrollResult.message || 'Failed to capture fingerprint');
    }
    
    // Store the captured template in state
    setCapturedFingerprintTemplate(enrollResult.template);
    logger.log('💾 Fingerprint template stored in state (length:', enrollResult.templateLength, ')');

    // Generate employee credentials AFTER successful fingerprint capture
    logger.log('🔑 Generating employee credentials...');
    const generatedEmployeeId = generateEmployeeId();
    const generatedPassword = generatePassword();
    
    // Update form data with generated credentials and mark for fingerprint enrollment
    setFormData(prev => ({
      ...prev,
      employeeId: generatedEmployeeId,
      username: generatedEmployeeId,
      password: generatedPassword,
      plainTextPassword: generatedPassword, // ✅ STORE PLAIN TEXT PASSWORD
      fingerprintEnrolled: true // Mark that fingerprint was enrolled
    }));
    
    setFingerprintStep(2); // Success
    logger.log('✅ Fingerprint captured and credentials generated!');
    alert('✅ Fingerprint captured successfully! You can now fill in the employee details and click "Add Employee".');
    
    // Auto-hide success message
    setTimeout(() => {
      setFingerprintStep(0);
      setIsEnrollingFingerprint(false);
    }, 3000);
    
  } catch (error) {
    logger.error('❌ Fingerprint enrollment error:', error);
    
    // Clear any stored template on error
    setCapturedFingerprintTemplate(null);
    
    let userMessage = error.message;
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      userMessage = 'Cannot connect to fingerprint service. Please make sure the biometric device is connected and the backend server is running.';
    }
    
    alert('❌ Fingerprint Enrollment Failed:\n' + userMessage);
    setFingerprintStep(0);
    setIsEnrollingFingerprint(false);
    
    // Reset form data
    setFormData(prev => ({
      ...prev,
      employeeId: '',
      username: '',
      password: '',
      plainTextPassword: '', // ✅ CLEAR PLAIN TEXT PASSWORD
      fingerprintEnrolled: false
    }));
  }
};
  // === SEARCH FUNCTIONALITY ===
  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const employeeId = employee.employeeId?.toLowerCase() || '';
    const contact = employee.contactNumber?.toLowerCase() || '';
    return fullName.includes(searchLower) || employeeId.includes(searchLower) || contact.includes(searchLower);
  });

  // === FORM HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    logger.log(`Changing ${name} to:`, value);
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleAddEmployeeClick = () => {
    setShowAddForm(true);
    setShowEditForm(false);
    setEditingEmployee(null);
    // COMPLETELY EMPTY CREDENTIALS - no pre-generation
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '', // EMPTY - will generate AFTER fingerprint
      contactNumber: '', // ✅ EMPTY STRING BY DEFAULT
      date: new Date().toISOString().split('T')[0],
      salary: '',
      status: 'regular',
      username: '', // EMPTY - will generate AFTER fingerprint
      password: '', // EMPTY - will generate AFTER fingerprint
      plainTextPassword: '', // ✅ EMPTY PLAIN TEXT PASSWORD
      fingerprintEnrolled: false
    });
      setCapturedFingerprintTemplate(null); // Clear stored template
    setFingerprintStep(0);
  };

  const handleEdit = (employee) => {
    logger.log('Editing employee:', employee);
    setEditingEmployee(employee);
    setShowEditForm(true);
    setShowAddForm(false);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      employeeId: employee.employeeId || '',
      contactNumber: employee.contactNumber || '', // ✅ GET FROM EMPLOYEE OBJECT
      date: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salary: employee.salary || '',
      status: employee.status || 'regular',
      username: employee.username || employee.employeeId || '',
      password: employee.password || '',
      plainTextPassword: employee.plainTextPassword || '', // ✅ RETRIEVE PLAIN TEXT PASSWORD
      fingerprintEnrolled: employee.fingerprintEnrolled || false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // VALIDATION: Check if fingerprint flag is set for new employees
      if (!editingEmployee && !formData.fingerprintEnrolled) {
        alert('Please click "Enroll Fingerprint" button first to generate credentials!');
        setLoading(false);
        return;
      }

      // VALIDATION: Check if credentials are filled
      if (!editingEmployee && (!formData.employeeId || !formData.username || !formData.password)) {
        alert('Please enroll fingerprint to generate credentials first!');
        setLoading(false);
        return;
      }

      // ✅ ADDED: Contact Number Validation
      if (!formData.contactNumber.trim()) {
        alert('Please enter contact number!');
        setLoading(false);
        return;
      }

      const employeeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        employeeId: formData.employeeId,
        contactNumber: formData.contactNumber,
        hireDate: formData.date,
        salary: parseFloat(formData.salary),
        status: formData.status,
        username: formData.username,
        password: formData.password,
        plainTextPassword: formData.plainTextPassword, // ✅ INCLUDE PLAIN TEXT PASSWORD
        fingerprintEnrolled: false // Will be set to true after actual enrollment
      };

      logger.log('📤 Submitting employee data:', employeeData);

      let createdEmployee;
      
      if (editingEmployee) {
        await employeeApi.update(editingEmployee._id, employeeData);
        setShowEditForm(false);
        setEditingEmployee(null);
        alert('Employee updated successfully!');
      } else {
        // Create employee first
        const createResult = await employeeApi.create(employeeData);
        logger.log('✅ Employee created:', createResult);
        
        if (createResult.error) {
          throw new Error(createResult.error);
        }
        
        createdEmployee = createResult;
        
        // If fingerprint was pre-captured, save it directly
        if (formData.fingerprintEnrolled && capturedFingerprintTemplate) {
          logger.log('💾 Saving pre-captured fingerprint template...');
          
          try {
            const updateData = {
              fingerprintTemplate: capturedFingerprintTemplate,
              fingerprintTemplates: [{
                template: capturedFingerprintTemplate,
                enrolledAt: new Date().toISOString(),
                finger: 'unknown'
              }],
              fingerprintEnrolled: true,
              biometricStatus: 'enrolled'
            };
            
            await employeeApi.update(createdEmployee._id, updateData);
            alert('✅ Employee added and fingerprint enrolled successfully!');
            setCapturedFingerprintTemplate(null);
          } catch (enrollError) {
            logger.error('Fingerprint save error:', enrollError);
            alert('⚠️ Employee created but fingerprint save failed: ' + enrollError.message);
          }
        } else {
          alert('Employee added successfully!');
        }
        
        setShowAddForm(false);
      }
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        employeeId: '',
        contactNumber: '',
        date: new Date().toISOString().split('T')[0],
        salary: '',
        status: 'regular',
        username: '',
        password: '',
        plainTextPassword: '', // ✅ RESET PLAIN TEXT PASSWORD
        fingerprintEnrolled: false
      });
      setCapturedFingerprintTemplate(null); // Clear stored template
      
      await fetchEmployees();
      setError(null);
    } catch (err) {
      logger.error('Error saving employee:', err);
      setError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        setLoading(true);
        const result = await employeeApi.delete(id);
        if (!result.error) {
          // Immediately remove the employee from the local state
          setEmployees(prev => prev.filter(emp => emp._id !== id));
          alert('Employee deleted successfully!');
        } else {
          alert('Error: ' + result.error);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingEmployee(null);
    setFingerprintStep(0);
    setIsEnrollingFingerprint(false);
  };

  const handleRegenerateCredentials = () => {
    if (!formData.fingerprintEnrolled) {
      alert('Please enroll fingerprint first!');
      return;
    }
    const employeeId = generateEmployeeId();
    const password = generatePassword();
    setFormData(prev => ({
      ...prev,
      employeeId: employeeId,
      username: employeeId, // Username same as Employee ID
      password: password,
      plainTextPassword: password // ✅ UPDATE PLAIN TEXT PASSWORD
    }));
  };

  // === RENDER ===
  if (error) return (
    <div className="container mt-4">
      <div className="alert alert-danger">
        <h4 className="alert-heading">Error!</h4>
        <p>{error}</p>
        <hr />
        <button className="btn btn-danger" onClick={fetchEmployees}>Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Use Unified Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content - ADD MARGIN LEFT TO ACCOMMODATE FIXED SIDEBAR */}
      <div 
        className="flex-1 overflow-auto" 
        style={{ 
          marginLeft: 280,
          minHeight: '100vh'
        }}
      >
        {/* Use Unified Admin Header */}
        <AdminHeader />
        
        <div className="p-4">
          <div className="card shadow-sm" style={{ borderRadius: '15px', border: 'none' }}>
            <div className="card-header" style={{ borderRadius: '0', padding: '20px', background: 'transparent' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1" style={{ fontWeight: 'bold', color: 'black', display: 'flex', alignItems: 'center', gap: 8, fontSize: '2rem', fontFamily: 'sans-serif' }}>
                    <i className="fas fa-users me-2"></i>
                    Employee Management
                  </h2>
                  <p className="mb-0" style={{ fontSize: '16px', opacity: '0.9', color: 'black' }}>
                    Comprehensive employee database and management system
                  </p>
                </div>
                <button 
                  className="btn" 
                  onClick={handleAddEmployeeClick}
                  style={{ 
                    backgroundColor: '#f06a98', 
                    border: 'none', 
                    color: '#ffffff', 
                    padding: '10px 20px', 
                    fontSize: '1rem',
                    borderRadius: '8px'
                  }}
                >
                  <i className="fas fa-plus me-2"></i>Add Employee
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4">
                <div className="input-group" style={{ maxWidth: '400px' }}>
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, employee ID, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* MOVED TABLE SECTION UP - REDUCED MARGIN TOP */}
            <div className="card-body" style={{ padding: '10px 20px' }}>
              {/* Employee List Table - PAYROLL STYLE DESIGN */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md" style={{ marginTop: '10px' }}>
                  <h2 className="text-xl font-semibold text-gray-700 mb-3">Employee Records</h2>
                  <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date Hired</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Fingerprint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 divide-y divide-gray-200">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            No employees found {searchTerm && 'matching your search'}
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((employee, index) => (
                          <EmployeeRow
                            key={employee._id}
                            employee={employee}
                            index={index}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: '1.3rem', color: '#2c3e50' }}>
                  <i className="fas fa-user-plus me-2"></i>
                  Add New Employee
                </h5>
                <button type="button" className="btn-close" onClick={handleCancel}></button>
              </div>
              <div className="modal-body" style={{ padding: '30px' }}>
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    {/* Personal Information */}
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input 
                        type="text" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name *</label>
                      <input 
                        type="text" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact Number *</label>
                      <input 
                        type="tel" 
                        name="contactNumber" 
                        value={formData.contactNumber} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="09123456789"
                        required 
                      />
                    </div>

                    {/* Employment Details */}
                    <div className="col-md-6">
                      <label className="form-label">Status *</label>
                      <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required
                      >
                        <option value="regular">Regular</option>
                        <option value="oncall">On Call</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date Hired *</label>
                      <input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>

                    {/* Biometric Enrollment - MUST DO FIRST - NOW WITH SMALLER BUTTON */}
                    <div className="col-12">
                      <label className="form-label">Biometric Enrollment *</label>
                      <div className="text-center border rounded p-3 bg-light">
                        <button
                          type="button"
                          onClick={handleFingerprintEnrollment}
                          disabled={isEnrollingFingerprint || formData.fingerprintEnrolled}
                          className={`btn ${formData.fingerprintEnrolled ? 'btn-success' : 'btn-primary'}`}
                          style={{ 
                            minWidth: '180px',
                            padding: '8px 16px',
                            fontSize: '0.9rem'
                          }}
                        >
                          {isEnrollingFingerprint ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-2"></i>
                              {fingerprintStep === 1 ? 'Scanning...' : 'Processing...'}
                            </>
                          ) : formData.fingerprintEnrolled ? (
                            <>
                              <i className="fas fa-check me-2"></i>
                              Fingerprint Enrolled
                            </>
                          ) : (
                            <>
                              <i className="fas fa-fingerprint me-2"></i>
                              Enroll Fingerprint
                            </>
                          )}
                        </button>
                        
                        {/* Fingerprint Status Messages - CENTERED */}
                        {fingerprintStep === 1 && (
                          <div className="alert alert-info mt-2 mb-0 p-2 text-center">
                            <i className="fas fa-info-circle me-2"></i>
                            Please touch your finger on the biometric scanner...
                          </div>
                        )}
                        
                        {fingerprintStep === 2 && (
                          <div className="alert alert-success mt-2 mb-0 p-2 text-center">
                            <i className="fas fa-check-circle me-2"></i>
                            Fingerprint enrolled successfully! Employee ID and credentials generated.
                          </div>
                        )}
                        
                        {!formData.fingerprintEnrolled && fingerprintStep === 0 && (
                          <small className="text-danger d-block mt-2 text-center">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            Fingerprint enrollment is required to generate Employee ID
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Auto-generated Credentials - ALWAYS VISIBLE pero READONLY until fingerprint */}
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-header">
                          <h6 className="mb-0">
                            <i className="fas fa-key me-2"></i>
                            Employee Credentials
                            {formData.fingerprintEnrolled && (
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-secondary float-end" 
                                onClick={handleRegenerateCredentials}
                              >
                                <i className="fas fa-sync me-1"></i>Regenerate
                              </button>
                            )}
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label">Employee ID *</label>
                              <input 
                                type="text" 
                                name="employeeId" 
                                value={formData.employeeId} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // ALWAYS READONLY - cannot input manually
                                placeholder="Will be generated after fingerprint enrollment"
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Username *</label>
                              <input 
                                type="text" 
                                name="username" 
                                value={formData.username} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // ALWAYS READONLY - cannot input manually
                                placeholder="Will be generated after fingerprint enrollment"
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Password *</label>
                              <input 
                                type="text" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // ALWAYS READONLY - cannot input manually
                                placeholder="Will be generated after fingerprint enrollment"
                              />
                            </div>
                          </div>
                          <div className="text-muted mt-2" style={{ color: 'black', fontSize: '0.9rem' }}>
                            <i className="fas fa-info-circle me-1"></i>
                            Employee ID and username will be auto-generated after fingerprint enrollment and cannot be changed.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer mt-4">
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn" 
                      style={{ backgroundColor: '#f06a98', color: 'white' }} 
                      disabled={loading || !formData.fingerprintEnrolled}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        'Add Employee'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: '1.3rem', color: '#2c3e50' }}>
                  <i className="fas fa-user-edit me-2"></i>
                  Edit Employee
                </h5>
                <button type="button" className="btn-close" onClick={handleCancel}></button>
              </div>
              <div className="modal-body" style={{ padding: '30px' }}>
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input 
                        type="text" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name *</label>
                      <input 
                        type="text" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact Number *</label>
                      <input 
                        type="tel" 
                        name="contactNumber" 
                        value={formData.contactNumber} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status *</label>
                      <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required
                      >
                        <option value="regular">Regular</option>
                        <option value="oncall">On Call</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date Hired *</label>
                      <input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required 
                      />
                    </div>
                    
                    {/* Biometric Status (Read-only in edit) */}
                    <div className="col-md-6">
                      <label className="form-label">Fingerprint Status</label>
                      <div className={`p-2 rounded text-center ${formData.fingerprintEnrolled ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        <i className={`fas ${formData.fingerprintEnrolled ? 'fa-check-circle' : 'fa-times-circle'} me-2`}></i>
                        {formData.fingerprintEnrolled ? 'Enrolled' : 'Not Enrolled'}
                      </div>
                    </div>

                    {/* Credentials - ALL READONLY in edit mode */}
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-header">
                          <h6 className="mb-0">
                            <i className="fas fa-key me-2"></i>
                            Employee Credentials
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label">Employee ID *</label>
                              <input 
                                type="text" 
                                name="employeeId" 
                                value={formData.employeeId} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // ALWAYS READONLY in edit mode
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Username *</label>
                              <input 
                                type="text" 
                                name="username" 
                                value={formData.username} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // ALWAYS READONLY in edit mode
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Password *</label>
                              <input 
                                type="text" 
                                name="password" 
                                value={formData.plainTextPassword || '(Password is encrypted - use reset if needed)'} 
                                onChange={handleInputChange} 
                                className="form-control" 
                                required 
                                readOnly // READONLY in edit mode too
                              />
                            </div>
                          </div>
                          <div className="text-muted mt-2" style={{ color: 'black', fontSize: '0.9rem' }}>
                            <i className="fas fa-info-circle me-1"></i>
                            Employee credentials cannot be changed once generated.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer mt-4">
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn" 
                      style={{ backgroundColor: '#f06a98', color: 'white' }} 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Employee'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employee;


