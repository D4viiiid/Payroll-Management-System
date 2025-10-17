/**
 * Database Inspection Script
 * Checks what data actually exists in all collections
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

async function inspectDatabase() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        console.log('📊 Available Collections:');
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            console.log(`  - ${collection.name}: ${count} documents`);
        }
        console.log();

        // Inspect specific collections
        console.log('👥 Employees with demo names:');
        const employees = await mongoose.connection.db.collection('employees').find({
            firstName: { $in: ['Carl David', 'Ken', 'Justin', 'Casey'] }
        }).toArray();
        
        for (const emp of employees) {
            console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
            console.log(`    Daily Rate: ₱${emp.dailyRate || 'N/A'}`);
            console.log(`    Overtime Rate: ₱${emp.overtimeRate || 'N/A'}`);
        }
        console.log();

        console.log('📅 Attendance Records (Oct 14-19):');
        const startDate = new Date('2025-10-14T00:00:00.000Z');
        const endDate = new Date('2025-10-20T00:00:00.000Z');
        
        const attendances = await mongoose.connection.db.collection('attendances').find({
            date: { $gte: startDate, $lt: endDate }
        }).sort({ date: 1, employeeId: 1 }).toArray();
        
        console.log(`  Total: ${attendances.length} records`);
        const employeeGroups = {};
        for (const att of attendances) {
            if (!employeeGroups[att.employeeId]) {
                employeeGroups[att.employeeId] = [];
            }
            employeeGroups[att.employeeId].push(att);
        }
        
        for (const [empId, records] of Object.entries(employeeGroups)) {
            console.log(`  ${empId}: ${records.length} days`);
        }
        console.log();

        console.log('💰 Cash Advances:');
        const cashAdvances = await mongoose.connection.db.collection('cashadvances').find({}).toArray();
        console.log(`  Total: ${cashAdvances.length} records`);
        for (const ca of cashAdvances) {
            console.log(`  - ${ca.employeeName || ca.employeeId || 'Unknown'}: ₱${ca.amount} (${ca.status})`);
        }
        console.log();

        console.log('💵 Salary Records:');
        const salaries = await mongoose.connection.db.collection('salaries').find({}).toArray();
        console.log(`  Total: ${salaries.length} records`);
        for (const sal of salaries) {
            console.log(`  - ${sal.employeeId || 'Unknown'}: ₱${sal.salary || sal.amount || 'N/A'}`);
        }
        console.log();

        console.log('📋 Payroll Records:');
        const payrolls = await mongoose.connection.db.collection('payrolls').find({}).toArray();
        console.log(`  Total: ${payrolls.length} records`);
        for (const pay of payrolls) {
            console.log(`  - ${pay.employeeId || pay.employee || 'Unknown'}: Status ${pay.status || 'N/A'}`);
        }
        console.log();

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error inspecting database:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

inspectDatabase();
