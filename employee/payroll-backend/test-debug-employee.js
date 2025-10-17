import http from 'http';

const makeRequest = (method, fullUrl, data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(fullUrl);
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

// Test employee creation
const test = async () => {
  console.log('Testing employee creation...');
  const response = await makeRequest('POST', 'http://localhost:5000/api/employees', {
    employeeId: 'TEST-DEBUG-' + Date.now(),
    firstName: 'Debug',
    lastName: 'Test',
    email: `debug${Date.now()}@test.com`,
    position: 'Tester',
    dailyRate: 550,
    overtimeRate: 85.94,
    isActive: true
  });
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  // Test attendance calculate
  console.log('\n\nTesting attendance calculation...');
  const test3 = await makeRequest('POST', 'http://localhost:5000/api/attendance/calculate', {
    employeeId: response.data.employee?.employeeId || response.data.employeeId,
    date: '2025-10-14',
    timeIn: '08:00:00',
    timeOut: '19:00:00'
  });
  
  console.log('Status:', test3.status);
  console.log('Response:', JSON.stringify(test3.data, null, 2));
};

test().catch(console.error);
