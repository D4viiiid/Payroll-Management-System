import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Helper function to calculate work hours (excluding lunch break)
const calculateWorkHours = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  
  const startTime = new Date(timeIn);
  const endTime = new Date(timeOut);
  
  // Calculate total time in milliseconds
  let totalMs = endTime - startTime;
  
  // Check if lunch break (12:00 PM - 12:59 PM) is within work hours
  const lunchStart = new Date(startTime);
  lunchStart.setHours(12, 0, 0, 0);
  
  const lunchEnd = new Date(startTime);
  lunchEnd.setHours(13, 0, 0, 0); // 1:00 PM
  
  // If employee worked through lunch time, subtract 1 hour
  if (startTime < lunchEnd && endTime > lunchStart) {
    // Calculate overlap with lunch break
    const overlapStart = startTime < lunchStart ? lunchStart : startTime;
    const overlapEnd = endTime > lunchEnd ? lunchEnd : endTime;
    const lunchOverlapMs = overlapEnd - overlapStart;
    
    if (lunchOverlapMs > 0) {
      totalMs -= lunchOverlapMs;
    }
  }
  
  // Convert milliseconds to hours
  const hours = totalMs / (1000 * 60 * 60);
  return Math.max(0, hours);
};

async function testWorkHoursCalculation() {
  try {
    console.log('🧪 Testing Work Hours Calculation\n');
    
    const tests = [
      {
        name: '3 minutes (your case)',
        timeIn: '2025-10-14T09:06:00',
        timeOut: '2025-10-14T09:09:00',
        expected: 0.05, // 3 minutes = 0.05 hours
        shouldBe: 'NOT Full Day (< 4 hours)'
      },
      {
        name: 'Full Day (9:30 AM - 5:00 PM)',
        timeIn: '2025-10-14T09:30:00',
        timeOut: '2025-10-14T17:00:00',
        expected: 6.5, // 7.5 hours - 1 hour lunch = 6.5 hours
        shouldBe: 'Full Day (>= 6.5 hours)'
      },
      {
        name: 'Half Day (9:30 AM - 2:00 PM)',
        timeIn: '2025-10-14T09:30:00',
        timeOut: '2025-10-14T14:00:00',
        expected: 3.5, // 4.5 hours - 1 hour lunch = 3.5 hours
        shouldBe: 'NOT counted (< 4 hours)'
      },
      {
        name: 'Half Day (9:00 AM - 2:00 PM)',
        timeIn: '2025-10-14T09:00:00',
        timeOut: '2025-10-14T14:00:00',
        expected: 4.0, // 5 hours - 1 hour lunch = 4 hours
        shouldBe: 'Half Day (>= 4 hours, < 6.5 hours)'
      },
      {
        name: 'Overtime (9:30 AM - 6:00 PM)',
        timeIn: '2025-10-14T09:30:00',
        timeOut: '2025-10-14T18:00:00',
        expected: 7.5, // 8.5 hours - 1 hour lunch = 7.5 hours
        shouldBe: 'Full Day with OT (>= 6.5 hours)'
      },
      {
        name: 'Late (9:31 AM - 5:00 PM)',
        timeIn: '2025-10-14T09:31:00',
        timeOut: '2025-10-14T17:00:00',
        expected: 6.483, // Just under 6.5 hours
        shouldBe: 'Half Day (>= 4 hours, < 6.5 hours)'
      },
      {
        name: 'No lunch break (2:00 PM - 5:00 PM)',
        timeIn: '2025-10-14T14:00:00',
        timeOut: '2025-10-14T17:00:00',
        expected: 3.0, // 3 hours, no lunch deduction
        shouldBe: 'NOT counted (< 4 hours)'
      }
    ];
    
    tests.forEach((test, index) => {
      const hours = calculateWorkHours(test.timeIn, test.timeOut);
      const status = hours >= 6.5 ? 'Full Day' : hours >= 4 ? 'Half Day' : 'Not counted';
      const pass = Math.abs(hours - test.expected) < 0.01;
      
      console.log(`Test ${index + 1}: ${test.name}`);
      console.log(`  Time In:  ${test.timeIn}`);
      console.log(`  Time Out: ${test.timeOut}`);
      console.log(`  Work Hours: ${hours.toFixed(2)} hours`);
      console.log(`  Status: ${status}`);
      console.log(`  Expected: ${test.expected.toFixed(2)} hours (${test.shouldBe})`);
      console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}\n`);
    });
    
    // Now check actual database record
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const record = await db.collection('attendances').findOne({ 
      employeeId: 'EMP-7479' 
    });
    
    if (record) {
      console.log('📊 Your Current Attendance Record:');
      console.log(`  Time In:  ${record.timeIn}`);
      console.log(`  Time Out: ${record.timeOut}`);
      
      if (record.timeIn && record.timeOut) {
        const hours = calculateWorkHours(record.timeIn, record.timeOut);
        const status = hours >= 6.5 ? 'Full Day' : hours >= 4 ? 'Half Day' : 'Not counted';
        
        console.log(`  Work Hours: ${hours.toFixed(2)} hours`);
        console.log(`  Should be: ${status}`);
        console.log(`  Currently shows: Full Day ❌ WRONG!`);
      }
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testWorkHoursCalculation();
