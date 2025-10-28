const https = require('https');

https.get('https://payroll-backend-cyan.vercel.app/api/employees', (res) => {
  let data = '';
  
  res.on('data', chunk => data += chunk);
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const employees = Array.isArray(response) ? response : (response.data || []);
      
      console.log('\n📋 First 5 Active Employees:');
      employees.slice(0, 5).forEach((e, i) => {
        console.log(`${i+1}. ID: ${e._id} | ${e.employeeId} - ${e.firstName} ${e.lastName} | isArchived: ${e.isArchived || false}`);
      });
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data.substring(0, 200));
    }
  });
}).on('error', console.error);
