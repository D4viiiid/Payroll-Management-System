import axios from 'axios';

const BACKEND_URL = 'https://payroll-backend-cyan.vercel.app';
const API_URL = `${BACKEND_URL}/api`;

// Simple colored output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

async function testStats() {
  try {
    console.log(colors.cyan('🧪 TESTING ATTENDANCE STATS ENDPOINT'));
    console.log(colors.cyan('================================='));
    console.log('');
    
    // Test 1: Get employees count
    console.log(colors.bold('1️⃣ Testing GET /api/employees'));
    const employeesResponse = await axios.get(`${API_URL}/employees`);
    const employees = employeesResponse.data;
    const activeEmployees = employees.filter(emp => emp.isActive !== false);
    
    console.log(`   Total Employees in API: ${employees.length}`);
    console.log(`   Active Employees: ${colors.green(activeEmployees.length)}`);
    console.log('');
    
    // Test 2: Get attendance stats
    console.log(colors.bold('2️⃣ Testing GET /api/attendance/stats'));
    const statsResponse = await axios.get(`${API_URL}/attendance/stats`);
    const stats = statsResponse.data;
    
    console.log('   Stats returned:');
    console.log(`     totalPresent: ${stats.totalPresent}`);
    console.log(`     fullDay: ${stats.fullDay}`);
    console.log(`     halfDay: ${stats.halfDay}`);
    console.log(`     invalid: ${stats.invalid}`);
    console.log(`     absent: ${colors.red(stats.absent)}`);
    console.log('');
    
    // Test 3: Validate calculation
    console.log(colors.bold('3️⃣ Validation:'));
    const totalAttended = stats.totalPresent + stats.fullDay + stats.halfDay + stats.invalid;
    const expectedAbsent = activeEmployees.length - totalAttended;
    
    console.log(`   Total Attended: ${totalAttended}`);
    console.log(`   Expected Absent: ${colors.yellow(expectedAbsent)}`);
    console.log(`   Actual Absent: ${colors.red(stats.absent)}`);
    
    if (stats.absent === expectedAbsent) {
      console.log(colors.green('   ✅ PASS: Absent count is correct'));
    } else {
      console.log(colors.red(`   ❌ FAIL: Absent count is wrong! Should be ${expectedAbsent}, got ${stats.absent}`));
    }
    console.log('');
    
    // Test 4: Get today's attendance records
    console.log(colors.bold('4️⃣ Testing GET /api/attendance'));
    const attendanceResponse = await axios.get(`${API_URL}/attendance`);
    const allAttendance = attendanceResponse.data.data || attendanceResponse.data;
    
    // Filter today's records
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRecords = allAttendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= today && recordDate < tomorrow && !record.archived;
    });
    
    console.log(`   Total Attendance Records: ${allAttendance.length}`);
    console.log(`   Today's Attendance Records: ${colors.yellow(todayRecords.length)}`);
    console.log('');
    
    if (todayRecords.length === 0) {
      console.log(colors.yellow('   ⚠️ No attendance records for today'));
      console.log(colors.yellow(`   Expected: All ${activeEmployees.length} employees absent`));
    } else {
      console.log('   Today\'s Records:');
      todayRecords.forEach((record, i) => {
        console.log(`     ${i + 1}. Employee: ${record.employeeId}, Status: ${record.status || 'N/A'}`);
      });
    }
    
    console.log('');
    console.log(colors.cyan('================================='));
    
    // Final verdict
    if (stats.absent === expectedAbsent && todayRecords.length === totalAttended) {
      console.log(colors.green('✅ ALL TESTS PASSED'));
    } else {
      console.log(colors.red('❌ TESTS FAILED - STATS MISMATCH'));
      console.log('');
      console.log(colors.bold('🔍 Root Cause Analysis:'));
      console.log(`   Active Employees: ${activeEmployees.length}`);
      console.log(`   Today's Attendance: ${todayRecords.length}`);
      console.log(`   Total Attended (from stats): ${totalAttended}`);
      console.log(`   Expected Absent: ${expectedAbsent}`);
      console.log(`   Actual Absent (from API): ${stats.absent}`);
      console.log('');
      
      if (todayRecords.length !== totalAttended) {
        console.log(colors.red('   ⚠️ Issue: Today\'s attendance count doesn\'t match totalAttended'));
      }
      
      if (stats.absent !== expectedAbsent) {
        console.log(colors.red('   ⚠️ Issue: Absent calculation is incorrect'));
        console.log(colors.yellow('   Possible cause: Backend is not counting active employees correctly'));
      }
    }
    
  } catch (error) {
    console.error(colors.red('❌ Error:'), error.message);
    if (error.response) {
      console.error(colors.red('   Response Status:'), error.response.status);
      console.error(colors.red('   Response Data:'), error.response.data);
    }
  }
}

testStats();
