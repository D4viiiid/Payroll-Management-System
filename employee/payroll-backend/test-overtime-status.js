import fetch from 'node-fetch';

console.log('\n🔍 TESTING OVERTIME STATUS IN DATABASE...\n');

try {
  const response = await fetch('http://localhost:5000/api/attendance');
  const result = await response.json();
  
  // Handle paginated response
  const data = Array.isArray(result) ? result : (result.data || result.attendance || []);
  
  console.log(`📊 Total attendance records: ${data.length}`);
  
  // Find Overtime records
  const overtimeRecords = data.filter(r => 
    r.dayType === 'Overtime' || r.status === 'overtime' || r.status === 'Overtime'
  );
  
  console.log(`⚡ Overtime records found: ${overtimeRecords.length}\n`);
  
  if (overtimeRecords.length > 0) {
    console.log('✅ OVERTIME RECORDS IN DATABASE:');
    console.log('─'.repeat(80));
    overtimeRecords.slice(0, 10).forEach((r, i) => {
      const dateStr = new Date(r.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      console.log(`${i+1}. ${r.employeeId} - ${dateStr}`);
      console.log(`   dayType: "${r.dayType}" | status: "${r.status}"`);
      console.log(`   Time: ${new Date(r.timeIn).toLocaleTimeString()} - ${new Date(r.timeOut).toLocaleTimeString()}`);
      console.log(`   Hours: ${r.actualHoursWorked}hrs | OT: ${r.overtimeHours}hrs | Pay: ₱${r.totalPay}`);
      console.log('');
    });
    console.log('─'.repeat(80));
  } else {
    console.log('❌ NO OVERTIME RECORDS FOUND!');
    console.log('\nSample records (first 5):');
    data.slice(0, 5).forEach((r, i) => {
      console.log(`${i+1}. ${r.employeeId} - dayType: "${r.dayType}" - status: "${r.status}"`);
    });
  }
  
  // Test Casey Espino specifically
  console.log('\n🔍 CHECKING CASEY ESPINO RECORDS:');
  const caseyRecords = data.filter(r => r.employeeId === 'EMP-2651');
  console.log(`Total Casey Espino records: ${caseyRecords.length}`);
  
  const caseyOvertime = caseyRecords.filter(r => 
    r.dayType === 'Overtime' || r.status === 'overtime' || r.status === 'Overtime'
  );
  console.log(`Casey Espino Overtime records: ${caseyOvertime.length}`);
  
  if (caseyOvertime.length > 0) {
    console.log('\n✅ Casey Espino Overtime Details:');
    caseyOvertime.forEach((r, i) => {
      const dateStr = new Date(r.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      console.log(`${i+1}. ${dateStr} - dayType: "${r.dayType}" - ₱${r.totalPay}`);
    });
  }
  
  console.log('\n✅ TEST COMPLETE!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);
