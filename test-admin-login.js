/**
 * Test admin login with different passwords
 */
import http from 'http';

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ 
            status: res.statusCode, 
            data: parsed
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testLogin(username, password) {
  try {
    const response = await httpRequest('http://localhost:5000/api/employees/login', {
      method: 'POST',
      body: { username, password }
    });
    
    console.log(`Testing: ${username} / ${password}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
    
    return response.status === 200;
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing Admin Login Credentials\n');
  console.log('=====================================\n');
  
  const passwords = [
    'Allan123',
    'admin123',
    'Admin123',
    'ADMIN123',
    'password',
    'admin',
    'Admin@123'
  ];
  
  for (const password of passwords) {
    await testLogin('ADMIN', password);
  }
}

runTests();
