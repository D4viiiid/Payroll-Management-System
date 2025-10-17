/**
 * 🧪 PAGINATION TEST SCRIPT
 * Tests all paginated API endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
let passed = 0;
let failed = 0;

/**
 * Test a paginated endpoint
 */
async function testEndpoint(name, url, expectedStructure = {}) {
  try {
    console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const responseTime = response.headers.get('x-response-time');
    const cacheStatus = response.headers.get('x-cache');
    
    // Check pagination structure
    const hasData = data.data || data.results || data.advances || Array.isArray(data);
    const hasPagination = data.pagination;
    
    if (!hasData) {
      throw new Error('Response missing data array');
    }
    
    // For paginated responses, check metadata
    if (hasPagination) {
      const required = ['page', 'limit', 'totalItems', 'totalPages', 'hasNextPage', 'hasPrevPage'];
      const missing = required.filter(field => !(field in data.pagination));
      
      if (missing.length > 0) {
        throw new Error(`Missing pagination fields: ${missing.join(', ')}`);
      }
    }
    
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    console.log(`  Response Time: ${duration}ms (Server: ${responseTime || 'N/A'})`);
    console.log(`  Cache: ${cacheStatus || 'N/A'}`);
    
    if (hasPagination) {
      console.log(`  Items: ${hasData.length || 0} / ${data.pagination.totalItems}`);
      console.log(`  Page: ${data.pagination.page} / ${data.pagination.totalPages}`);
    } else {
      const items = Array.isArray(data) ? data.length : (hasData.length || 0);
      console.log(`  Items: ${items}`);
    }
    
    passed++;
    return true;
    
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`  Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Run all pagination tests
 */
async function runTests() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  PAGINATION TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  // Test Employee pagination
  await testEndpoint(
    'Employee List (Default - No Pagination)',
    `${BASE_URL}/employees`
  );
  
  await testEndpoint(
    'Employee List (Paginated - Page 1, Limit 10)',
    `${BASE_URL}/employees?page=1&limit=10`
  );
  
  await testEndpoint(
    'Employee List (Paginated - Page 2, Limit 5)',
    `${BASE_URL}/employees?page=2&limit=5`
  );
  
  // Test Attendance pagination
  await testEndpoint(
    'Attendance List (Default)',
    `${BASE_URL}/attendance/attendance`
  );
  
  await testEndpoint(
    'Attendance List (Page 1, Limit 20)',
    `${BASE_URL}/attendance/attendance?page=1&limit=20`
  );
  
  // Test Payroll pagination
  await testEndpoint(
    'Payroll List (Default)',
    `${BASE_URL}/enhanced-payroll`
  );
  
  await testEndpoint(
    'Payroll List (Page 1, Limit 10)',
    `${BASE_URL}/enhanced-payroll?page=1&limit=10`
  );
  
  // Test Cash Advance pagination
  await testEndpoint(
    'Cash Advance List (Default)',
    `${BASE_URL}/cash-advance`
  );
  
  await testEndpoint(
    'Cash Advance List (Page 1, Limit 15)',
    `${BASE_URL}/cash-advance?page=1&limit=15`
  );
  
  // Test cache headers (second request should be cached)
  console.log(`\n${colors.cyan}Testing Cache Behavior (Second Request)${colors.reset}`);
  await testEndpoint(
    'Employee List (Cached)',
    `${BASE_URL}/employees?page=1&limit=10`
  );
  
  // Print summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`  Total Tests: ${total}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  Pass Rate: ${passRate}%`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  SOME TESTS FAILED${colors.reset}\n`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  process.exit(1);
});
