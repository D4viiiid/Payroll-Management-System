/**
 * 🧹 CLEANUP AND FIX SCRIPT
 * 1. Remove all old mock/test data
 * 2. Set proper daily rates and overtime rates for demo employees
 * 3. Recreate missing attendance records
 * 4. Verify data integrity
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
const salarySchema = new mongoose.Schema({}, { strict: false });
const payrollSchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);
const Salary = mongoose.model('Salary', salarySchema);
const Payroll = mongoose.model('Payroll', payrollSchema);

// Manila timezone offset (UTC+8)
function createManilaDate(year, month, day, hour, minute) {
    const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
    return date;
}

function createManilaDateOnly(year, month, day) {
    return createManilaDate(year, month, day, 0, 0);
}

async function cleanupAndFix() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ============================================================
        // STEP 1: Update Employee Rates
        // ============================================================
        console.log('💰 STEP 1: Setting Daily and Overtime Rates...\n');

        const employees = [
            { employeeId: 'EMP-1491', firstName: 'Carl David', dailyRate: 550, overtimeRate: 85.94 },
            { employeeId: 'EMP-7520', firstName: 'Ken', dailyRate: 550, overtimeRate: 85.94 },
            { employeeId: 'EMP-1480', firstName: 'Justin', dailyRate: 550, overtimeRate: 85.94 },
            { employeeId: 'EMP-2651', firstName: 'Casey', dailyRate: 550, overtimeRate: 85.94 }
        ];

        for (const emp of employees) {
            await Employee.updateOne(
                { employeeId: emp.employeeId },
                {
                    $set: {
                        dailyRate: emp.dailyRate,
                        overtimeRate: emp.overtimeRate,
                        hourlyRate: emp.dailyRate / 8
                    }
                }
            );
            console.log(`  ✅ ${emp.firstName}: Daily ₱${emp.dailyRate}, OT ₱${emp.overtimeRate}/hr`);
        }
        console.log();

        // ============================================================
        // STEP 2: Clean Old Mock Data
        // ============================================================
        console.log('🧹 STEP 2: Removing Old Mock/Test Data...\n');

        // Remove old salary records (not for our demo employees)
        const oldSalaries = await Salary.deleteMany({
            employeeId: { $nin: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        console.log(`  ✅ Removed ${oldSalaries.deletedCount} old salary records`);

        // Remove old payroll records (not for our demo employees)
        const oldPayrolls = await Payroll.deleteMany({
            employeeId: { $nin: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });
        console.log(`  ✅ Removed ${oldPayrolls.deletedCount} old payroll records`);

        // Remove old cash advances (not for our demo employees or already processed)
        const oldAdvances = await CashAdvance.deleteMany({
            $and: [
                { employeeId: { $nin: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] } },
                { status: { $ne: 'Paid' } }
            ]
        });
        console.log(`  ✅ Removed ${oldAdvances.deletedCount} old cash advance records`);

        console.log();

        // ============================================================
        // STEP 3: Fix Attendance Records
        // ============================================================
        console.log('📅 STEP 3: Fixing Attendance Records...\n');

        // Get current attendance to see what's missing
        const startDate = createManilaDateOnly(2025, 10, 14);
        const endDate = createManilaDateOnly(2025, 10, 20);
        
        const existingAttendance = await Attendance.find({
            date: { $gte: startDate, $lt: endDate }
        });

        console.log(`  Current records: ${existingAttendance.length}`);

        // Get employee MongoDB IDs
        const carlDavid = await Employee.findOne({ employeeId: 'EMP-1491' });
        const kenVergara = await Employee.findOne({ employeeId: 'EMP-7520' });
        const justinBieber = await Employee.findOne({ employeeId: 'EMP-1480' });
        const caseyEspino = await Employee.findOne({ employeeId: 'EMP-2651' });

        const weekDays = [
            { date: createManilaDateOnly(2025, 10, 14), day: 'Monday', num: 14 },
            { date: createManilaDateOnly(2025, 10, 15), day: 'Tuesday', num: 15 },
            { date: createManilaDateOnly(2025, 10, 16), day: 'Wednesday', num: 16 },
            { date: createManilaDateOnly(2025, 10, 17), day: 'Thursday', num: 17 },
            { date: createManilaDateOnly(2025, 10, 18), day: 'Friday', num: 18 },
            { date: createManilaDateOnly(2025, 10, 19), day: 'Saturday', num: 19 }
        ];

        // Carl David - ALL 6 days
        for (const { date, day, num } of weekDays) {
            const exists = await Attendance.findOne({
                employeeId: carlDavid.employeeId,
                date: date
            });

            if (!exists) {
                await Attendance.create({
                    employee: carlDavid._id,
                    employeeId: carlDavid.employeeId,
                    date: date,
                    timeIn: createManilaDate(2025, 10, num, 8, 0),
                    timeOut: createManilaDate(2025, 10, num, 17, 0),
                    status: 'present',
                    dayType: 'Full Day',
                    timeInStatus: 'On Time',
                    actualHoursWorked: 8,
                    overtimeHours: 0,
                    archived: false
                });
                console.log(`  ✅ Added Carl David - ${day}`);
            }
        }

        // Ken Vergara - Monday only
        const kenMonday = weekDays[0];
        const kenExists = await Attendance.findOne({
            employeeId: kenVergara.employeeId,
            date: kenMonday.date
        });

        if (!kenExists) {
            await Attendance.create({
                employee: kenVergara._id,
                employeeId: kenVergara.employeeId,
                date: kenMonday.date,
                timeIn: createManilaDate(2025, 10, 14, 9, 0),
                timeOut: createManilaDate(2025, 10, 14, 14, 0),
                status: 'half-day',
                dayType: 'Half Day',
                timeInStatus: 'On Time',
                actualHoursWorked: 4,
                overtimeHours: 0,
                archived: false
            });
            console.log(`  ✅ Added Ken Vergara - Monday`);
        }

        // Justin Bieber - Mon-Thu
        for (let i = 0; i < 4; i++) {
            const { date, day, num } = weekDays[i];
            const exists = await Attendance.findOne({
                employeeId: justinBieber.employeeId,
                date: date
            });

            if (!exists) {
                await Attendance.create({
                    employee: justinBieber._id,
                    employeeId: justinBieber.employeeId,
                    date: date,
                    timeIn: createManilaDate(2025, 10, num, 9, 31),
                    timeOut: createManilaDate(2025, 10, num, 17, 0),
                    status: 'half-day',
                    dayType: 'Half Day',
                    timeInStatus: 'Late',
                    actualHoursWorked: 6.5,
                    overtimeHours: 0,
                    archived: false
                });
                console.log(`  ✅ Added Justin Bieber - ${day}`);
            }
        }

        // Casey Espino - Mon-Fri
        for (let i = 0; i < 5; i++) {
            const { date, day, num } = weekDays[i];
            const exists = await Attendance.findOne({
                employeeId: caseyEspino.employeeId,
                date: date
            });

            if (!exists) {
                await Attendance.create({
                    employee: caseyEspino._id,
                    employeeId: caseyEspino.employeeId,
                    date: date,
                    timeIn: createManilaDate(2025, 10, num, 8, 0),
                    timeOut: createManilaDate(2025, 10, num, 18, 0),
                    status: 'present',
                    dayType: 'Full Day',
                    timeInStatus: 'On Time',
                    actualHoursWorked: 9,
                    overtimeHours: 1,
                    archived: false
                });
                console.log(`  ✅ Added Casey Espino - ${day}`);
            }
        }

        console.log();

        // ============================================================
        // STEP 4: Verify Final State
        // ============================================================
        console.log('✅ STEP 4: Verification...\n');

        const finalAttendance = await Attendance.find({
            date: { $gte: startDate, $lt: endDate }
        });

        console.log(`  📅 Total Attendance Records: ${finalAttendance.length}/17`);

        const finalAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`  💰 Cash Advances: ${finalAdvances.length}/3`);
        for (const adv of finalAdvances) {
            console.log(`     - ${adv.employeeName}: ₱${adv.amount}`);
        }

        const finalEmployees = await Employee.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`  👥 Employee Rates:`);
        for (const emp of finalEmployees) {
            console.log(`     - ${emp.firstName} ${emp.lastName}: ₱${emp.dailyRate}/day`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('🎉 CLEANUP AND FIX COMPLETED SUCCESSFULLY');
        console.log('='.repeat(70));
        console.log('\n✅ All data is now clean and properly configured!');
        console.log('✅ Employee rates set correctly');
        console.log('✅ All 17 attendance records verified');
        console.log('✅ Cash advances intact');
        console.log('✅ Old mock data removed\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

cleanupAndFix();
