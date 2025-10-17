async function testFrontendCashAdvance() {
  try {
    console.log('🧪 Testing Cash Advance Frontend Data Transformation\n');
    
    // Test the API endpoint
    console.log('📡 Fetching from /api/cash-advance...');
    const response = await fetch('http://localhost:5000/api/cash-advance');
    const data = await response.json();
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response structure:', {
      success: data.success,
      advancesCount: data.advances?.length || 0
    });
    
    if (data.advances && data.advances.length > 0) {
      console.log('\n📊 Cash Advances Found:\n');
      
      data.advances.forEach((advance, index) => {
        console.log(`${index + 1}. ${advance.employee?.firstName} ${advance.employee?.lastName}`);
        console.log(`   Employee ID: ${advance.employee?.employeeId || 'N/A'}`);
        console.log(`   Amount: ₱${advance.amount}`);
        console.log(`   Status: ${advance.status}`);
        console.log(`   Request Date: ${new Date(advance.requestDate).toLocaleDateString()}`);
        console.log(`   Purpose: ${advance.purpose || 'N/A'}`);
        console.log('');
      });
      
      // Simulate frontend transformation (what deductionService.js will do)
      console.log('🔄 Frontend Transformation:\n');
      
      const transformed = data.advances.map(advance => {
        const employeeName = advance.employee ? 
          `${advance.employee.firstName} ${advance.employee.lastName}` : 
          'Unknown';
        
        return {
          _id: advance._id,
          employee: advance.employee,
          employeeId: advance.employee?.employeeId,
          employeeName: employeeName,
          name: employeeName, // Component expects 'name' property
          amount: advance.amount,
          status: advance.status,
          date: advance.requestDate,
          reason: advance.purpose || 'Cash Advance',
          type: 'Cash Advance'
        };
      });
      
      transformed.forEach((deduction, index) => {
        console.log(`${index + 1}. Transformed Record:`);
        console.log(`   name: "${deduction.name}"`);
        console.log(`   employeeId: "${deduction.employeeId}"`);
        console.log(`   amount: ₱${deduction.amount}`);
        console.log(`   status: ${deduction.status}`);
        console.log(`   type: ${deduction.type}`);
        console.log(`   employee.employeeId: ${deduction.employee?.employeeId}`);
        console.log('');
      });
      
      console.log('✅ Frontend transformation successful!');
      console.log('✅ This is what Deductions.jsx component will receive');
      
    } else {
      console.log('\n⚠️  No cash advances found in database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendCashAdvance();
