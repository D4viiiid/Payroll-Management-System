/**
 * 🧪 PERFORMANCE TEST SCRIPT
 * 
 * Tests API response times in development vs production mode
 * Run this to measure the performance improvements
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testEndpoint(endpoint, name) {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const duration = Date.now() - start;
    const data = await response.json();
    
    console.log(`\n✅ ${name}`);
    console.log(`   Response time: ${duration}ms`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Records: ${Array.isArray(data) ? data.length : 'N/A'}`);
    
    return { name, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`\n❌ ${name}`);
    console.log(`   Response time: ${duration}ms`);
    console.log(`   Error: ${error.message}`);
    
    return { name, duration, error: error.message };
  }
}

async function runPerformanceTests() {
  console.log('🚀 PERFORMANCE TEST - API Response Times');
  console.log('==========================================\n');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base: ${API_BASE}\n`);
  console.log('Testing endpoints...\n');
  
  const results = [];
  
  // Test multiple endpoints
  results.push(await testEndpoint('/employees', 'GET /api/employees'));
  results.push(await testEndpoint('/attendance', 'GET /api/attendance'));
  results.push(await testEndpoint('/salary', 'GET /api/salary'));
  
  // Calculate statistics
  console.log('\n==========================================');
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('==========================================\n');
  
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  
  if (successful.length > 0) {
    const avg = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const min = Math.min(...successful.map(r => r.duration));
    const max = Math.max(...successful.map(r => r.duration));
    
    console.log(`Successful requests: ${successful.length}`);
    console.log(`Average response time: ${avg.toFixed(0)}ms`);
    console.log(`Fastest response: ${min}ms`);
    console.log(`Slowest response: ${max}ms\n`);
    
    if (process.env.NODE_ENV === 'production') {
      if (avg < 200) {
        console.log('✅ EXCELLENT! Average response time < 200ms');
      } else if (avg < 500) {
        console.log('⚠️  GOOD. Average response time < 500ms');
      } else {
        console.log('❌ SLOW. Average response time > 500ms');
      }
    }
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed requests: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n==========================================\n');
}

// Run tests
runPerformanceTests().catch(console.error);
