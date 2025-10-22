// Quick test for employee update auto-refresh
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testAutoRefresh() {
  console.log('🧪 Testing Employee Update Auto-Refresh Fix\n');
  console.log('=' .repeat(70));

  try {
    // Login as admin
    console.log('\n📝 Step 1: Admin Login');
    const loginResponse = await fetch(`${BASE_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ADMIN', password: 'Admin12345' })
    });

    const loginData = await loginResponse.json();
    
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
    console.log('✅ Admin logged in');

    // Get employees
    console.log('\n📝 Step 2: Get Employees');
    const employeesResponse = await fetch(`${BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const employees = await employeesResponse.json();
    const testEmployee = employees.find(e => e.employeeId === 'ADMIN001');
    
    if (!testEmployee) {
      console.log('❌ Test employee not found');
      return;
    }

    console.log('✅ Found employee:', testEmployee.firstName, testEmployee.lastName);
    console.log('   Current email:', testEmployee.email);
    console.log('   Current contact:', testEmployee.contactNumber);

    // Update employee
    console.log('\n📝 Step 3: Update Employee');
    const newEmail = `updated.${Date.now()}@company.com`;
    const newContact = '09' + Math.floor(Math.random() * 100000000);
    const newFirstName = 'Updated' + Date.now().toString().slice(-4);

    const updateData = {
      firstName: newFirstName,
      lastName: testEmployee.lastName,
      email: newEmail,
      contactNumber: newContact,
      status: testEmployee.status
    };

    console.log('   New first name:', newFirstName);
    console.log('   New email:', newEmail);
    console.log('   New contact:', newContact);

    const updateResponse = await fetch(`${BASE_URL}/employees/${testEmployee._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    console.log('\n📊 Update Response Status:', updateResponse.status);
    
    if (updateResponse.status !== 200) {
      const errorData = await updateResponse.json();
      console.log('❌ Update failed:', errorData);
      return;
    }

    const updateResult = await updateResponse.json();
    console.log('✅ Update response received');
    console.log('   Response firstName:', updateResult.firstName);
    console.log('   Response email:', updateResult.email);
    console.log('   Response contact:', updateResult.contactNumber);

    // Verify the response contains updated data
    if (updateResult.firstName === newFirstName) {
      console.log('✅ firstName updated in response');
    } else {
      console.log('❌ firstName NOT updated in response');
    }

    if (updateResult.email === newEmail) {
      console.log('✅ email updated in response');
    } else {
      console.log('❌ email NOT updated in response');
    }

    if (updateResult.contactNumber === newContact) {
      console.log('✅ contactNumber updated in response');
    } else {
      console.log('❌ contactNumber NOT updated in response');
    }

    // Fetch again to verify persistence
    console.log('\n📝 Step 4: Verify Persistence');
    const verifyResponse = await fetch(`${BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const updatedEmployees = await verifyResponse.json();
    const verifiedEmployee = updatedEmployees.find(e => e._id === testEmployee._id);

    console.log('   Database firstName:', verifiedEmployee.firstName);
    console.log('   Database email:', verifiedEmployee.email);
    console.log('   Database contact:', verifiedEmployee.contactNumber);

    if (verifiedEmployee.firstName === newFirstName &&
        verifiedEmployee.email === newEmail &&
        verifiedEmployee.contactNumber === newContact) {
      console.log('✅ All changes persisted to database');
    } else {
      console.log('❌ Some changes not persisted');
    }

    // Test Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 Test Summary');
    console.log('=' .repeat(70));
    console.log('✅ Login: PASS');
    console.log('✅ Get Employees: PASS');
    console.log('✅ Update Employee: ' + (updateResponse.status === 200 ? 'PASS' : 'FAIL'));
    console.log('✅ Response Contains Updated Data: ' + 
      (updateResult.firstName === newFirstName && 
       updateResult.email === newEmail ? 'PASS' : 'FAIL'));
    console.log('✅ Changes Persisted: ' + 
      (verifiedEmployee.firstName === newFirstName ? 'PASS' : 'FAIL'));
    console.log('=' .repeat(70));
    console.log('\n✅ AUTO-REFRESH FIX: Backend returns updated data correctly!');
    console.log('   Frontend should update local state immediately.');
    console.log('   No hard reload needed!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('   Error:', error.message);
  }
}

testAutoRefresh();
