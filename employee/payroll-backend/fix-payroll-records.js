/**
 * Fix Existing Payroll Records
 * Adds employee reference and paymentStatus to existing payrolls
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function fixPayrollRecords() {
  try {
    console.log('🔧 FIXING PAYROLL RECORDS');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Payroll = mongoose.connection.collection('payrolls');
    const Employee = mongoose.connection.collection('employees');

    // Get all payroll records
    const payrolls = await Payroll.find({}).toArray();
    console.log(`📊 Found ${payrolls.length} payroll records\n`);

    let updated = 0;
    let errors = 0;

    for (const payroll of payrolls) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Add paymentStatus if missing
        if (!payroll.paymentStatus) {
          updates.paymentStatus = 'Pending';
          needsUpdate = true;
        }

        // Add employee reference if missing but employeeId exists
        if (!payroll.employee && payroll.employeeId) {
          const employee = await Employee.findOne({ employeeId: payroll.employeeId });
          if (employee) {
            updates.employee = employee._id;
            needsUpdate = true;
            console.log(`✅ Linking payroll to employee: ${employee.firstName} ${employee.lastName}`);
          } else {
            console.log(`⚠️  No employee found for employeeId: ${payroll.employeeId}`);
          }
        }

        // Add cashAdvance field if missing (use deductions as fallback)
        if (payroll.cashAdvance === undefined && payroll.deductions !== undefined) {
          updates.cashAdvance = payroll.deductions;
          needsUpdate = true;
        }

        // Add archived field if missing
        if (payroll.archived === undefined) {
          updates.archived = false;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Payroll.updateOne(
            { _id: payroll._id },
            { $set: updates }
          );
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating payroll ${payroll._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n============================================================`);
    console.log(`✅ Updated ${updated} payroll records`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log(`============================================================\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

fixPayrollRecords();
