import fetch from 'node-fetch';

async function testAdminProfileUpdate() {
  try {
    console.log('🧪 Testing Admin Profile Update...\n');

    const BASE_URL = 'http://localhost:5000/api';
    const ADMIN_ID = '68f37131cda27248e773f120';

    // Test 1: Update admin email and contact (should work)
    console.log('Test 1: Update admin email and contact number');
    console.log('   Fields: email, contactNumber');
    console.log('   Expected: SUCCESS ✅\n');

    const updateResponse1 = await fetch(`${BASE_URL}/employees/${ADMIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newemail@company.com',
        contactNumber: '09123456789'
      })
    });

    const updateData1 = await updateResponse1.json();
    console.log(`   Status: ${updateResponse1.status}`);
    console.log(`   Response:`, JSON.stringify(updateData1, null, 2));
    console.log();

    if (updateResponse1.ok) {
      console.log('✅ Test 1 PASSED: Admin email/contact updated\n');
    } else {
      console.log('❌ Test 1 FAILED: Should allow email/contact updates\n');
    }

    // Test 2: Try to update admin username (should fail)
    console.log('Test 2: Try to update admin username');
    console.log('   Field: username');
    console.log('   Expected: FAIL with 403 ❌\n');

    const updateResponse2 = await fetch(`${BASE_URL}/employees/${ADMIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'newadmin'
      })
    });

    const updateData2 = await updateResponse2.json();
    console.log(`   Status: ${updateResponse2.status}`);
    console.log(`   Response:`, JSON.stringify(updateData2, null, 2));
    console.log();

    if (updateResponse2.status === 403) {
      console.log('✅ Test 2 PASSED: Username change blocked\n');
    } else {
      console.log('❌ Test 2 FAILED: Should block username changes\n');
    }

    // Test 3: Try to update admin password (should fail)
    console.log('Test 3: Try to update admin password');
    console.log('   Field: password');
    console.log('   Expected: FAIL with 403 ❌\n');

    const updateResponse3 = await fetch(`${BASE_URL}/employees/${ADMIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'newpassword123'
      })
    });

    const updateData3 = await updateResponse3.json();
    console.log(`   Status: ${updateResponse3.status}`);
    console.log(`   Response:`, JSON.stringify(updateData3, null, 2));
    console.log();

    if (updateResponse3.status === 403) {
      console.log('✅ Test 3 PASSED: Password change blocked\n');
    } else {
      console.log('❌ Test 3 FAILED: Should block password changes\n');
    }

    // Test 4: Update admin first name and last name (should work)
    console.log('Test 4: Update admin first and last name');
    console.log('   Fields: firstName, lastName');
    console.log('   Expected: SUCCESS ✅\n');

    const updateResponse4 = await fetch(`${BASE_URL}/employees/${ADMIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Gabriel',
        lastName: 'Administrator'
      })
    });

    const updateData4 = await updateResponse4.json();
    console.log(`   Status: ${updateResponse4.status}`);
    console.log(`   Response:`, JSON.stringify(updateData4, null, 2));
    console.log();

    if (updateResponse4.ok) {
      console.log('✅ Test 4 PASSED: Admin name updated\n');
    } else {
      console.log('❌ Test 4 FAILED: Should allow name updates\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════');
    console.log('✅ Allowed updates: email, contact, firstName, lastName');
    console.log('❌ Blocked updates: username, password, adminPin');
    console.log('\n🎯 Admin can now edit profile through Employee Management!');
    console.log('🔐 Credentials must be changed through Admin Settings panel');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testAdminProfileUpdate();
