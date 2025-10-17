async function testCashAdvanceEligibility() {
  try {
    console.log('🧪 Testing Cash Advance Eligibility Validation\n');
    
    // Test 1: Try to request ₱1100 for Ken Vergara (should fail - not enough work days)
    console.log('TEST 1: Ken Vergara requesting ₱1100');
    console.log('---------------------------------------');
    
    // Get Ken's employee ID
    const employeesResponse = await fetch('http://localhost:5000/api/employees');
    const employees = await employeesResponse.json();
    const ken = employees.find(emp => emp.firstName === 'Ken' && emp.lastName === 'Vergara');
    
    if (!ken) {
      console.log('❌ Ken Vergara not found');
      return;
    }
    
    console.log(`Employee: ${ken.firstName} ${ken.lastName} (${ken.employeeId})`);
    console.log(`Daily Rate: ₱${ken.dailyRate}`);
    
    // Try to create cash advance
    const response1 = await fetch('http://localhost:5000/api/cash-advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee: ken._id,
        amount: 1100,
        purpose: 'Test eligibility',
        requestDate: new Date().toISOString()
      })
    });
    
    const result1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ Cash advance created (should NOT happen if < 2 days worked)');
      console.log(result1);
    } else {
      console.log('❌ Cash advance rejected (expected):');
      console.log(`   Reason: ${result1.message}`);
      if (result1.currentEarnings !== undefined) {
        console.log(`   Current Earnings: ₱${result1.currentEarnings}`);
        console.log(`   Required Earnings: ₱${result1.requiredEarnings}`);
        console.log(`   Days Worked: ${result1.daysWorked}`);
        console.log(`   Required Days: ${result1.requiredDays}`);
      }
    }
    
    console.log('\n---\n');
    
    // Test 2: Try a smaller amount (should succeed)
    console.log('TEST 2: Ken Vergara requesting ₱550');
    console.log('------------------------------------');
    
    const response2 = await fetch('http://localhost:5000/api/cash-advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee: ken._id,
        amount: 550,
        purpose: 'Smaller amount test',
        requestDate: new Date().toISOString()
      })
    });
    
    const result2 = await response2.json();
    
    if (response2.ok) {
      console.log('✅ Cash advance created (expected for amounts < ₱1100)');
      console.log(`   Amount: ₱${result2.advance.amount}`);
      console.log(`   Status: ${result2.advance.status}`);
    } else {
      console.log('❌ Cash advance rejected:');
      console.log(`   Reason: ${result2.message}`);
    }
    
    console.log('\n---\n');
    
    // Test 3: Try Sunday date (should fail)
    console.log('TEST 3: Attempting Sunday date');
    console.log('-------------------------------');
    
    const sunday = new Date('2025-10-19'); // Sunday
    console.log(`Date: ${sunday.toLocaleDateString()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][sunday.getDay()]})`);
    
    const response3 = await fetch('http://localhost:5000/api/cash-advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee: ken._id,
        amount: 300,
        purpose: 'Sunday test',
        requestDate: sunday.toISOString()
      })
    });
    
    const result3 = await response3.json();
    
    if (response3.ok) {
      console.log('❌ Cash advance created on Sunday (should NOT happen)');
    } else {
      console.log('✅ Sunday date rejected (expected):');
      console.log(`   Reason: ${result3.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCashAdvanceEligibility();
