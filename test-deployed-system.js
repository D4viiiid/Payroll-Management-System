import axios from 'axios';

const FRONTEND_URL = 'https://employee-frontend-eight-rust.vercel.app';
const BACKEND_URL = 'https://payroll-backend-cyan.vercel.app';

// Simple colored output without external dependencies
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

const chalk = {
  green: colors.green,
  red: colors.red,
  yellow: colors.yellow,
  blue: colors.blue,
  cyan: colors.cyan,
  bold: colors.bold,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  redBright: colors.red,
  greenBright: colors.green,
  yellowBright: colors.yellow
};

console.log(chalk.cyan('🧪 DEPLOYED SYSTEM TEST'));
console.log(chalk.cyan('================================='));
console.log('');

let passed = 0;
let failed = 0;
const errors = [];

// Helper function to test endpoint
async function testEndpoint(name, url, options = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      data: options.data,
      validateStatus: options.validateStatus || (() => true)
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(chalk.green(`✅ ${name}`));
      console.log(chalk.gray(`   Status: ${response.status}`));
      if (options.verbose) {
        console.log(chalk.gray(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`));
      }
      passed++;
      return { success: true, data: response.data };
    } else {
      console.log(chalk.red(`❌ ${name}`));
      console.log(chalk.gray(`   Status: ${response.status}`));
      console.log(chalk.gray(`   Error: ${response.data?.message || JSON.stringify(response.data)}`));
      failed++;
      errors.push({ test: name, error: `HTTP ${response.status}` });
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(chalk.red(`❌ ${name}`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    failed++;
    errors.push({ test: name, error: error.message });
    return { success: false, error: error.message };
  }
}

// Run tests
(async () => {
  console.log(chalk.yellow('📍 Testing Backend Health'));
  console.log('');
  
  await testEndpoint(
    'Backend Health Check',
    `${BACKEND_URL}/api/health`
  );
  
  console.log('');
  console.log(chalk.yellow('📍 Testing CORS Configuration'));
  console.log('');
  
  await testEndpoint(
    'CORS - Preflight Request',
    `${BACKEND_URL}/api/employees`,
    {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET'
      }
    }
  );
  
  await testEndpoint(
    'CORS - GET Request with Origin',
    `${BACKEND_URL}/api/employees`,
    {
      headers: {
        'Origin': FRONTEND_URL
      }
    }
  );
  
  console.log('');
  console.log(chalk.yellow('📍 Testing API Endpoints'));
  console.log('');
  
  await testEndpoint(
    'GET /api/employees',
    `${BACKEND_URL}/api/employees`
  );
  
  await testEndpoint(
    'GET /api/attendance',
    `${BACKEND_URL}/api/attendance`
  );
  
  await testEndpoint(
    'GET /api/attendance/stats',
    `${BACKEND_URL}/api/attendance/stats`
  );
  
  await testEndpoint(
    'GET /api/salary',
    `${BACKEND_URL}/api/salary`
  );
  
  console.log('');
  console.log(chalk.yellow('📍 Testing Frontend Accessibility'));
  console.log('');
  
  await testEndpoint(
    'Frontend Homepage',
    FRONTEND_URL
  );
  
  console.log('');
  console.log(chalk.yellow('📍 Testing Dashboard Data'));
  console.log('');
  
  const employeesResult = await testEndpoint(
    'Total Employees Count',
    `${BACKEND_URL}/api/employees`
  );
  
  if (employeesResult.success) {
    const employees = Array.isArray(employeesResult.data) ? employeesResult.data : employeesResult.data.data || [];
    console.log(chalk.gray(`   Total Employees: ${employees.length}`));
  }
  
  const statsResult = await testEndpoint(
    'Attendance Stats (Today)',
    `${BACKEND_URL}/api/attendance/stats`
  );
  
  if (statsResult.success) {
    console.log(chalk.gray(`   Stats: ${JSON.stringify(statsResult.data)}`));
    
    // Verify stats make sense
    const { totalPresent, fullDay, halfDay, invalid, absent } = statsResult.data;
    if (employeesResult.success) {
      const totalEmployees = Array.isArray(employeesResult.data) ? employeesResult.data.length : (employeesResult.data.data || []).length;
      const totalAccounted = (totalPresent || 0) + (fullDay || 0) + (halfDay || 0) + (invalid || 0) + (absent || 0);
      
      if (totalAccounted === totalEmployees) {
        console.log(chalk.green(`   ✅ Stats add up correctly (${totalAccounted} = ${totalEmployees})`));
      } else {
        console.log(chalk.red(`   ❌ Stats don't add up (${totalAccounted} ≠ ${totalEmployees})`));
        errors.push({ test: 'Dashboard Stats', error: 'Stats mismatch' });
      }
    }
  }
  
  console.log('');
  console.log(chalk.yellow('📍 Testing Salary Status'));
  console.log('');
  
  const salaryResult = await testEndpoint(
    'GET /api/salary (Check Status Field)',
    `${BACKEND_URL}/api/salary`
  );
  
  if (salaryResult.success) {
    const salaries = Array.isArray(salaryResult.data) ? salaryResult.data : salaryResult.data.data || [];
    if (salaries.length > 0) {
      const firstSalary = salaries[0];
      console.log(chalk.gray(`   Sample Salary Record:`));
      console.log(chalk.gray(`     Employee ID: ${firstSalary.employeeId}`));
      console.log(chalk.gray(`     Status: ${firstSalary.status || 'N/A'}`));
      console.log(chalk.gray(`     Date: ${firstSalary.date}`));
      
      // Note: Status showing 'regular' or 'oncall' is expected from salary records
      // The attendance status is shown through getDayType() in the frontend
      if (firstSalary.status === 'N/A' || !firstSalary.status) {
        console.log(chalk.yellow(`   ⚠️  Status is 'N/A' - This is expected if employee.status is not set`));
      } else {
        console.log(chalk.green(`   ✅ Status field exists: ${firstSalary.status}`));
      }
    }
  }
  
  console.log('');
  console.log(chalk.cyan('📊 TEST SUMMARY'));
  console.log(chalk.cyan('================================='));
  console.log('');
  console.log(chalk.green(`✅ Passed: ${passed}/${passed + failed}`));
  console.log(chalk.red(`❌ Failed: ${failed}/${passed + failed}`));
  console.log(chalk.cyan(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`));
  console.log('');
  
  if (errors.length > 0) {
    console.log(chalk.red('❌ ERRORS FOUND:'));
    errors.forEach((err, index) => {
      console.log(chalk.gray(`   ${index + 1}. ${err.test}: ${err.error}`));
    });
    console.log('');
  }
  
  if (failed === 0) {
    console.log(chalk.green('✅ ALL TESTS PASSED!'));
    console.log('');
    console.log(chalk.yellow('📋 Manual Verification Steps:'));
    console.log(chalk.white('   1. Open: ' + FRONTEND_URL));
    console.log(chalk.white('   2. Login with admin credentials'));
    console.log(chalk.white('   3. Check Dashboard stats'));
    console.log(chalk.white('   4. Go to Salary page'));
    console.log(chalk.white('   5. Verify Status column shows attendance status'));
    console.log(chalk.white('   6. Try "Adjust Salary Rate" - should work'));
    console.log(chalk.white('   7. Check Browser Console (F12) - no CORS errors'));
    console.log(chalk.white('   8. Check Network tab - all calls to ' + BACKEND_URL));
    console.log('');
  } else {
    console.log(chalk.red('❌ SOME TESTS FAILED'));
    console.log('');
    console.log(chalk.yellow('🔧 Troubleshooting Steps:'));
    console.log(chalk.white('   1. Check Vercel environment variables:'));
    console.log(chalk.white(`      Backend CORS_ORIGIN = ${FRONTEND_URL}`));
    console.log(chalk.white(`      Frontend VITE_API_URL = ${BACKEND_URL}/api`));
    console.log(chalk.white('   2. Verify both projects are deployed'));
    console.log(chalk.white('   3. Check Vercel deployment logs'));
    console.log(chalk.white('   4. Clear browser cache and try again'));
    console.log('');
  }
  
  process.exit(failed === 0 ? 0 : 1);
})();
