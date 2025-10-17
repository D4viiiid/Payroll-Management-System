/**
 * 🔍 INVESTIGATE CASH ADVANCE ISSUE
 * Find out why old static data is showing instead of real data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

const cashAdvanceSchema = new mongoose.Schema({}, { strict: false });
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);

async function investigateCashAdvances() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('💰 ALL CASH ADVANCES IN DATABASE:\n');
        const allCashAdvances = await CashAdvance.find({}).sort({ date: -1 });

        console.log(`Total records: ${allCashAdvances.length}\n`);

        for (const ca of allCashAdvances) {
            console.log('─'.repeat(70));
            console.log(`ID: ${ca._id}`);
            console.log(`Employee ID: ${ca.employeeId || 'MISSING'}`);
            console.log(`Employee Name: ${ca.employeeName || 'MISSING'}`);
            console.log(`Amount: ₱${ca.amount}`);
            console.log(`Status: ${ca.status}`);
            console.log(`Date: ${ca.date}`);
            console.log(`Archived: ${ca.archived || false}`);
            console.log();
        }

        console.log('\n📊 DEMO EMPLOYEES CASH ADVANCES:\n');
        const demoCashAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`Demo records: ${demoCashAdvances.length}`);
        for (const ca of demoCashAdvances) {
            console.log(`  - ${ca.employeeName}: ₱${ca.amount} (${ca.status})`);
        }

        console.log('\n📊 RECORDS WITHOUT EMPLOYEE ID:\n');
        const noEmployeeId = await CashAdvance.find({
            $or: [
                { employeeId: { $exists: false } },
                { employeeId: null },
                { employeeId: '' },
                { employeeId: '—' }
            ]
        });

        console.log(`Records without employee ID: ${noEmployeeId.length}`);
        for (const ca of noEmployeeId) {
            console.log(`  - ${ca.employeeName || ca.name || 'Unknown'}: ₱${ca.amount} (${ca.status})`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

investigateCashAdvances();
