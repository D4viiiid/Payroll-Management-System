import { logger } from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const buildEmployeePayload = (employeeData) => {
  logger.log('🔧 Building payload with data:', employeeData);
  logger.log('📞 Contact Number in payload:', employeeData.contactNumber);
  
  const dateInput = employeeData.hireDate || employeeData.date;
  let hireDate = undefined;
  if (dateInput) {
    const d = new Date(dateInput);
    hireDate = isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  
  return {
    firstName: employeeData.firstName?.trim(),
    lastName: employeeData.lastName?.trim(),
    email: employeeData.email?.trim(),
    // ✅ CONTACT NUMBER - FIXED
    contactNumber: employeeData.contactNumber !== undefined && employeeData.contactNumber !== '' ? String(employeeData.contactNumber).trim() : '',
    status: employeeData.status || 'regular',
    position: employeeData.position !== undefined ? employeeData.position : undefined,
    department: employeeData.department !== undefined ? employeeData.department : undefined,
    employeeId: employeeData.employeeId !== undefined && employeeData.employeeId !== '' ? String(employeeData.employeeId).trim() : undefined,
    salary: employeeData.salary !== undefined && employeeData.salary !== '' ? Number(employeeData.salary) : undefined,
    hireDate,
    // ✅ FINGERPRINT FIELDS
    fingerprintEnrolled: employeeData.fingerprintEnrolled || false,
    fingerprintTemplate: employeeData.fingerprintTemplate || null,
    // ACCOUNT FIELDS
    username: employeeData.username,
    password: employeeData.password
  };
};

const extractError = async (response) => {
  try {
    const data = await response.json();
    const missing = data.missingFields?.length ? ` Missing: ${data.missingFields.join(', ')}` : '';
    const details = Array.isArray(data.details) && data.details.length ? ` Details: ${data.details.join('; ')}` : '';
    return data.message ? `${data.message}.${missing}${details}` : `HTTP ${response.status}`;
  } catch (_) {
    return `HTTP ${response.status}`;
  }
};

const shouldRetryWithDefaults = (message) => {
  if (!message) return false;
  const msg = message.toLowerCase();
  return msg.includes('missing required fields') && (msg.includes('position') || msg.includes('department'));
};

// Create a new employee
export const createEmployee = async (employeeData) => {
  try {
    logger.log('🚀 SENDING TO API:', employeeData);
    const payload = buildEmployeePayload(employeeData);
    logger.log('📦 FINAL PAYLOAD:', payload);
    
    let response = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errMsg = await extractError(response);
      if (shouldRetryWithDefaults(errMsg)) {
        const retryPayload = { 
          ...payload, 
          position: payload.position || 'Employee', 
          department: payload.department || 'General',
          contactNumber: payload.contactNumber || ''
        };
        response = await fetch(`${API_URL}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload),
        });
        if (response.ok) return await response.json();
        throw new Error(await extractError(response));
      }
      throw new Error(errMsg);
    }
    const result = await response.json();
    logger.log('✅ API RESPONSE:', result);
    return result;
  } catch (error) {
    logger.error('❌ Error creating employee:', error);
    throw new Error(`Error creating employee: ${error.message}`);
  }
};

// Get all employees
export const getAllEmployees = async () => {
  try {
    logger.log('📡 Fetching employees...');
    const response = await fetch(`${API_URL}/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    const data = await response.json();
    logger.log('📊 EMPLOYEES DATA:', data);
    
    // Add default values for missing fields
    const employeesWithDefaults = data.map(employee => ({
      ...employee,
      contactNumber: employee.contactNumber || 'N/A',
      status: employee.status || 'regular',
      fingerprintEnrolled: employee.fingerprintEnrolled || false,
      username: employee.username || employee.employeeId,
      password: employee.password || '********'
    }));
    
    logger.log('🎯 EMPLOYEES WITH DEFAULTS:', employeesWithDefaults);
    return employeesWithDefaults;
  } catch (error) {
    logger.error('❌ Error fetching employees:', error);
    throw new Error(`Error fetching employees: ${error.message}`);
  }
};

// Get employee by ID
export const getEmployeeById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/employees/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee');
    }
    const data = await response.json();
    
    // Add default values for single employee too
    const employeeWithDefaults = {
      ...data,
      contactNumber: data.contactNumber || 'N/A',
      status: data.status || 'regular',
      fingerprintEnrolled: data.fingerprintEnrolled || false,
      username: data.username || data.employeeId,
      password: data.password || '********'
    };
    
    return employeeWithDefaults;
  } catch (error) {
    throw new Error(`Error fetching employee: ${error.message}`);
  }
};

// Update employee
export const updateEmployee = async (id, updateData) => {
  try {
    logger.log('🔄 Updating employee:', updateData);
    const payload = buildEmployeePayload(updateData);
    let response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errMsg = await extractError(response);
      if (shouldRetryWithDefaults(errMsg)) {
        const retryPayload = { 
          ...payload, 
          position: payload.position || 'Employee', 
          department: payload.department || 'General',
          contactNumber: payload.contactNumber || ''
        };
        response = await fetch(`${API_URL}/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload),
        });
        if (response.ok) return await response.json();
        throw new Error(await extractError(response));
      }
      throw new Error(errMsg);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error updating employee: ${error.message}`);
  }
};

// Delete employee
export const deleteEmployee = async (id) => {
  try {
    const response = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to delete employee');
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error deleting employee: ${error.message}`);
  }
};

// ✅ FINGERPRINT SERVICE FUNCTIONS

// Save fingerprint template
export const saveFingerprint = async (employeeId, fingerprintTemplate) => {
  try {
    const response = await fetch(`${API_URL}/employees/${employeeId}/fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fingerprintTemplate }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save fingerprint');
    }

    return data;
  } catch (error) {
    logger.error('Error saving fingerprint:', error);
    throw error;
  }
};

// Verify fingerprint
export const verifyFingerprint = async (fingerprintTemplate) => {
  try {
    const response = await fetch(`${API_URL}/employees/verify/fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fingerprintTemplate }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify fingerprint');
    }

    return data;
  } catch (error) {
    logger.error('Error verifying fingerprint:', error);
    throw error;
  }
};
