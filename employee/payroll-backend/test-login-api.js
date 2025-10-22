import fetch from 'node-fetch';

async function testLoginAPI() {
  try {
    console.log('🧪 Testing Admin Login API Flow...\n');

    const BASE_URL = 'http://localhost:5000/api';

    // Test 1: Login with username/password
    console.log('Test 1: POST /api/employees/login');
    console.log('   Username: ADMIN');
    console.log('   Password: Admin12345\n');

    const loginResponse = await fetch(`${BASE_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ADMIN',
        password: 'Admin12345'
      })
    });

    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Response:`, JSON.stringify(loginData, null, 2));
    console.log();

    if (!loginResponse.ok) {
      console.log('❌ Login failed!');
      return;
    }

    if (loginData.requiresPin) {
      console.log('✅ PIN verification required (expected for admin)\n');

      // Test 2: Verify PIN
      console.log('Test 2: POST /api/employees/admin/verify-pin');
      console.log('   Employee ID:', loginData.employee?.employeeId || loginData.employee?._id);
      console.log('   PIN: 111111\n');

      const pinResponse = await fetch(`${BASE_URL}/employees/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: loginData.employee?.employeeId || loginData.employee?._id,
          pin: '111111'
        })
      });

      const pinData = await pinResponse.json();
      console.log(`   Status: ${pinResponse.status}`);
      console.log(`   Response:`, JSON.stringify(pinData, null, 2));
      console.log();

      if (pinResponse.ok && pinData.success) {
        console.log('═══════════════════════════════════════════');
        console.log('✅ ALL API TESTS PASSED!');
        console.log('═══════════════════════════════════════════');
        console.log('\n🎯 Backend is working correctly!');
        console.log('\n📝 Next: Test frontend at http://localhost:5174');
        console.log('   1. Enter username: admin');
        console.log('   2. Enter password: admin123');
        console.log('   3. Click Login');
        console.log('   4. Enter PIN: 123456');
        console.log('   5. Should see ONE success toast');
        console.log('   6. Should redirect to dashboard');
        console.log('═══════════════════════════════════════════\n');
      } else {
        console.log('❌ PIN verification failed!');
      }
    } else {
      console.log('⚠️  No PIN required (unexpected for admin)');
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testLoginAPI();
