/**
 * 🧪 TEST ATTENDANCE API FILTERS
 * 
 * This script tests the new filtering functionality added to the attendance API
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testAttendanceFilters() {
  console.log('🧪 TESTING ATTENDANCE API FILTERS\n');
  console.log('='.repeat(70));
  
  try {
    // Test 1: Get all attendance records (paginated)
    console.log('\n📝 Test 1: Get all attendance records with pagination');
    console.log('   Endpoint: GET /api/attendance?page=1&limit=10');
    
    const response1 = await fetch(`${API_BASE}/attendance?page=1&limit=10`);
    const data1 = await response1.json();
    
    if (response1.ok && data1.success) {
      console.log('   ✅ SUCCESS');
      console.log(`   📊 Total items: ${data1.pagination?.totalItems || 0}`);
      console.log(`   📊 Retrieved: ${data1.data?.length || 0} records`);
      console.log(`   📄 Page: ${data1.pagination?.page}/${data1.pagination?.totalPages}`);
      
      // Validate response structure
      if (Array.isArray(data1.data)) {
        console.log('   ✅ Response contains data array');
      } else {
        console.log('   ❌ Response does NOT contain data array');
      }
      
      if (data1.pagination) {
        console.log('   ✅ Response contains pagination metadata');
      } else {
        console.log('   ❌ Response does NOT contain pagination metadata');
      }
    } else {
      console.log('   ❌ FAILED');
      console.log(`   Status: ${response1.status}`);
      console.log(`   Error: ${data1.message || data1.error || 'Unknown error'}`);
    }
    
    // Test 2: Filter by employeeId
    console.log('\n📝 Test 2: Filter attendance by employeeId');
    
    // First, get an employee ID from the first test
    if (data1.data && data1.data.length > 0 && data1.data[0].employee) {
      const testEmployeeId = data1.data[0].employee._id || data1.data[0].employee;
      console.log(`   Endpoint: GET /api/attendance?employeeId=${testEmployeeId}`);
      
      const response2 = await fetch(`${API_BASE}/attendance?employeeId=${testEmployeeId}`);
      const data2 = await response2.json();
      
      if (response2.ok && data2.success) {
        console.log('   ✅ SUCCESS');
        console.log(`   📊 Found ${data2.data?.length || 0} records for employee ${testEmployeeId}`);
        
        // Verify all records are for the same employee
        const allSameEmployee = data2.data?.every(record => 
          (record.employee?._id || record.employee) === testEmployeeId
        );
        
        if (allSameEmployee) {
          console.log('   ✅ All records are for the requested employee');
        } else {
          console.log('   ❌ Some records are for different employees');
        }
      } else {
        console.log('   ❌ FAILED');
        console.log(`   Status: ${response2.status}`);
        console.log(`   Error: ${data2.message || data2.error || 'Unknown error'}`);
      }
    } else {
      console.log('   ⚠️  SKIPPED (no employee data available)');
    }
    
    // Test 3: Filter by date range
    console.log('\n📝 Test 3: Filter attendance by date range');
    const startDate = '2025-10-13';
    const endDate = '2025-10-18';
    console.log(`   Endpoint: GET /api/attendance?startDate=${startDate}&endDate=${endDate}`);
    
    const response3 = await fetch(`${API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`);
    const data3 = await response3.json();
    
    if (response3.ok && data3.success) {
      console.log('   ✅ SUCCESS');
      console.log(`   📊 Found ${data3.data?.length || 0} records between ${startDate} and ${endDate}`);
      
      // Verify all records are within date range
      const allInRange = data3.data?.every(record => {
        const recordDate = new Date(record.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return recordDate >= start && recordDate <= end;
      });
      
      if (allInRange) {
        console.log('   ✅ All records are within the requested date range');
      } else {
        console.log('   ⚠️  Some records are outside the date range');
      }
    } else {
      console.log('   ❌ FAILED');
      console.log(`   Status: ${response3.status}`);
      console.log(`   Error: ${data3.message || data3.error || 'Unknown error'}`);
    }
    
    // Test 4: Combined filters (employeeId + date range)
    console.log('\n📝 Test 4: Filter by BOTH employeeId AND date range');
    
    if (data1.data && data1.data.length > 0 && data1.data[0].employee) {
      const testEmployeeId = data1.data[0].employee._id || data1.data[0].employee;
      console.log(`   Endpoint: GET /api/attendance?employeeId=${testEmployeeId}&startDate=${startDate}&endDate=${endDate}`);
      
      const response4 = await fetch(`${API_BASE}/attendance?employeeId=${testEmployeeId}&startDate=${startDate}&endDate=${endDate}`);
      const data4 = await response4.json();
      
      if (response4.ok && data4.success) {
        console.log('   ✅ SUCCESS');
        console.log(`   📊 Found ${data4.data?.length || 0} records`);
        
        // Verify records match both criteria
        const allMatch = data4.data?.every(record => {
          const matchesEmployee = (record.employee?._id || record.employee) === testEmployeeId;
          const recordDate = new Date(record.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          const matchesDateRange = recordDate >= start && recordDate <= end;
          return matchesEmployee && matchesDateRange;
        });
        
        if (allMatch) {
          console.log('   ✅ All records match both employee and date range filters');
        } else {
          console.log('   ❌ Some records do not match the filters');
        }
      } else {
        console.log('   ❌ FAILED');
        console.log(`   Status: ${response4.status}`);
        console.log(`   Error: ${data4.message || data4.error || 'Unknown error'}`);
      }
    } else {
      console.log('   ⚠️  SKIPPED (no employee data available)');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETED');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Run tests
testAttendanceFilters();
