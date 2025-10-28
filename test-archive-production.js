// Test production archive endpoint
const https = require('https');

const testEmployeeId = '69008cf89213f0fc8a35b14c'; // Yushikei vergara - NOT archived

const options = {
  hostname: 'payroll-backend-cyan.vercel.app',
  port: 443,
  path: `/api/employees/${testEmployeeId}/archive`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🧪 Testing production archive endpoint...');
console.log(`📍 URL: https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`\n📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📦 Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(JSON.stringify({ archivedBy: 'Test Admin' }));
req.end();
