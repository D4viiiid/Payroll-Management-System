// Test stats endpoint
import fetch from 'node-fetch';

async function testStats() {
  try {
    console.log('Testing /api/attendance/stats endpoint...\n');
    
    const response = await fetch('http://localhost:5000/api/attendance/stats');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Stats data:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testStats();
