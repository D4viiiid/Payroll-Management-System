import fetch from 'node-fetch';

async function testAttendanceAPI() {
  try {
    console.log('🧪 Testing attendance API...');

    const response = await fetch('http://localhost:5000/api/attendance/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fingerprint_template: 'ENROLLED'
      })
    });

    const data = await response.json();

    console.log('📡 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAttendanceAPI();
