// Test employee update functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

// Test employee (not admin)
const EMPLOYEE_ID = 'EMP-9989'; // Gabriel from screenshot

async function testEmployeeUpdate() {
  console.log('🧪 Testing Employee Update Functionality\n');
  console.log('=' .repeat(70));

  try {
    // ========================================
    // Test 1: Get admin token
    // ========================================
    console.log('\n📝 Test 1: Admin Login');
    const loginResponse = await fetch(`${BASE_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ADMIN',
        password: 'Admin12345'
      })
    });

    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    
    if (!loginData.requiresPin) {
      console.log('❌ Login failed');
      return;
    }

    // Verify PIN
    const pinResponse = await fetch(`${BASE_URL}/employees/admin/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: loginData.employee.employeeId,
        pin: '111111'
      })
    });

    const pinData = await pinResponse.json();
    if (!pinData.token) {
      console.log('❌ PIN verification failed');
      return;
    }

    const token = pinData.token;
    console.log('✅ Admin logged in successfully');

    // ========================================
    // Test 2: Get all employees
    // ========================================
    console.log('\n📝 Test 2: Get Employees List');
    const employeesResponse = await fetch(`${BASE_URL}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const employees = await employeesResponse.json();
    console.log('   Status:', employeesResponse.status);
    console.log('   Total Employees:', employees.length);

    // Find Gabriel (System Administrator)
    const testEmployee = employees.find(e => e.employeeId === 'ADMIN001');
    
    if (!testEmployee) {
      console.log('❌ Test employee not found');
      return;
    }

    console.log('✅ Found test employee:', testEmployee.firstName, testEmployee.lastName);
    console.log('   Employee ID:', testEmployee.employeeId);
    console.log('   Username:', testEmployee.username);
    console.log('   Email:', testEmployee.email);
    console.log('   Is Admin:', testEmployee.isAdmin);

    // ========================================
    // Test 3: Update employee (ONLY profile fields)
    // ========================================
    console.log('\n📝 Test 3: Update Employee Profile');
    console.log('   Updating: firstName, lastName, email, contactNumber, status');
    console.log('   NOT sending: username, password, employeeId');

    const updateData = {
      firstName: 'David',
      lastName: 'Administrator',
      email: 'newemail@company.com',
      contactNumber: '09123456789',
      status: 'regular'
      // ❌ NOT including: username, password, employeeId, plainTextPassword
    };

    console.log('   Update payload:', JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch(`${BASE_URL}/employees/${testEmployee._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    console.log('\n   Response Status:', updateResponse.status);
    const updateResult = await updateResponse.json();
    console.log('   Response:', JSON.stringify(updateResult, null, 2));

    if (updateResponse.status === 403) {
      console.log('\n❌ Test 3 FAILED: Got 403 Forbidden');
      console.log('   This means the backend is still blocking the update');
      console.log('   Error:', updateResult.message);
    } else if (updateResponse.status === 200) {
      console.log('\n✅ Test 3 PASSED: Update successful');
    } else {
      console.log('\n⚠️  Test 3: Unexpected status code');
    }

    // ========================================
    // Test 4: Update with username (should fail)
    // ========================================
    console.log('\n📝 Test 4: Try to Update with Username (should be blocked)');
    
    const badUpdateData = {
      firstName: 'Test',
      username: 'newusername' // This should be blocked
    };

    const badUpdateResponse = await fetch(`${BASE_URL}/employees/${testEmployee._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(badUpdateData)
    });

    console.log('   Status:', badUpdateResponse.status);
    const badUpdateResult = await badUpdateResponse.json();
    console.log('   Response:', JSON.stringify(badUpdateResult, null, 2));

    if (badUpdateResponse.status === 403) {
      console.log('✅ Test 4 PASSED: Username change correctly blocked');
    } else {
      console.log('❌ Test 4 FAILED: Username change should be blocked');
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '=' .repeat(70));
    console.log('📊 Test Summary');
    console.log('=' .repeat(70));
    console.log('Test 1: Admin Login - ✅');
    console.log('Test 2: Get Employees - ✅');
    console.log('Test 3: Update Profile - ' + (updateResponse.status === 200 ? '✅' : '❌'));
    console.log('Test 4: Block Username Change - ' + (badUpdateResponse.status === 403 ? '✅' : '❌'));
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testEmployeeUpdate();
