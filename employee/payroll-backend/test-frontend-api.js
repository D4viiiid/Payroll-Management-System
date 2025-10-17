import fetch from 'node-fetch';

async function testFrontendAPI() {
  try {
    console.log('Testing frontend API calls...\n');
    
    // Test stats endpoint
    console.log('1. Testing /api/attendance/stats');
    const statsResponse = await fetch('http://localhost:5000/api/attendance/stats');
    const stats = await statsResponse.json();
    console.log('  Status:', statsResponse.status);
    console.log('  Data:', JSON.stringify(stats, null, 2));
    
    // Test attendance endpoint
    console.log('\n2. Testing /api/attendance');
    const attendanceResponse = await fetch('http://localhost:5000/api/attendance');
    const attendance = await attendanceResponse.json();
    console.log('  Status:', attendanceResponse.status);
    console.log('  Records count:', attendance.length);
    if (attendance.length > 0) {
      console.log('  First record:', JSON.stringify(attendance[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFrontendAPI();
