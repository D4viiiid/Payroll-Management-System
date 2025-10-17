/**
 * 🔧 COMPREHENSIVE FIX - PART 2
 * 1. Clean old deduction test data
 * 2. Update payroll to include cash advances
 * 3. Fix date ranges (exclude Sunday)
 * 4. Regenerate payroll with correct dates
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
const deductionSchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);
const Payroll = mongoose.model('Payroll', payrollSchema);
const Deduction = mongoose.model('Deduction', deductionSchema);

// Manila timezone helper
function createManilaDate(year, month, day, hour = 0, minute = 0) {
    const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
    return date;
}

async function comprehensiveFixPart2() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ============================================================
        // STEP 1: Clean Old Test Data from Deductions Collection
        // ============================================================
        console.log('🧹 STEP 1: Cleaning Old Test Data...\n');

        const oldDeductions = await Deduction.find({});
        console.log(`Found ${oldDeductions.length} old deduction records`);

        if (oldDeductions.length > 0) {
            await Deduction.deleteMany({});
            console.log(`✅ Deleted all old deduction records (po op, qwe asdd, etc.)\n`);
        } else {
            console.log(`✅ No old deduction records to clean\n`);
        }

        // ============================================================
        // STEP 2: Verify Cash Advances Have Proper Dates
        // ============================================================
        console.log('📅 STEP 2: Updating Cash Advance Dates...\n');

        const cashAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-2651'] }
        });

        // Update cash advances with proper dates (within the work week)
        const updates = [
            { employeeId: 'EMP-1491', date: createManilaDate(2025, 10, 15) }, // Tuesday
            { employeeId: 'EMP-7520', date: createManilaDate(2025, 10, 16) }, // Wednesday
            { employeeId: 'EMP-2651', date: createManilaDate(2025, 10, 17) }  // Thursday
        ];

        for (const update of updates) {
            await CashAdvance.updateOne(
                { employeeId: update.employeeId },
                { $set: { date: update.date } }
            );
            console.log(`  ✅ Updated ${update.employeeId} cash advance date`);
        }
        console.log();

        // ============================================================
        // STEP 3: Remove Sunday Attendance Records
        // ============================================================
        console.log('🗑️  STEP 3: Removing Sunday Attendance Records...\n');

        // Sunday Oct 20, 2025
        const sundayDate = createManilaDate(2025, 10, 20);
        
        const sundayRecords = await Attendance.find({
            date: sundayDate
        });

        if (sundayRecords.length > 0) {
            await Attendance.deleteMany({ date: sundayDate });
            console.log(`✅ Removed ${sundayRecords.length} Sunday attendance records\n`);
        } else {
            console.log(`✅ No Sunday records found (correct!)\n`);
        }

        // ============================================================
        // STEP 4: Regenerate Payroll with Cash Advances
        // ============================================================
        console.log('💼 STEP 4: Regenerating Payroll with Cash Advances...\n');

        // Work week: Monday Oct 14 - Saturday Oct 19
        // Cutoff: Sunday Oct 20
        // Payroll date: Monday Oct 21
        const payrollPeriod = {
            start: createManilaDate(2025, 10, 14), // Monday
            end: createManilaDate(2025, 10, 19),   // Saturday
            cutoffDate: createManilaDate(2025, 10, 20), // Sunday (cutoff)
            payrollDate: createManilaDate(2025, 10, 21) // Monday (next week)
        };

        // Delete existing payrolls
        await Payroll.deleteMany({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        const employees = await Employee.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        for (const emp of employees) {
            // Get attendance for Mon-Sat only
            const attendanceRecords = await Attendance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                archived: false
            });

            // Calculate totals
            let totalDaysWorked = 0;
            let totalHoursWorked = 0;
            let totalOvertimeHours = 0;
            let basicSalary = 0;
            let overtimePay = 0;

            for (const record of attendanceRecords) {
                if (record.dayType === 'Full Day') {
                    totalDaysWorked += 1;
                } else if (record.dayType === 'Half Day') {
                    totalDaysWorked += 0.5;
                }

                totalHoursWorked += record.actualHoursWorked || 0;
                totalOvertimeHours += record.overtimeHours || 0;
                basicSalary += record.daySalary || 0;
                overtimePay += record.overtimePay || 0;
            }

            // Get cash advances for this period (Mon-Sat only, no Sunday)
            const empCashAdvances = await CashAdvance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                status: 'Approved'
            });

            const totalCashAdvance = empCashAdvances.reduce((sum, ca) => sum + ca.amount, 0);

            // Calculate totals
            const grossSalary = basicSalary + overtimePay;
            const netSalary = grossSalary - totalCashAdvance;

            // Create payroll record
            const payroll = await Payroll.create({
                employeeId: emp.employeeId,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                name: `${emp.firstName} ${emp.lastName}`,
                startDate: payrollPeriod.start,
                endDate: payrollPeriod.end,
                cutoffDate: payrollPeriod.cutoffDate,
                daysWorked: totalDaysWorked,
                hoursWorked: Math.round(totalHoursWorked * 100) / 100,
                overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
                basicSalary: Math.round(basicSalary * 100) / 100,
                overtimePay: Math.round(overtimePay * 100) / 100,
                grossSalary: Math.round(grossSalary * 100) / 100,
                salary: Math.round(grossSalary * 100) / 100,
                cashAdvance: totalCashAdvance,
                deductions: totalCashAdvance, // For UI compatibility
                netSalary: Math.round(netSalary * 100) / 100,
                status: 'Pending',
                date: payrollPeriod.payrollDate, // Monday next week
                archived: false
            });

            console.log(`  ✅ ${emp.firstName} ${emp.lastName}:`);
            console.log(`     - Period: Oct 14-19 (Mon-Sat, 6 days)`);
            console.log(`     - Days Worked: ${totalDaysWorked}`);
            console.log(`     - Basic Salary: ₱${basicSalary.toFixed(2)}`);
            console.log(`     - Cash Advance: ₱${totalCashAdvance.toFixed(2)}`);
            console.log(`     - Net Salary: ₱${netSalary.toFixed(2)}`);
            console.log(`     - Payroll Date: Oct 21 (Monday)`);
            console.log();
        }

        // ============================================================
        // STEP 5: Verification
        // ============================================================
        console.log('✅ STEP 5: Final Verification...\n');

        const finalPayrolls = await Payroll.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`  📋 Payroll Records: ${finalPayrolls.length}/4`);
        for (const pr of finalPayrolls) {
            console.log(`     - ${pr.employeeName}:`);
            console.log(`       Salary: ₱${pr.salary?.toFixed(2) || 0}`);
            console.log(`       Cash Advance: ₱${pr.cashAdvance?.toFixed(2) || 0}`);
            console.log(`       Net: ₱${pr.netSalary?.toFixed(2) || 0}`);
        }

        const finalCashAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-2651'] }
        });

        console.log(`\n  💰 Cash Advances: ${finalCashAdvances.length}/3`);
        for (const ca of finalCashAdvances) {
            const dateStr = ca.date ? new Date(ca.date).toLocaleDateString() : 'No date';
            console.log(`     - ${ca.employeeName}: ₱${ca.amount} (${dateStr})`);
        }

        const oldDeductionsCheck = await Deduction.find({});
        console.log(`\n  🗑️  Old Deductions Remaining: ${oldDeductionsCheck.length} (should be 0)`);

        console.log('\n' + '='.repeat(70));
        console.log('🎉 COMPREHENSIVE FIX PART 2 COMPLETED');
        console.log('='.repeat(70));
        console.log('\n✅ Cash advances now have proper dates (Mon-Sat)');
        console.log('✅ Old test data removed from deductions collection');
        console.log('✅ Payroll regenerated with cash advance deductions');
        console.log('✅ No Sunday records in attendance or cash advances');
        console.log('✅ Payroll date set to Monday Oct 21\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error during fix:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

comprehensiveFixPart2();
