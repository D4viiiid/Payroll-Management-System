import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Attendance } from './models/Attendance.model.js';

dotenv.config({path:'config.env'});

async function testAttendance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get today's records
        const today = new Date('2025-10-19');
        const records = await Attendance.find({
            date: { $gte: today }
        }).sort({date: -1}).limit(10);
        
        console.log('\n📊 Recent Attendance Records (Oct 19, 2025):');
        console.log('='.repeat(80));
        
        records.forEach((r, index) => {
            console.log(`\n${index + 1}. Employee ID: ${r.employeeId}`);
            console.log(`   Date: ${r.date}`);
            console.log(`   Time In: ${r.timeIn}`);
            console.log(`   Time Out: ${r.timeOut}`);
            console.log(`   Day Type: ${r.dayType}`);
            console.log(`   Status: ${r.status}`);
            console.log(`   Hours Worked: ${r.actualHoursWorked}`);
            console.log(`   Is Valid Day: ${r.isValidDay}`);
            console.log(`   Validation Reason: ${r.validationReason}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAttendance();
