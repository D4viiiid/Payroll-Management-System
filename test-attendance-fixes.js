/**
 * Test script for attendance system fixes
 * Tests:
 * 1. Date filtering accuracy
 * 2. Auto-close shifts
 * 3. Attendance stats
 * 4. Timezone handling
 */

const API_BASE = 'http://localhost:5000/api';

// Test 1: Get attendance stats for today
async function testAttendanceStats() {
  console.log('\n=== TEST 1: Attendance Stats ===');
  try {
    const response = await fetch(`${API_BASE}/attendance/stats`);
    const data = await response.json();
    console.log('✅ Stats received:', data);
    console.log(`   - Present: ${data.totalPresent}`);
    console.log(`   - Full Day: ${data.fullDay}`);
    console.log(`   - Half Day: ${data.halfDay}`);
    console.log(`   - Absent: ${data.absent}`);
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Get attendance records for today
async function testTodayAttendance() {
  console.log('\n=== TEST 2: Today\'s Attendance Records ===');
  try {
    const response = await fetch(`${API_BASE}/attendance`);
    const data = await response.json();
    
    // Filter for today's records
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = data.filter(record => {
      const recordDate = new Date(record.date || record.time).toISOString().split('T')[0];
      return recordDate === today;
    });
    
    console.log(`✅ Found ${todayRecords.length} attendance records for today`);
    todayRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.employeeId} - ${record.dayType || record.status}`);
      console.log(`      Time In: ${record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : 'N/A'}`);
      console.log(`      Time Out: ${record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : 'N/A'}`);
    });
    
    return todayRecords;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 3: Check for open shifts that should be auto-closed
async function testOpenShifts() {
  console.log('\n=== TEST 3: Open Shifts Check ===');
  try {
    const response = await fetch(`${API_BASE}/attendance`);
    const data = await response.json();
    
    const openShifts = data.filter(record => 
      record.timeIn && !record.timeOut
    );
    
    console.log(`✅ Found ${openShifts.length} open shifts`);
    
    if (openShifts.length > 0) {
      console.log('   Open shifts:');
      openShifts.forEach((shift, index) => {
        const timeIn = new Date(shift.timeIn);
        const hoursSince = (new Date() - timeIn) / (1000 * 60 * 60);
        console.log(`   ${index + 1}. ${shift.employeeId}`);
        console.log(`      Time In: ${timeIn.toLocaleString()}`);
        console.log(`      Hours since: ${hoursSince.toFixed(2)}`);
        console.log(`      Should auto-close: ${hoursSince >= 12 ? 'YES' : 'NO'}`);
      });
    }
    
    return openShifts;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 4: Manually trigger auto-close (admin function)
async function testManualAutoClose() {
  console.log('\n=== TEST 4: Manual Auto-Close Trigger ===');
  try {
    const response = await fetch(`${API_BASE}/admin/auto-close-shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('✅ Auto-close result:', data);
    if (data.result) {
      console.log(`   - Total checked: ${data.result.total}`);
      console.log(`   - Closed: ${data.result.closed}`);
      console.log(`   - Skipped: ${data.result.skipped}`);
      console.log(`   - Errors: ${data.result.errors.length}`);
      
      if (data.result.details && data.result.details.length > 0) {
        console.log('   Details:');
        data.result.details.forEach((detail, index) => {
          console.log(`     ${index + 1}. ${detail.employeeId} - ${detail.dayType} (${detail.hoursWorked.toFixed(2)} hours)`);
        });
      }
    }
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Test 5: Check timezone handling
function testTimezoneHandling() {
  console.log('\n=== TEST 5: Timezone Handling ===');
  
  const now = new Date();
  const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  console.log(`✅ System time: ${now.toLocaleString()}`);
  console.log(`✅ Philippines time: ${philippinesTime.toLocaleString()}`);
  console.log(`✅ Timezone offset: ${now.getTimezoneOffset()} minutes`);
  console.log(`✅ Current hour (system): ${now.getHours()}`);
  console.log(`✅ Current hour (PH): ${philippinesTime.getHours()}`);
}

// Run all tests
async function runAllTests() {
  console.log('🧪 STARTING ATTENDANCE SYSTEM TESTS 🧪');
  console.log('==========================================');
  
  testTimezoneHandling();
  
  await testAttendanceStats();
  await testTodayAttendance();
  await testOpenShifts();
  
  console.log('\n⚠️  Note: Test 4 (Manual Auto-Close) requires open shifts older than 12 hours.');
  console.log('Uncomment the line below to run it:');
  console.log('// await testManualAutoClose();');
  
  // Uncomment to test manual auto-close
  // await testManualAutoClose();
  
  console.log('\n==========================================');
  console.log('✅ ALL TESTS COMPLETED');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = (await import('node-fetch')).default;
  runAllTests();
} else {
  // Browser environment
  runAllTests();
}

export { 
  testAttendanceStats, 
  testTodayAttendance, 
  testOpenShifts, 
  testManualAutoClose,
  testTimezoneHandling,
  runAllTests 
};
