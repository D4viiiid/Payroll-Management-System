async function verifyPayrollCashAdvances() {
  try {
    console.log('🧪 Verifying Payroll Records with Cash Advances\n');
    
    // Fetch payroll records
    console.log('📡 Fetching payroll records...');
    const response = await fetch('http://localhost:5000/api/payrolls');
    const data = await response.json();
    
    if (data.length > 0) {
      console.log(`✅ Found ${data.length} payroll records\n`);
      
      data.forEach((payroll, index) => {
        console.log(`${index + 1}. ${payroll.employeeName || payroll.name} (${payroll.employeeId})`);
        
        if (payroll.startDate && payroll.endDate) {
          console.log(`   Work Period: ${new Date(payroll.startDate).toLocaleDateString()} - ${new Date(payroll.endDate).toLocaleDateString()}`);
        }
        
        console.log(`   Salary: ₱${(payroll.salary || payroll.basicSalary || 0).toLocaleString()}`);
        console.log(`   Cash Advance: ₱${(payroll.cashAdvance || payroll.deductions || 0).toLocaleString()}`);
        console.log(`   Net Salary: ₱${(payroll.netSalary || 0).toLocaleString()}`);
        
        const deductionAmount = payroll.cashAdvance || payroll.deductions || 0;
        
        if (deductionAmount > 0) {
          console.log(`   ✅ CASH ADVANCE INCLUDED!`);
        } else {
          console.log(`   ⚠️  No cash advance`);
        }
        console.log('');
      });
      
      // Check if any payroll has cash advances
      const withCashAdvance = data.filter(p => (p.cashAdvance || p.deductions || 0) > 0);
      console.log(`\n📊 Summary:`);
      console.log(`   Total payrolls: ${data.length}`);
      console.log(`   With cash advances: ${withCashAdvance.length}`);
      console.log(`   Without cash advances: ${data.length - withCashAdvance.length}`);
      
      if (withCashAdvance.length > 0) {
        console.log('\n✅ SUCCESS! Cash advances ARE showing in Payroll Records');
      } else {
        console.log('\n⚠️  WARNING: No cash advances found in Payroll Records');
      }
      
    } else {
      console.log('⚠️  No payroll records found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

verifyPayrollCashAdvances();
