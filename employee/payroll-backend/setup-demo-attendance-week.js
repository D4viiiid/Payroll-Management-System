/**
 * 🎬 DEMO DATA SETUP SCRIPT
 * Creates a full week of attendance and payroll demonstration data
 * 
 * Employees:
 * - Carl David Pamplona (EMP-1491): Full Pay Mon-Sat
 * - Ken Vergara (EMP-7520): Half Pay 4hrs on Mon, absent Tue-Sat
 * - Justin Bieber (EMP-1480): Half Pay Late on Mon-Thu, absent Fri-Sat
 * - Casey Espino (EMP-2651): Overtime Pay Mon-Fri, absent Sat
 * 
 * Scenarios:
 * - Full Pay: 8:00 AM - 5:00 PM (8 hours work)
 * - Half Pay 4hrs: 9:00 AM - 2:00 PM (4 hours work, with 1hr lunch = 3.5hrs actual)
 * - Half Pay Late: 9:31 AM - 5:00 PM (late but worked >6.5 hours)
 * - Overtime: 8:00 AM - 6:00 PM (9 hours work + 1 hour OT)
 * - No Pay: 9:31 AM - 11:30 AM (< 4 hours worked)
 * 
 * Week: Monday Oct 14 to Saturday Oct 19, 2025
 * Sunday Oct 20 is payroll cutoff
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

// MongoDB Models
const employeeSchema = new mongoose.Schema({}, { strict: false });
const attendanceSchema = new mongoose.Schema({}, { strict: false });
const cashAdvanceSchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const CashAdvance = mongoose.model('CashAdvance', cashAdvanceSchema);

// Manila timezone offset (UTC+8)
function createManilaDate(year, month, day, hour, minute) {
    // Create date in Manila time (UTC+8)
    const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
    return date;
}

// Create local date for date field (midnight Manila time)
function createManilaDateOnly(year, month, day) {
    return createManilaDate(year, month, day, 0, 0);
}

async function setupDemoData() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get employees
        console.log('📋 Fetching employees...');
        const carlDavid = await Employee.findOne({ employeeId: 'EMP-1491' });
        const kenVergara = await Employee.findOne({ employeeId: 'EMP-7520' });
        const justinBieber = await Employee.findOne({ employeeId: 'EMP-1480' });
        const caseyEspino = await Employee.findOne({ employeeId: 'EMP-2651' });

        if (!carlDavid || !kenVergara || !justinBieber || !caseyEspino) {
            console.error('❌ Error: One or more employees not found');
            console.log('Found:', { carlDavid: !!carlDavid, kenVergara: !!kenVergara, justinBieber: !!justinBieber, caseyEspino: !!caseyEspino });
            process.exit(1);
        }

        console.log('✅ All employees found\n');

        // Clear existing attendance for the week
        console.log('🗑️  Clearing existing attendance records for Oct 14-19...');
        const startDate = createManilaDateOnly(2025, 10, 14);
        const endDate = createManilaDateOnly(2025, 10, 20);
        
        await Attendance.deleteMany({
            date: { $gte: startDate, $lt: endDate }
        });
        console.log('✅ Cleared existing attendance\n');

        // Clear existing cash advances for demo employees
        console.log('🗑️  Clearing existing cash advances...');
        await CashAdvance.deleteMany({
            employee: {
                $in: [carlDavid._id, kenVergara._id, justinBieber._id, caseyEspino._id]
            },
            status: { $nin: ['Paid', 'Rejected'] }
        });
        console.log('✅ Cleared existing cash advances\n');

        console.log('📅 Creating attendance records for the week...\n');

        // Week schedule (Oct 14-19, 2025)
        const weekDays = [
            { date: createManilaDateOnly(2025, 10, 14), day: 'Monday', num: 14 },
            { date: createManilaDateOnly(2025, 10, 15), day: 'Tuesday', num: 15 },
            { date: createManilaDateOnly(2025, 10, 16), day: 'Wednesday', num: 16 },
            { date: createManilaDateOnly(2025, 10, 17), day: 'Thursday', num: 17 },
            { date: createManilaDateOnly(2025, 10, 18), day: 'Friday', num: 18 },
            { date: createManilaDateOnly(2025, 10, 19), day: 'Saturday', num: 19 }
        ];

        // 1. CARL DAVID PAMPLONA - Full Pay (8:00 AM - 5:00 PM) Mon-Sat
        console.log('👤 Carl David Pamplona (EMP-1491): Full Pay Schedule');
        for (const { date, day, num } of weekDays) {
            const timeIn = createManilaDate(2025, 10, num, 8, 0);  // 8:00 AM
            const timeOut = createManilaDate(2025, 10, num, 17, 0); // 5:00 PM
            
            await Attendance.create({
                employee: carlDavid._id,
                employeeId: carlDavid.employeeId,
                date: date,
                timeIn: timeIn,
                timeOut: timeOut,
                status: 'present',
                dayType: 'Full Day',
                timeInStatus: 'On Time',
                actualHoursWorked: 8,
                overtimeHours: 0,
                archived: false,
                createdAt: timeIn,
                updatedAt: timeOut
            });
            console.log(`  ✅ ${day}: 8:00 AM - 5:00 PM (Full Pay)`);
        }
        console.log();

        // 2. KEN VERGARA - Half Pay 4hrs on Monday, Absent Tue-Sat
        console.log('👤 Ken Vergara (EMP-7520): Half Pay 4hrs Monday, Absent rest');
        const kenMonday = weekDays[0];
        await Attendance.create({
            employee: kenVergara._id,
            employeeId: kenVergara.employeeId,
            date: kenMonday.date,
            timeIn: createManilaDate(2025, 10, 14, 9, 0),  // 9:00 AM
            timeOut: createManilaDate(2025, 10, 14, 14, 0), // 2:00 PM
            status: 'half-day',
            dayType: 'Half Day',
            timeInStatus: 'On Time',
            actualHoursWorked: 4,
            overtimeHours: 0,
            archived: false,
            createdAt: createManilaDate(2025, 10, 14, 9, 0),
            updatedAt: createManilaDate(2025, 10, 14, 14, 0)
        });
        console.log('  ✅ Monday: 9:00 AM - 2:00 PM (Half Pay 4hrs)');
        console.log('  ⚠️ Tuesday-Saturday: ABSENT\n');

        // 3. JUSTIN BIEBER - Half Pay Late (9:31 AM - 5:00 PM) Mon-Thu, Absent Fri-Sat
        console.log('👤 Justin Bieber (EMP-1480): Half Pay Late Mon-Thu, Absent Fri-Sat');
        for (let i = 0; i < 4; i++) { // Monday to Thursday
            const { date, day, num } = weekDays[i];
            const timeIn = createManilaDate(2025, 10, num, 9, 31);  // 9:31 AM (Late)
            const timeOut = createManilaDate(2025, 10, num, 17, 0);  // 5:00 PM
            
            await Attendance.create({
                employee: justinBieber._id,
                employeeId: justinBieber.employeeId,
                date: date,
                timeIn: timeIn,
                timeOut: timeOut,
                status: 'half-day',
                dayType: 'Half Day',
                timeInStatus: 'Late',
                actualHoursWorked: 6.5,
                overtimeHours: 0,
                archived: false,
                createdAt: timeIn,
                updatedAt: timeOut
            });
            console.log(`  ✅ ${day}: 9:31 AM - 5:00 PM (Half Pay - Late)`);
        }
        console.log('  ⚠️ Friday-Saturday: ABSENT\n');

        // 4. CASEY ESPINO - Overtime Pay (8:00 AM - 6:00 PM) Mon-Fri, Absent Sat
        console.log('👤 Casey Espino (EMP-2651): Overtime Pay Mon-Fri, Absent Sat');
        for (let i = 0; i < 5; i++) { // Monday to Friday
            const { date, day, num } = weekDays[i];
            const timeIn = createManilaDate(2025, 10, num, 8, 0);   // 8:00 AM
            const timeOut = createManilaDate(2025, 10, num, 18, 0);  // 6:00 PM (1 hour OT)
            
            await Attendance.create({
                employee: caseyEspino._id,
                employeeId: caseyEspino.employeeId,
                date: date,
                timeIn: timeIn,
                timeOut: timeOut,
                status: 'present',
                dayType: 'Full Day',
                timeInStatus: 'On Time',
                actualHoursWorked: 9,
                overtimeHours: 1,
                archived: false,
                createdAt: timeIn,
                updatedAt: timeOut
            });
            console.log(`  ✅ ${day}: 8:00 AM - 6:00 PM (Full Pay + 1hr OT)`);
        }
        console.log('  ⚠️ Saturday: ABSENT\n');

        // Create Cash Advances
        console.log('💰 Creating Cash Advances...\n');

        // Carl David - ₱550
        await CashAdvance.create({
            advanceId: `ADV-${Date.now()}-1`,
            employee: carlDavid._id,
            employeeId: carlDavid.employeeId,
            employeeName: `${carlDavid.firstName} ${carlDavid.lastName}`,
            amount: 550,
            reason: 'Personal expense',
            requestDate: createManilaDate(2025, 10, 13, 10, 0),
            status: 'Approved',
            approvedBy: { firstName: 'Admin', lastName: 'User' },
            approvalDate: createManilaDate(2025, 10, 13, 11, 0),
            balance: 550,
            paymentSchedule: [{
                date: createManilaDate(2025, 10, 20, 0, 0),
                amount: 550,
                status: 'Pending'
            }]
        });
        console.log('  ✅ Carl David Pamplona: ₱550 cash advance');

        // Ken Vergara - ₱1,100
        await CashAdvance.create({
            advanceId: `ADV-${Date.now()}-2`,
            employee: kenVergara._id,
            employeeId: kenVergara.employeeId,
            employeeName: `${kenVergara.firstName} ${kenVergara.lastName}`,
            amount: 1100,
            reason: 'Emergency',
            requestDate: createManilaDate(2025, 10, 12, 14, 0),
            status: 'Approved',
            approvedBy: { firstName: 'Admin', lastName: 'User' },
            approvalDate: createManilaDate(2025, 10, 12, 15, 0),
            balance: 1100,
            paymentSchedule: [{
                date: createManilaDate(2025, 10, 20, 0, 0),
                amount: 1100,
                status: 'Pending'
            }]
        });
        console.log('  ✅ Ken Vergara: ₱1,100 cash advance');

        // Justin Bieber - No cash advance
        console.log('  ⚠️ Justin Bieber: No cash advance');

        // Casey Espino - ₱550
        await CashAdvance.create({
            advanceId: `ADV-${Date.now()}-3`,
            employee: caseyEspino._id,
            employeeId: caseyEspino.employeeId,
            employeeName: `${caseyEspino.firstName} ${caseyEspino.lastName}`,
            amount: 550,
            reason: 'Medical',
            requestDate: createManilaDate(2025, 10, 13, 9, 0),
            status: 'Approved',
            approvedBy: { firstName: 'Admin', lastName: 'User' },
            approvalDate: createManilaDate(2025, 10, 13, 10, 0),
            balance: 550,
            paymentSchedule: [{
                date: createManilaDate(2025, 10, 20, 0, 0),
                amount: 550,
                status: 'Pending'
            }]
        });
        console.log('  ✅ Casey Espino: ₱550 cash advance');

        console.log('\n' + '='.repeat(70));
        console.log('🎉 DEMO DATA SETUP COMPLETED SUCCESSFULLY');
        console.log('='.repeat(70));
        console.log('\n📊 Summary:');
        console.log('  Week: Monday Oct 14 - Saturday Oct 19, 2025');
        console.log('  Cutoff: Sunday Oct 20, 2025');
        console.log('\n👥 Employees:');
        console.log('  1. Carl David Pamplona - 6 days Full Pay + ₱550 advance');
        console.log('  2. Ken Vergara - 1 day Half Pay (4hrs) + ₱1,100 advance');
        console.log('  3. Justin Bieber - 4 days Half Pay (Late) + No advance');
        console.log('  4. Casey Espino - 5 days Full Pay + OT + ₱550 advance');
        console.log('\n📋 Next Steps:');
        console.log('  1. Go to Payroll Records page');
        console.log('  2. Click "Add New Payroll" and select each employee');
        console.log('  3. View Payslip for each employee to see calculations');
        console.log('  4. System will automatically deduct cash advances');
        console.log('\n✨ All data is ready for demonstration!\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error setting up demo data:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

setupDemoData();
