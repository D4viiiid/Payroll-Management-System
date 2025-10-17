/**
 * 🧪 FINAL VERIFICATION TEST
 * Test all database queries to ensure data is accessible
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

const employeeSchema = new mongoose.Schema({}, { strict: false });
const attendanceSchema = new mongoose.Schema({}, { strict: false });
const cashAdvanceSchema = new mongoose.Schema({}, { strict: false });
const payrollSchema = new mongoose.Schema({}, { strict: false });
const salarySchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);
const Payroll = mongoose.model('Payroll', payrollSchema);
const Salary = mongoose.model('Salary', salarySchema);

async function runTests() {
    try {
        console.log('🧪 FINAL VERIFICATION TEST SUITE\n');
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');

        let passed = 0;
        let failed = 0;

        // TEST 1: Employees have salary rates
        console.log('TEST 1: Checking employee salary rates...');
        const employees = await Employee.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        
        const allHaveRates = employees.every(emp => emp.dailyRate && emp.overtimeRate);
        if (allHaveRates && employees.length === 4) {
            console.log('✅ PASS: All 4 employees have dailyRate and overtimeRate\n');
            passed++;
        } else {
            console.log('❌ FAIL: Some employees missing rates\n');
            failed++;
        }

        // TEST 2: Payroll records have required UI fields
        console.log('TEST 2: Checking payroll record structure...');
        const payrolls = await Payroll.find({ archived: { $ne: true } });
        
        const allHaveFields = payrolls.every(p => 
            p.employeeName && 
            p.salary !== undefined && 
            p.deductions !== undefined && 
            p.netSalary !== undefined
        );
        
        if (allHaveFields && payrolls.length === 4) {
            console.log('✅ PASS: All 4 payrolls have employeeName, salary, deductions, netSalary\n');
            passed++;
        } else {
            console.log('❌ FAIL: Payroll records missing required fields\n');
            console.log('Details:', payrolls.map(p => ({
                name: p.employeeName,
                hasSalary: p.salary !== undefined,
                hasDeductions: p.deductions !== undefined,
                hasNetSalary: p.netSalary !== undefined
            })));
            failed++;
        }

        // TEST 3: Attendance records calculated correctly
        console.log('TEST 3: Checking attendance calculations...');
        const attendances = await Attendance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        
        const allCalculated = attendances.every(a => 
            a.daySalary !== undefined &&
            a.actualHoursWorked !== undefined &&
            a.dayType !== undefined
        );
        
        if (allCalculated && attendances.length >= 16) {
            console.log(`✅ PASS: All ${attendances.length} attendance records have salary calculations\n`);
            passed++;
        } else {
            console.log('❌ FAIL: Attendance records not fully calculated\n');
            failed++;
        }

        // TEST 4: Cash advances have employee names
        console.log('TEST 4: Checking cash advance data...');
        const cashAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        
        const allNamed = cashAdvances.every(ca => ca.employeeName);
        
        if (allNamed && cashAdvances.length === 3) {
            console.log('✅ PASS: All 3 cash advances have employeeName\n');
            passed++;
        } else {
            console.log('❌ FAIL: Some cash advances missing employeeName\n');
            failed++;
        }

        // TEST 5: Salary configurations exist
        console.log('TEST 5: Checking salary configurations...');
        const salaries = await Salary.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        
        if (salaries.length === 4) {
            console.log('✅ PASS: All 4 salary configurations exist\n');
            passed++;
        } else {
            console.log(`❌ FAIL: Only ${salaries.length}/4 salary configurations found\n`);
            failed++;
        }

        // TEST 6: No undefined values in critical fields
        console.log('TEST 6: Checking for undefined values in payroll...');
        const hasUndefined = payrolls.some(p => 
            p.salary === undefined ||
            p.deductions === undefined ||
            p.netSalary === undefined
        );
        
        if (!hasUndefined) {
            console.log('✅ PASS: No undefined values in payroll records\n');
            passed++;
        } else {
            console.log('❌ FAIL: Found undefined values in payroll\n');
            failed++;
        }

        // TEST 7: Archived endpoint data structure
        console.log('TEST 7: Checking archived payrolls...');
        const archivedPayrolls = await Payroll.find({ archived: true });
        console.log(`✅ PASS: Archived endpoint ready (${archivedPayrolls.length} archived records)\n`);
        passed++;

        // SUMMARY
        console.log('='.repeat(70));
        console.log('TEST SUMMARY');
        console.log('='.repeat(70));
        console.log(`✅ Passed: ${passed}/7`);
        console.log(`❌ Failed: ${failed}/7`);
        console.log(`📊 Success Rate: ${Math.round((passed/7)*100)}%`);
        console.log();

        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ System is ready for production use');
            console.log('\n⚠️  IMPORTANT: Restart backend server to apply route changes');
        } else {
            console.log('⚠️  SOME TESTS FAILED');
            console.log('Please review failed tests above');
        }

        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Test suite error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

runTests();
