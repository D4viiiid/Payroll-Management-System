import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Simple colored output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

async function testLocalFix() {
  try {
    console.log(colors.cyan('🧪 TESTING LOCAL ATTENDANCE STATS FIX'));
    console.log(colors.cyan('================================='));
    console.log('');
    
    // Get employees
    console.log(colors.bold('1️⃣ Fetching employees...'));
    const empRes = await axios.get(`${API_URL}/employees`);
    const employees = empRes.data;
    const activeEmployees = employees.filter(emp => emp.isActive !== false);
    
    console.log(`   Total Employees: ${employees.length}`);
    console.log(`   Active Employees: ${colors.green(activeEmployees.length)}`);
    console.log('');
    
    // Get stats
    console.log(colors.bold('2️⃣ Fetching attendance stats...'));
    const statsRes = await axios.get(`${API_URL}/attendance/stats`);
    const stats = statsRes.data;
    
    console.log('   Stats returned:');
    console.log(`     totalPresent: ${stats.totalPresent}`);
    console.log(`     fullDay: ${stats.fullDay}`);
    console.log(`     halfDay: ${stats.halfDay}`);
    console.log(`     invalid: ${stats.invalid}`);
    console.log(`     absent: ${colors.yellow(stats.absent)}`);
    console.log('');
    
    // Validate
    console.log(colors.bold('3️⃣ Validation:'));
    const totalAttended = stats.totalPresent + stats.fullDay + stats.halfDay + stats.invalid;
    const expectedAbsent = activeEmployees.length - totalAttended;
    
    console.log(`   Total Attended: ${totalAttended}`);
    console.log(`   Expected Absent: ${colors.yellow(expectedAbsent)}`);
    console.log(`   Actual Absent: ${colors.yellow(stats.absent)}`);
    console.log('');
    
    if (stats.absent === expectedAbsent) {
      console.log(colors.green('✅ PASS: Absent count is correct!'));
      console.log(colors.green(`✅ Expected ${expectedAbsent}, got ${stats.absent}`));
      return true;
    } else {
      console.log(colors.red('❌ FAIL: Absent count is wrong!'));
      console.log(colors.red(`❌ Expected ${expectedAbsent}, got ${stats.absent}`));
      return false;
    }
    
  } catch (error) {
    console.error(colors.red('❌ Error:'), error.message);
    if (error.response) {
      console.error(colors.red('   Response Status:'), error.response.status);
      console.error(colors.red('   Response Data:'), JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

testLocalFix().then(success => {
  console.log('');
  console.log(colors.cyan('================================='));
  if (success) {
    console.log(colors.green('🎉 LOCAL FIX VERIFIED!'));
    console.log(colors.green('Ready to deploy to Vercel.'));
  } else {
    console.log(colors.red('❌ LOCAL TEST FAILED'));
    console.log(colors.red('Please investigate before deploying.'));
  }
  process.exit(success ? 0 : 1);
});
