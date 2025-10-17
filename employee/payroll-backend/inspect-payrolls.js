/**
 * 🔍 DETAILED PAYROLL INSPECTION
 * Check the exact structure of payroll records
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

const payrollSchema = new mongoose.Schema({}, { strict: false });
const Payroll = mongoose.model('Payroll', payrollSchema);

async function inspectPayrolls() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const payrolls = await Payroll.find({});

        console.log(`📋 Total Payroll Records: ${payrolls.length}\n`);

        for (const payroll of payrolls) {
            console.log('─'.repeat(70));
            console.log('Payroll Record:');
            console.log(JSON.stringify(payroll, null, 2));
            console.log();
        }

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

inspectPayrolls();
