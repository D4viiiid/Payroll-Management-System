import fetch from 'node-fetch';

async function testDuplicateWithRealTemplate() {
  try {
    // First get employees to find a real fingerprint template
    const employeesResponse = await fetch('http://localhost:5000/api/employees');
    const employees = await employeesResponse.json();
    
    // Find an employee with a fingerprint template
    const employeeWithTemplate = employees.find(emp => emp.fingerprintTemplate && emp.fingerprintTemplate !== 'ENROLLED');
    
    if (employeeWithTemplate) {
      console.log(`Testing with employee: ${employeeWithTemplate.employeeId}`);
      console.log(`Template length: ${employeeWithTemplate.fingerprintTemplate.length}`);
      
      // Test duplicate check with the real template
      const duplicateResponse = await fetch('http://localhost:5000/api/fingerprint/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fingerprintTemplate: employeeWithTemplate.fingerprintTemplate,
          excludeEmployeeId: 'EMP123' // Different ID to test duplicate detection
        })
      });
      
      const result = await duplicateResponse.json();
      console.log('Duplicate check result:', result);
      
      // Now test with the same employee ID (should not be duplicate)
      const sameEmployeeResponse = await fetch('http://localhost:5000/api/fingerprint/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fingerprintTemplate: employeeWithTemplate.fingerprintTemplate,
          excludeEmployeeId: employeeWithTemplate.employeeId // Same ID
        })
      });
      
      const sameResult = await sameEmployeeResponse.json();
      console.log('Same employee check result:', sameResult);
      
    } else {
      console.log('No employee with fingerprint template found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDuplicateWithRealTemplate();
