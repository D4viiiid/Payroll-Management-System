/**
 * Test script to verify all admin page endpoints
 * Tests: Employees, Attendance, Salary, Cash Advance, Payroll
 */

const BASE_URL = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testEndpoint(name, url) {
  try {
    console.log(`\n${colors.cyan}Testing:${colors.reset} ${name}`);
    console.log(`${colors.blue}URL:${colors.reset} ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`${colors.green}✓ SUCCESS${colors.reset} - Status: ${response.status}`);
      console.log(`Response type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      if (Array.isArray(data)) {
        console.log(`Items count: ${data.length}`);
      } else if (data.data && Array.isArray(data.data)) {
        console.log(`Items count: ${data.data.length}`);
      } else {
        console.log(`Response keys: ${Object.keys(data).join(', ')}`);
      }
      return true;
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - Status: ${response.status}`);
      console.log(`Error: ${data.message || data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.yellow}==========================================`);
  console.log(`  ADMIN ENDPOINTS TEST SUITE`);
  console.log(`==========================================${colors.reset}\n`);

  const tests = [
    { name: 'Employees - GET /api/employees', url: `${BASE_URL}/employees?page=1&limit=5` },
    { name: 'Attendance - GET /api/attendance', url: `${BASE_URL}/attendance?page=1&limit=5` },
    { name: 'Salary - GET /api/salary', url: `${BASE_URL}/salary` },
    { name: 'Cash Advance - GET /api/cash-advance', url: `${BASE_URL}/cash-advance?page=1&limit=5` },
    { name: 'Payroll - GET /api/payroll', url: `${BASE_URL}/payroll?page=1&limit=5` },
  ];

  const results = [];
  
  for (const test of tests) {
    const passed = await testEndpoint(test.name, test.url);
    results.push({ name: test.name, passed });
  }

  console.log(`\n${colors.yellow}==========================================`);
  console.log(`  SUMMARY`);
  console.log(`==========================================${colors.reset}\n`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const icon = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${icon} ${result.name}`);
  });

  console.log(`\n${colors.cyan}Total: ${results.length} | Passed: ${colors.green}${passed}${colors.reset} | Failed: ${colors.red}${failed}${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}⚠️  ${failed} test(s) failed. Check the errors above.${colors.reset}\n`);
  }
}

runTests();
