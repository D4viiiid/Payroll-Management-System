import React, { useState, useEffect } from 'react';
import { employeeApi, eventBus } from '../services/apiService';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { optimizedMemo } from '../utils/reactOptimization';
import { logger } from '../utils/logger';
import biometricService from '../services/biometricService'; // ✅ Import bridge service
import { showSuccess, showError, showConfirm } from '../utils/toast';
import './Admin.responsive.css';

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
    // ✅ CRITICAL FIX: Check ALL displayed fields to ensure re-render when ANY field changes
    return (
      prevProps.employee._id === nextProps.employee._id &&
      prevProps.employee.firstName === nextProps.employee.firstName &&
      prevProps.employee.lastName === nextProps.employee.lastName &&
      prevProps.employee.email === nextProps.employee.email &&
      prevProps.employee.contactNumber === nextProps.employee.contactNumber &&
      prevProps.employee.status === nextProps.employee.status &&
      prevProps.employee.hireDate === nextProps.employee.hireDate &&
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [showReEnrollSection, setShowReEnrollSection] = useState(false); // For re-enrollment in edit mode
  
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
    const handleEmployeeCreated = () => {
      console.log('🎉 EmployeeList: Received employee-created event, calling fetchEmployees(true)');
      fetchEmployees(true); // ✅ Bypass cache
    };
    const handleEmployeeUpdated = () => {
      console.log('📝 EmployeeList: Received employee-updated event, calling fetchEmployees(true)');
      fetchEmployees(true); // ✅ Bypass cache
    };
    const handleEmployeeDeleted = (data) => {
      console.log('🗑️ EmployeeList: Received employee-deleted event for ID:', data.id);
      // Remove the deleted employee from the list immediately
      setEmployees(prev => prev.filter(emp => emp._id !== data.id));
      // Also fetch fresh data to ensure consistency
      console.log('🔄 EmployeeList: Calling fetchEmployees(true) after delete');
      fetchEmployees(true); // ✅ Bypass cache
    };

    console.log('🔧 EmployeeList: Registering event listeners');
    eventBus.on('employee-created', handleEmployeeCreated);
    eventBus.on('employee-updated', handleEmployeeUpdated);
    eventBus.on('employee-deleted', handleEmployeeDeleted);
    console.log('✅ EmployeeList: Event listeners registered');

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 EmployeeList: Cleaning up event listeners');
      eventBus.removeListener('employee-created', handleEmployeeCreated);
      eventBus.removeListener('employee-updated', handleEmployeeUpdated);
      eventBus.removeListener('employee-deleted', handleEmployeeDeleted);
    };
  }, []);

  const fetchEmployees = async (bypassCache = false) => {
    try {
      console.log('📡 EmployeeList: fetchEmployees called with bypassCache=', bypassCache);
      setLoading(true);
      const data = await employeeApi.getAll({ bypassCache });
      console.log('📦 EmployeeList: Received data from API:', data ? `${data.length || data.data?.length || data.employees?.length || 0} employees` : 'no data');
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
      setEmployees(employeeList);
      console.log('✅ EmployeeList: State updated with', employeeList.length, 'employees');
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
    logger.log('🔍 Testing biometric bridge connection...');
    
    // ✅ FIX: Use biometricService to check bridge health directly
    const bridgeHealthy = await biometricService.checkBridgeHealth();
    logger.log('✅ Bridge status:', bridgeHealthy);
    
    if (!bridgeHealthy) {
      throw new Error('Biometric device not available. Please ensure:\n1. Fingerprint bridge is running (START_BRIDGE.bat)\n2. ZKTeco scanner is connected');
    }

    // Alert user to prepare for fingerprint scan
    alert('📱 Device ready! Place your finger on the scanner when prompted.\n\nYou will need to scan 3 times. Wait for the green light between scans.');
    
    setFingerprintStep(1); // Show scanning status
    logger.log('👆 Starting fingerprint enrollment...');
    
    // ✅ FIX: Generate credentials FIRST before enrollment
    const generatedEmployeeId = generateEmployeeId();
    const generatedPassword = generatePassword();
    
    // ✅ FIX: Use bridge service to enroll fingerprint with temporary employee data
    const enrollResult = await biometricService.enrollEmployee({
      _id: generatedEmployeeId,
      firstName: formData.firstName || 'New',
      lastName: formData.lastName || 'Employee',
      email: formData.email || `${generatedEmployeeId}@temp.com`
    });
    
    logger.log('📸 Fingerprint enrollment result:', enrollResult);
    
    if (!enrollResult.success) {
      throw new Error(enrollResult.message || enrollResult.error || 'Failed to enroll fingerprint');
    }
    
    // Store the captured template in state
    setCapturedFingerprintTemplate(enrollResult.template || enrollResult.fingerprintTemplate);
    logger.log('� Fingerprint template stored in state');

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
    alert('✅ Fingerprint enrolled successfully!\n\nEmployee ID: ' + generatedEmployeeId + '\nPassword: ' + generatedPassword + '\n\nPlease fill in the remaining employee details and click "Add Employee".');
    
    // Auto-hide success message
    setTimeout(() => {
      setFingerprintStep(0);
      setIsEnrollingFingerprint(false);
    }, 3000);
    
  } catch (error) {
    logger.error('❌ Fingerprint enrollment error:', error);
    
    // Clear any stored template on error
    setCapturedFingerprintTemplate(null);
    
    let userMessage = error.message || 'Unknown error';
    
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Bridge server not available'))) {
      userMessage = 'Cannot connect to fingerprint bridge. Please make sure:\n1. Fingerprint bridge is running (START_BRIDGE.bat)\n2. ZKTeco scanner is connected\n3. Bridge is accessible at https://localhost:3003';
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

      // ✅ FIX: Build employeeData differently for edit vs create
      let employeeData;
      
      if (editingEmployee) {
        // EDIT MODE: Only send fields that can be updated (NO username/password/employeeId)
        employeeData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          hireDate: formData.date,
          salary: parseFloat(formData.salary),
          status: formData.status
          // ❌ DON'T send: username, password, employeeId, plainTextPassword
        };
      } else {
        // CREATE MODE: Send all fields including credentials
        employeeData = {
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
          plainTextPassword: formData.plainTextPassword,
          fingerprintEnrolled: false
        };
      }

      logger.log('📤 Submitting employee data:', employeeData);

      let createdEmployee;
      
      if (editingEmployee) {
        // Update employee and get the updated data
        const updateResult = await employeeApi.update(editingEmployee._id, employeeData);
        
        if (updateResult.error) {
          throw new Error(updateResult.error);
        }
        
        // ✅ CRITICAL FIX: Update local state immediately with the updated employee
        const updatedEmployee = updateResult.data || updateResult;
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => 
            emp._id === editingEmployee._id ? { ...emp, ...updatedEmployee } : emp
          )
        );
        
        // ✅ Fetch fresh data from server to ensure consistency
        await fetchEmployees(true);
        
        // Close modal after state is updated
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
      
      // ✅ DON'T call fetchEmployees here - the event bus will handle it
      // The 'employee-created' or 'employee-updated' event will trigger the event listener
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
    const confirmed = await showConfirm('Are you sure you want to delete this employee?', {
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: '#ef4444' // Red for delete
    });
    
    if (confirmed) {
      try {
        setLoading(true);
        const result = await employeeApi.delete(id);
        if (!result.error) {
          showSuccess('Employee deleted successfully!');
          // ✅ DON'T call fetchEmployees here - the event bus will handle it
          // The 'employee-deleted' event will trigger the event listener above
        } else {
          // Handle specific error: Employee already deleted
          if (result.error.includes('Employee not found')) {
            alert('This employee has already been deleted. Refreshing list...');
            // Remove from local state and refresh with BYPASS CACHE
            setEmployees(prev => prev.filter(emp => emp._id !== id));
            await fetchEmployees(true); // ✅ Manual fetch only for error case
          } else {
            alert('Error: ' + result.error);
          }
        }
        setError(null);
      } catch (err) {
        setError(err.message);
        // Handle specific error: Employee already deleted
        if (err.message.includes('Employee not found')) {
          alert('This employee has already been deleted. Refreshing list...');
          // Remove from local state and refresh with BYPASS CACHE
          setEmployees(prev => prev.filter(emp => emp._id !== id));
          await fetchEmployees(true); // ✅ Manual fetch only for error case
        } else {
          alert('Error: ' + err.message);
        }
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
    setShowReEnrollSection(false); // Reset re-enrollment section
    setCapturedFingerprintTemplate(null); // Clear captured template
  };

  // === RE-ENROLLMENT HANDLER (For Edit Mode) ===
  const handleReEnrollFingerprint = async () => {
    if (!editingEmployee) {
      showError('No employee selected for re-enrollment');
      return;
    }

    // Check enrollment count limit
    if (editingEmployee.fingerprintEnrollmentCount >= 3) {
      showError('Maximum fingerprint enrollment limit (3) reached for this employee');
      return;
    }

    // Confirm re-enrollment
    const confirmed = await showConfirm(
      `Re-enroll fingerprint for ${editingEmployee.firstName} ${editingEmployee.lastName}?\n\n` +
      `Current enrollments: ${editingEmployee.fingerprintEnrollmentCount || 0}/3\n\n` +
      `This will replace the existing fingerprint template.`,
      {
        confirmText: 'Re-Enroll',
        cancelText: 'Cancel',
        confirmColor: '#f59e0b' // Orange color for re-enrollment
      }
    );

    if (!confirmed) return;

    setShowReEnrollSection(true);
    setFingerprintStep(0);
    setCapturedFingerprintTemplate(null);
    
    // ✅ FIX BUG #17: Start re-enrollment with EXISTING employee data (don't generate new ID)
    await handleFingerprintReEnrollment();
  };

  // === NEW: Fingerprint Re-Enrollment (uses existing employee credentials) ===
  const handleFingerprintReEnrollment = async () => {
    setIsEnrollingFingerprint(true);
    setFingerprintStep(1); // Show scanning status
    logger.log('👆 Starting fingerprint RE-enrollment for existing employee...');
    logger.log('📋 Employee data:', {
      _id: editingEmployee._id,
      employeeId: editingEmployee.employeeId,
      name: `${editingEmployee.firstName} ${editingEmployee.lastName}`
    });
    
    try {
      // ✅ FIX BUG #22: Pass actual employeeId (EMP-XXXX), NOT MongoDB _id
      // Bridge expects employeeId for enrollment, NOT MongoDB ObjectId
      const enrollResult = await biometricService.enrollEmployee({
        _id: editingEmployee.employeeId,        // ✅ Use employeeId as _id for bridge
        employeeId: editingEmployee.employeeId, // ✅ Actual employee ID (e.g., EMP-6470)
        firstName: editingEmployee.firstName,
        lastName: editingEmployee.lastName,
        email: editingEmployee.email
      });
      
      logger.log('📸 Fingerprint re-enrollment result:', enrollResult);
      
      if (!enrollResult.success) {
        throw new Error(enrollResult.message || enrollResult.error || 'Failed to re-enroll fingerprint');
      }
      
      // Store the captured template in state
      setCapturedFingerprintTemplate(enrollResult.template || enrollResult.fingerprintTemplate);
      logger.log('✅ Fingerprint template stored in state (re-enrollment)');
      
      setFingerprintStep(2); // Success
      logger.log('✅ Fingerprint re-captured! Credentials remain unchanged.');
      showSuccess('✅ Fingerprint re-enrolled successfully! Click "Update Employee" to save.');
      
      // Auto-submit the re-enrollment
      setTimeout(async () => {
        await handleSubmitReEnrollment();
      }, 1500);
      
    } catch (error) {
      logger.error('❌ Fingerprint re-enrollment error:', error);
      
      // Clear any stored template on error
      setCapturedFingerprintTemplate(null);
      
      let userMessage = error.message || 'Unknown error';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userMessage = 'Cannot connect to fingerprint service. Please make sure:\n1. Biometric device is connected\n2. Bridge server is running (START_BRIDGE.bat)\n3. Backend server is running (port 5000)';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Fingerprint scan timed out. Please try again and place your finger firmly on the scanner.';
      }
      
      showError('❌ Fingerprint Re-enrollment Failed:\n' + userMessage);
      
      setShowReEnrollSection(false);
      setFingerprintStep(0);
    } finally {
      setIsEnrollingFingerprint(false);
    }
  };

  // === SUBMIT RE-ENROLLMENT (Update existing employee with new fingerprint) ===
  const handleSubmitReEnrollment = async () => {
    if (!capturedFingerprintTemplate) {
      showError('No fingerprint captured. Please enroll fingerprint first.');
      return;
    }

    if (!editingEmployee) {
      showError('No employee selected');
      return;
    }

    try {
      setLoading(true);
      
      logger.log('🔄 Submitting fingerprint re-enrollment for:', editingEmployee.employeeId);
      
      // Send only the fingerprint template to the backend
      const response = await employeeApi.update(editingEmployee._id, {
        fingerprintTemplate: capturedFingerprintTemplate,
        fingerprintEnrolled: true
      });

      logger.log('✅ Re-enrollment response:', response);

      // ✅ CRITICAL FIX: Update local state immediately
      const updatedEmployee = response.data || response;
      setEmployees(prevEmployees => 
        prevEmployees.map(emp => 
          emp._id === editingEmployee._id 
            ? { ...emp, ...updatedEmployee, fingerprintEnrolled: true } 
            : emp
        )
      );
      
      // Update editing employee state to reflect changes in modal
      setEditingEmployee(prev => ({
        ...prev,
        ...updatedEmployee,
        fingerprintEnrolled: true
      }));

      showSuccess(`Fingerprint re-enrolled successfully for ${editingEmployee.firstName} ${editingEmployee.lastName}!`);
      
      // Update local form state
      setFormData(prev => ({
        ...prev,
        fingerprintEnrolled: true
      }));

      // Reset re-enrollment section
      setShowReEnrollSection(false);
      setFingerprintStep(0);
      setCapturedFingerprintTemplate(null);

      // Refresh employee list to ensure consistency
      await fetchEmployees(true);
      
    } catch (error) {
      logger.error('❌ Re-enrollment error:', error);
      showError(error.message || 'Failed to re-enroll fingerprint');
    } finally {
      setLoading(false);
    }
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
      {/* Hamburger Menu Button for Mobile/Tablet */}
      <button
        className="hamburger-menu-button"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Toggle navigation menu"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Use Unified Admin Sidebar */}
      <AdminSidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content Wrapper */}
      <div className="admin-main-content">
        {/* Use Unified Admin Header */}
        <AdminHeader />
        
        {/* Content Area */}
        <div className="admin-content-area">
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
      </div> {/* Close admin-content-area */}
      </div> {/* Close admin-main-content */}

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

                    {/* Re-Enroll Fingerprint Button (Only in Edit Mode) */}
                    <div className="col-md-6">
                      <label className="form-label">Fingerprint Actions</label>
                      <button
                        type="button"
                        className="btn btn-warning w-100"
                        onClick={handleReEnrollFingerprint}
                        disabled={isEnrollingFingerprint}
                      >
                        <i className="fas fa-fingerprint me-2"></i>
                        {formData.fingerprintEnrolled ? 'Re-Enroll Fingerprint' : 'Enroll Fingerprint'}
                      </button>
                      {editingEmployee?.fingerprintEnrollmentCount > 0 && (
                        <small className="text-muted d-block mt-1">
                          Enrollments: {editingEmployee.fingerprintEnrollmentCount}/3
                        </small>
                      )}
                    </div>

                    {/* Re-Enrollment Section (Shown when re-enrolling) */}
                    {showReEnrollSection && (
                      <div className="col-12 mt-3">
                        <div className="card border-primary">
                          <div className="card-header bg-primary text-white">
                            <h6 className="mb-0">
                              <i className="fas fa-fingerprint me-2"></i>
                              Fingerprint Re-Enrollment
                            </h6>
                          </div>
                          <div className="card-body text-center">
                            {fingerprintStep === 0 && (
                              <div className="alert alert-info">
                                <i className="fas fa-info-circle me-2"></i>
                                Place your finger on the scanner to begin enrollment.
                              </div>
                            )}
                            {fingerprintStep === 1 && (
                              <div className="alert alert-warning">
                                <div className="spinner-border text-warning me-2" role="status"></div>
                                <strong>Scanning fingerprint...</strong>
                                <p className="mb-0 mt-2">Please keep your finger on the scanner</p>
                              </div>
                            )}
                            {fingerprintStep === 2 && capturedFingerprintTemplate && (
                              <>
                                <div className="alert alert-success">
                                  <i className="fas fa-check-circle me-2"></i>
                                  <strong>Fingerprint captured successfully!</strong>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-success btn-lg"
                                  onClick={handleSubmitReEnrollment}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-2"></span>
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-save me-2"></i>
                                      Save New Fingerprint
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

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


