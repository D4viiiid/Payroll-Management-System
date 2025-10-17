import fetch from 'node-fetch';

async function testDuplicateCheck() {
  try {
    // Test duplicate check with a fake fingerprint template
    const response = await fetch('http://localhost:5000/api/fingerprint/check-duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fingerprintTemplate: 'test123',
        excludeEmployeeId: 'EMP123'
      })
    });
    
    const result = await response.json();
    console.log('Duplicate check result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDuplicateCheck();
