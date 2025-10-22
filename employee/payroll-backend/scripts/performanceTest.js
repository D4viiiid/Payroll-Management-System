import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * 🚀 PERFORMANCE TEST SCRIPT
 * Tests all major API endpoints to verify performance improvements
 * Target: All requests should complete in <100ms (2-digit ms)
 */

const API_BASE = 'http://localhost:5000/api';
const EXPECTED_MAX_TIME = 100; // Target: 2-digit ms (< 100ms)

// Test configuration
const tests = [
  { name: 'Get All Employees', method: 'GET', url: '/employees?page=1&limit=50' },
  { name: 'Get Attendance Stats', method: 'GET', url: '/attendance/stats' },
  { name: 'Get Attendance Records', method: 'GET', url: '/attendance?page=1&limit=50' },
  { name: 'Get Current Salary Rate', method: 'GET', url: '/salary-rate/current' },
  { name: 'Get All Salaries', method: 'GET', url: '/salary?page=1&limit=50' },
  { name: 'Get All Payrolls', method: 'GET', url: '/payrolls' },
  { name: 'Get Cash Advances', method: 'GET', url: '/cash-advance' },
];

/**
 * Run a single test
 */
async function runTest(test) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}${test.url}`, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      return {
        name: test.name,
        success: false,
        duration,
        error: `HTTP ${response.status}`
      };
    }
    
    await response.json(); // Consume response
    
    return {
      name: test.name,
      success: true,
      duration,
      withinTarget: duration <= EXPECTED_MAX_TIME
    };
    
  } catch (error) {
    const endTime = Date.now();
    return {
      name: test.name,
      success: false,
      duration: endTime - startTime,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(chalk.blue('🚀 Starting Performance Test Suite\n'));
  console.log(chalk.cyan(`Target: All requests < ${EXPECTED_MAX_TIME}ms (2-digit ms)\n`));
  console.log('─'.repeat(80));
  
  const results = [];
  
  for (const test of tests) {
    process.stdout.write(chalk.gray(`Running: ${test.name}... `));
    const result = await runTest(test);
    results.push(result);
    
    if (result.success) {
      const timeStr = `${result.duration}ms`;
      if (result.withinTarget) {
        console.log(chalk.green(`✓ ${timeStr}`));
      } else {
        console.log(chalk.yellow(`⚠ ${timeStr} (exceeds target)`));
      }
    } else {
      console.log(chalk.red(`✗ FAILED: ${result.error}`));
    }
  }
  
  console.log('─'.repeat(80));
  
  // Summary
  const successful = results.filter(r => r.success);
  const withinTarget = results.filter(r => r.success && r.withinTarget);
  const avgTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  const maxTime = Math.max(...successful.map(r => r.duration));
  const minTime = Math.min(...successful.map(r => r.duration));
  
  console.log(chalk.blue('\n📊 Performance Summary:'));
  console.log(`   Total tests: ${results.length}`);
  console.log(`   Successful: ${chalk.green(successful.length)}`);
  console.log(`   Within target (<${EXPECTED_MAX_TIME}ms): ${chalk.green(withinTarget.length)}/${successful.length}`);
  console.log(`   Average time: ${chalk.cyan(avgTime.toFixed(2) + 'ms')}`);
  console.log(`   Min time: ${chalk.green(minTime + 'ms')}`);
  console.log(`   Max time: ${maxTime > EXPECTED_MAX_TIME ? chalk.yellow(maxTime + 'ms') : chalk.green(maxTime + 'ms')}`);
  
  if (withinTarget.length === successful.length) {
    console.log(chalk.green('\n✅ All tests within target performance!'));
  } else {
    console.log(chalk.yellow(`\n⚠️  ${successful.length - withinTarget.length} test(s) exceeded target`));
  }
  
  // Detailed results for slow tests
  const slowTests = results.filter(r => r.success && !r.withinTarget);
  if (slowTests.length > 0) {
    console.log(chalk.yellow('\n🐌 Slow Tests (need optimization):'));
    slowTests.forEach(test => {
      console.log(`   ${test.name}: ${test.duration}ms`);
    });
  }
  
  console.log('');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/employees?page=1&limit=1`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main
(async () => {
  console.log(chalk.blue('🔍 Checking if server is running...\n'));
  
  const isRunning = await checkServer();
  
  if (!isRunning) {
    console.log(chalk.red('❌ Server is not running!'));
    console.log(chalk.yellow('Please start the server first:'));
    console.log(chalk.gray('   cd employee/payroll-backend'));
    console.log(chalk.gray('   npm run dev\n'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Server is running\n'));
  await runAllTests();
  process.exit(0);
})();
