async function inspectPayrollStructure() {
  try {
    console.log('🔍 Inspecting Payroll Data Structure\n');
    
    const response = await fetch('http://localhost:5000/api/payrolls');
    const data = await response.json();
    
    if (data.length > 0) {
      console.log('📋 First payroll record structure:\n');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No payroll records found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectPayrollStructure();
