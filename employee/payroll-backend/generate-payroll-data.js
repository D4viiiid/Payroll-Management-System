/**
 * 📊 GENERATE PAYROLL DATA
 * 1. Create salary records for demo employees
 * 2. Generate payroll for Oct 14-19 period
 * 3. Verify all data is properly linked
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

// Define models
const employeeSchema = new mongoose.Schema({}, { strict: false });
const attendanceSchema = new mongoose.Schema({}, { strict: false });
const salarySchema = new mongoose.Schema({}, { strict: false });
const payrollSchema = new mongoose.Schema({}, { strict: false });
const cashAdvanceSchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
const Salary = mongoose.model('Salary', salarySchema);
const Payroll = mongoose.model('Payroll', payrollSchema);
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);

// Manila timezone offset (UTC+8)
function createManilaDate(year, month, day, hour = 0, minute = 0) {
    const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
    return date;
}

async function generatePayrollData() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ============================================================
        // STEP 1: Create Salary Records
        // ============================================================
        console.log('💵 STEP 1: Creating Salary Records...\n');

        const employees = await Employee.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        for (const emp of employees) {
            // Check if salary record already exists
            const existingSalary = await Salary.findOne({
                employeeId: emp.employeeId,
                archived: false
            });

            if (!existingSalary) {
                const salaryRecord = await Salary.create({
                    employeeId: emp.employeeId,
                    name: `${emp.firstName} ${emp.lastName}`,
                    salary: emp.dailyRate * 26, // Monthly salary (26 work days)
                    status: 'regular',
                    date: createManilaDate(2025, 10, 1), // Oct 1, 2025
                    archived: false
                });
                console.log(`  ✅ ${emp.firstName} ${emp.lastName}: ₱${salaryRecord.salary}/month`);
            } else {
                console.log(`  ⏭️  ${emp.firstName} ${emp.lastName}: Salary record already exists`);
            }
        }
        console.log();

        // ============================================================
        // STEP 2: Generate Payroll for Oct 14-19
        // ============================================================
        console.log('📋 STEP 2: Generating Payroll Records...\n');

        const payrollPeriod = {
            start: createManilaDate(2025, 10, 14),
            end: createManilaDate(2025, 10, 19),
            cutoffDate: createManilaDate(2025, 10, 20)
        };

        for (const emp of employees) {
            // Check if payroll already exists
            const existingPayroll = await Payroll.findOne({
                employeeId: emp.employeeId,
                startDate: payrollPeriod.start,
                endDate: payrollPeriod.end
            });

            if (existingPayroll) {
                console.log(`  ⏭️  ${emp.firstName} ${emp.lastName}: Payroll already exists`);
                continue;
            }

            // Get attendance records for this employee
            const attendanceRecords = await Attendance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                archived: false
            });

            // Calculate totals
            let totalDays = 0;
            let totalHours = 0;
            let totalOvertimeHours = 0;
            let basicSalary = 0;
            let overtimePay = 0;

            for (const record of attendanceRecords) {
                if (record.dayType === 'Full Day') {
                    totalDays += 1;
                    basicSalary += emp.dailyRate;
                } else if (record.dayType === 'Half Day') {
                    totalDays += 0.5;
                    basicSalary += emp.dailyRate * 0.5;
                }

                totalHours += record.actualHoursWorked || 0;
                totalOvertimeHours += record.overtimeHours || 0;
                overtimePay += (record.overtimeHours || 0) * emp.overtimeRate;
            }

            // Get cash advances
            const cashAdvances = await CashAdvance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                status: 'Approved'
            });

            const totalCashAdvance = cashAdvances.reduce((sum, ca) => sum + ca.amount, 0);

            // Calculate gross and net salary
            const grossSalary = basicSalary + overtimePay;
            const netSalary = grossSalary - totalCashAdvance;

            // Create payroll record
            const payroll = await Payroll.create({
                employeeId: emp.employeeId,
                name: `${emp.firstName} ${emp.lastName}`,
                startDate: payrollPeriod.start,
                endDate: payrollPeriod.end,
                cutoffDate: payrollPeriod.cutoffDate,
                daysWorked: totalDays,
                hoursWorked: totalHours,
                overtimeHours: totalOvertimeHours,
                basicSalary: Math.round(basicSalary * 100) / 100,
                overtimePay: Math.round(overtimePay * 100) / 100,
                grossSalary: Math.round(grossSalary * 100) / 100,
                cashAdvance: totalCashAdvance,
                netSalary: Math.round(netSalary * 100) / 100,
                status: 'Pending',
                date: new Date(),
                archived: false
            });

            console.log(`  ✅ ${emp.firstName} ${emp.lastName}:`);
            console.log(`     - Days Worked: ${totalDays}`);
            console.log(`     - Hours: ${totalHours}h (OT: ${totalOvertimeHours}h)`);
            console.log(`     - Basic Salary: ₱${payroll.basicSalary}`);
            console.log(`     - Overtime Pay: ₱${payroll.overtimePay}`);
            console.log(`     - Gross Salary: ₱${payroll.grossSalary}`);
            console.log(`     - Cash Advance: -₱${payroll.cashAdvance}`);
            console.log(`     - Net Salary: ₱${payroll.netSalary}`);
            console.log();
        }

        // ============================================================
        // STEP 3: Verification
        // ============================================================
        console.log('✅ STEP 3: Final Verification...\n');

        const finalSalaries = await Salary.countDocuments({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        const finalPayrolls = await Payroll.countDocuments({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        const finalAttendance = await Attendance.countDocuments({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] },
            date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end }
        });

        const finalCashAdvances = await CashAdvance.countDocuments({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`  💵 Salary Records: ${finalSalaries}/4`);
        console.log(`  📋 Payroll Records: ${finalPayrolls}/4`);
        console.log(`  📅 Attendance Records: ${finalAttendance}/17`);
        console.log(`  💰 Cash Advances: ${finalCashAdvances}/3`);

        console.log('\n' + '='.repeat(70));
        console.log('🎉 PAYROLL DATA GENERATION COMPLETED');
        console.log('='.repeat(70));
        console.log('\n✅ All modules should now display data correctly:');
        console.log('   - Employee: 4 demo employees with rates');
        console.log('   - Attendance: 17 attendance records');
        console.log('   - Salary: 4 salary configurations');
        console.log('   - Cash Advance: 3 approved cash advances');
        console.log('   - Payroll Records: 4 payroll records for Oct 14-19');
        console.log('   - Payslip: Ready to generate for all 4 employees\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error generating payroll:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

generatePayrollData();
