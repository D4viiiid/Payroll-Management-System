import { localEmployeeStorage } from './localStorage.js';

async function createLocalTestEmployee() {
  try {
    // Check if test employee already exists
    const existingEmployee = localEmployeeStorage.findByEmployeeId('EMP-TEST-001');

    if (existingEmployee) {
      console.log('ℹ️ Local test employee already exists:', existingEmployee.firstName, existingEmployee.lastName);
      console.log('📋 Employee ID:', existingEmployee.employeeId);
      console.log('👆 Fingerprint enrolled:', existingEmployee.fingerprintEnrolled);
      return;
    }

    // Create test employee with fingerprint
    const testEmployee = {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@test.com',
      contactNumber: '09123456789',
      employeeId: 'EMP-TEST-001',
      status: 'regular',
      position: 'Software Developer',
      hireDate: new Date('2024-01-01').toISOString(),
      salary: 25000,
      username: 'juandelacruz',
      password: 'Password123', // This will be hashed by the pre-save hook
      isActive: true,
      fingerprintEnrolled: true,
      fingerprintTemplate: 'ENROLLED', // This matches what the frontend sends
      fingerprintStatus: 'registered',
      fingerprintEnrolledAt: new Date().toISOString()
    };

    const savedEmployee = localEmployeeStorage.save(testEmployee);
    console.log('✅ Local test employee created successfully!');
    console.log('📋 Employee ID:', savedEmployee.employeeId);
    console.log('👆 Fingerprint template:', savedEmployee.fingerprintTemplate);

  } catch (error) {
    console.error('❌ Error creating local test employee:', error.message);
  }
}

createLocalTestEmployee();
