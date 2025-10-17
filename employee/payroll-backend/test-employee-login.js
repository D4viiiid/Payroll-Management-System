/**
 * Test Employee Login
 * Tests if an employee can log in with the new password
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Test credentials from password reset (Yushikie Vergara)
const testEmployee = {
  username: 'EMP-4879',
  password: 'tm$6^mD1pwBl' // From reset output
};

async function testLogin() {
  try {
    console.log('🧪 TESTING EMPLOYEE LOGIN');
    console.log('============================================================\n');
    
    console.log(`Testing login for: ${testEmployee.username}`);
    console.log(`Password: ${testEmployee.password}\n`);
    
    const response = await axios.post(`${API_BASE}/employees/login`, {
      username: testEmployee.username,
      password: testEmployee.password
    });
    
    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('\nResponse:');
    console.log(`- Employee: ${response.data.employee.firstName} ${response.data.employee.lastName}`);
    console.log(`- Employee ID: ${response.data.employee.employeeId}`);
    console.log(`- Email: ${response.data.employee.email}`);
    console.log(`- Token: ${response.data.token.substring(0, 20)}...`);
    console.log('\n============================================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('============================================================\n');
    
  } catch (error) {
    console.error('❌ LOGIN FAILED!');
    console.error(`Error: ${error.response?.data?.message || error.message}`);
    console.error('\nFull error:', error.response?.data || error.message);
  }
}

testLogin();
