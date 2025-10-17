import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/employees';
const employeeId = 'EMP-9080';
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testProfilePictureAPI() {
  try {
    console.log('🧪 TESTING PROFILE PICTURE UPLOAD API\n');

    // Step 1: Upload profile picture
    console.log('📤 Step 1: Uploading profile picture...');
    const uploadResponse = await fetch(`${API_URL}/${employeeId}/profile-picture`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilePicture: testImage })
    });

    const uploadData = await uploadResponse.json();
    console.log('Response:', uploadData);
    console.log(`✅ Upload ${uploadData.profilePicture ? 'SUCCESS' : 'FAILED'}\n`);

    // Step 2: Get employee data
    console.log('📥 Step 2: Fetching employee data...');
    
    // First, find the MongoDB _id for EMP-9080
    const allEmployeesResponse = await fetch(`${API_URL}`);
    const allEmployees = await allEmployeesResponse.json();
    const employee = allEmployees.find(emp => emp.employeeId === employeeId);
    
    if (!employee) {
      console.log('❌ Employee not found!');
      return;
    }

    console.log(`Found employee with _id: ${employee._id}`);
    
    // Now fetch by _id
    const getResponse = await fetch(`${API_URL}/${employee._id}`);
    const getData = await getResponse.json();
    
    console.log('Employee data received:');
    console.log(`  - Name: ${getData.firstName} ${getData.lastName}`);
    console.log(`  - profilePicture exists: ${!!getData.profilePicture}`);
    console.log(`  - profilePicture length: ${getData.profilePicture?.length || 0} chars\n`);

    if (getData.profilePicture) {
      console.log('✅ SUCCESS! Profile picture persists after logout/login!');
    } else {
      console.log('❌ FAILED! Profile picture still missing!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProfilePictureAPI();
