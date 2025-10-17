import fetch from 'node-fetch';

async function testDuplicateWithLatestTemplate() {
  try {
    // Get the latest employee with fingerprint template
    const employeesResponse = await fetch('http://localhost:5000/api/employees');
    const employees = await employeesResponse.json();
    
    // Find the most recent employee with a fingerprint template
    const employeesWithTemplates = employees.filter(emp => 
      emp.fingerprintTemplate && 
      emp.fingerprintTemplate !== 'ENROLLED' && 
      emp.fingerprintTemplate.length > 100
    );
    
    if (employeesWithTemplates.length > 0) {
      const latestEmployee = employeesWithTemplates[employeesWithTemplates.length - 1];
      console.log(`Testing with latest employee: ${latestEmployee.employeeId}`);
      console.log(`Template length: ${latestEmployee.fingerprintTemplate.length}`);
      
      // Test duplicate check with the same template (should find duplicate)
      const duplicateResponse = await fetch('http://localhost:5000/api/fingerprint/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fingerprintTemplate: latestEmployee.fingerprintTemplate,
          excludeEmployeeId: null  // Don't exclude anyone
        })
      });
      
      const result = await duplicateResponse.json();
      console.log('Duplicate check result:', result);
      
    } else {
      console.log('No employees with fingerprint templates found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDuplicateWithLatestTemplate();
