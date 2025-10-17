/**
 * 🔍 Quick API Endpoint Verification Test
 * Tests if all Phase 3 & 4 endpoints are accessible
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

console.log('\n' + '='.repeat(80));
console.log('🔍 API ENDPOINT VERIFICATION TEST');
console.log('='.repeat(80) + '\n');

const tests = [
  // Reports endpoints
  { method: 'GET', url: '/reports/summary', name: 'Reports Summary' },
  { method: 'GET', url: '/reports/cash-advance', name: 'Cash Advance Report' },
  { method: 'GET', url: '/archive/statistics', name: 'Archive Statistics' },
];

async function testEndpoint(test) {
  try {
    const response = await axios({
      method: test.method,
      url: `${BASE_URL}${test.url}`,
      timeout: 5000
    });
    
    console.log(`✅ ${test.name}: ${response.status} - ${response.statusText}`);
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`⚠️  ${test.name}: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ ${test.name}: Server not running`);
    } else {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('Testing API endpoints...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All API endpoints are accessible and working!');
  } else {
    console.log('\n⚠️  Some endpoints failed - check server status');
  }
  console.log('='.repeat(80) + '\n');
}

runTests();
