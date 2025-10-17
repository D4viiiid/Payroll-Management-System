/**
 * 🔧 COMPREHENSIVE FIX SCRIPT
 * Fix all data structure mismatches and calculation issues
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

// Flexible schemas
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

function createManilaDate(year, month, day, hour = 0, minute = 0) {
    const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
    return date;
}

async function comprehensiveFix() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // ============================================================
        // STEP 1: Fix Payroll Data Structure
        // ============================================================
        console.log('📋 STEP 1: Fixing Payroll Data Structure...\n');

        const payrolls = await Payroll.find({});
        let updatedCount = 0;

        for (const payroll of payrolls) {
            const updates = {
                employeeName: payroll.name || payroll.employeeName,
                salary: payroll.basicSalary || payroll.grossSalary || payroll.salary || 0,
                deductions: payroll.cashAdvance || payroll.deductions || 0
            };

            // Ensure netSalary is correct
            if (!payroll.netSalary || payroll.netSalary === 0) {
                updates.netSalary = updates.salary - updates.deductions;
            }

            await Payroll.updateOne(
                { _id: payroll._id },
                { $set: updates }
            );

            console.log(`  ✅ Updated ${updates.employeeName}: Salary ₱${updates.salary}, Deductions ₱${updates.deductions}, Net ₱${updates.netSalary || payroll.netSalary}`);
            updatedCount++;
        }

        console.log(`\n  📊 Updated ${updatedCount} payroll records\n`);

        // ============================================================
        // STEP 2: Fix Cash Advance Data
        // ============================================================
        console.log('💰 STEP 2: Fixing Cash Advance Data...\n');

        const cashAdvances = await CashAdvance.find({});
        let caUpdated = 0;

        for (const ca of cashAdvances) {
            if (!ca.employeeName && ca.employeeId) {
                const employee = await Employee.findOne({ employeeId: ca.employeeId });
                if (employee) {
                    await CashAdvance.updateOne(
                        { _id: ca._id },
                        { 
                            $set: { 
                                employeeName: `${employee.firstName} ${employee.lastName}`,
                                employee: employee._id
                            } 
                        }
                    );
                    console.log(`  ✅ Updated cash advance for ${employee.firstName} ${employee.lastName}`);
                    caUpdated++;
                }
            }
        }

        console.log(`\n  📊 Updated ${caUpdated} cash advance records\n`);

        // ============================================================
        // STEP 3: Recalculate Attendance Salaries Based on Rules
        // ============================================================
        console.log('📅 STEP 3: Recalculating Attendance Salaries...\n');

        const attendances = await Attendance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        let attUpdated = 0;

        for (const att of attendances) {
            const employee = await Employee.findOne({ employeeId: att.employeeId });
            if (!employee || !employee.dailyRate) continue;

            const timeIn = new Date(att.timeIn);
            const timeOut = new Date(att.timeOut);

            // Extract time only (hours and minutes)
            const timeInHours = timeIn.getUTCHours() + 8; // Convert to Manila time
            const timeInMinutes = timeIn.getUTCMinutes();
            const timeInTimeOnly = timeInHours * 60 + timeInMinutes;

            const timeOutHours = timeOut.getUTCHours() + 8;
            const timeOutMinutes = timeOut.getUTCMinutes();
            
            // Calculate work hours (excluding 12:00-12:59 lunch)
            let totalMinutes = (timeOutHours * 60 + timeOutMinutes) - (timeInHours * 60 + timeInMinutes);
            
            // Check if lunch break (12:00-12:59) falls within work hours
            const lunchStart = 12 * 60; // 12:00 in minutes
            const lunchEnd = 13 * 60; // 13:00 in minutes
            const workStart = timeInHours * 60 + timeInMinutes;
            const workEnd = timeOutHours * 60 + timeOutMinutes;

            // Deduct lunch if it falls within work period
            if (workStart < lunchEnd && workEnd > lunchStart) {
                const overlapStart = Math.max(workStart, lunchStart);
                const overlapEnd = Math.min(workEnd, lunchEnd);
                const lunchMinutes = Math.max(0, overlapEnd - overlapStart);
                totalMinutes -= lunchMinutes;
            }

            const actualHoursWorked = Math.max(0, totalMinutes / 60);

            // Apply salary rules
            let daySalary = 0;
            let dayType = '';
            let timeInStatus = '';
            let validationReason = '';

            // Time-in cutoffs
            const cutoff930 = 9 * 60 + 30; // 9:30 AM

            if (timeInTimeOnly <= cutoff930) {
                // On time (8:00 - 9:30)
                if (actualHoursWorked >= 8) {
                    daySalary = employee.dailyRate; // ₱550
                    dayType = 'Full Day';
                    timeInStatus = 'On Time';
                    validationReason = 'Arrived on time and worked 8+ hours';
                } else if (actualHoursWorked >= 4) {
                    daySalary = employee.dailyRate * 0.5; // ₱275
                    dayType = 'Half Day';
                    timeInStatus = 'On Time';
                    validationReason = 'Arrived on time but worked less than 8 hours';
                } else {
                    daySalary = 0;
                    dayType = 'Incomplete';
                    timeInStatus = 'Incomplete';
                    validationReason = 'Less than 4 hours worked';
                }
            } else {
                // Late (after 9:30)
                if (actualHoursWorked >= 4) {
                    daySalary = employee.dailyRate * 0.5; // ₱275
                    dayType = 'Half Day';
                    timeInStatus = 'Late';
                    validationReason = 'Arrived after 9:30 AM but worked minimum 4 hours';
                } else {
                    daySalary = 0;
                    dayType = 'Incomplete';
                    timeInStatus = 'Late';
                    validationReason = 'Arrived late and worked less than 4 hours';
                }
            }

            // Calculate overtime (hours beyond 8)
            const overtimeHours = Math.max(0, actualHoursWorked - 8);
            const overtimePay = overtimeHours * employee.overtimeRate;
            const totalPay = daySalary + overtimePay;

            // Update attendance record
            await Attendance.updateOne(
                { _id: att._id },
                {
                    $set: {
                        actualHoursWorked: Math.round(actualHoursWorked * 100) / 100,
                        overtimeHours: Math.round(overtimeHours * 100) / 100,
                        daySalary: Math.round(daySalary * 100) / 100,
                        overtimePay: Math.round(overtimePay * 100) / 100,
                        totalPay: Math.round(totalPay * 100) / 100,
                        dayType,
                        timeInStatus,
                        validationReason,
                        isValidDay: dayType === 'Full Day' || dayType === 'Half Day',
                        status: dayType === 'Full Day' ? 'present' : dayType === 'Half Day' ? 'half-day' : 'incomplete'
                    }
                }
            );

            console.log(`  ✅ ${employee.firstName} ${employee.lastName} - ${att.date.toLocaleDateString()}: ${dayType} = ₱${daySalary} (${actualHoursWorked.toFixed(1)}h)`);
            attUpdated++;
        }

        console.log(`\n  📊 Updated ${attUpdated} attendance records\n`);

        // ============================================================
        // STEP 4: Regenerate Payroll with Correct Calculations
        // ============================================================
        console.log('💼 STEP 4: Regenerating Payroll Records...\n');

        const payrollPeriod = {
            start: createManilaDate(2025, 10, 14),
            end: createManilaDate(2025, 10, 19),
            cutoffDate: createManilaDate(2025, 10, 20)
        };

        // Delete old payroll records
        await Payroll.deleteMany({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        const employees = await Employee.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        for (const emp of employees) {
            // Get updated attendance records
            const attendanceRecords = await Attendance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                archived: false
            });

            // Calculate totals from attendance
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

            // Get cash advances for this period
            const cashAdvances = await CashAdvance.find({
                employeeId: emp.employeeId,
                date: { $gte: payrollPeriod.start, $lte: payrollPeriod.end },
                status: 'Approved'
            });

            const totalCashAdvance = cashAdvances.reduce((sum, ca) => sum + ca.amount, 0);

            // Calculate gross and net
            const grossSalary = basicSalary + overtimePay;
            const netSalary = grossSalary - totalCashAdvance;

            // Create new payroll with CORRECT field names for UI
            const payroll = await Payroll.create({
                employeeId: emp.employeeId,
                employeeName: `${emp.firstName} ${emp.lastName}`, // UI expects employeeName
                name: `${emp.firstName} ${emp.lastName}`,
                startDate: payrollPeriod.start,
                endDate: payrollPeriod.end,
                cutoffDate: payrollPeriod.cutoffDate,
                daysWorked: totalDaysWorked,
                hoursWorked: totalHoursWorked,
                overtimeHours: totalOvertimeHours,
                basicSalary: Math.round(basicSalary * 100) / 100,
                overtimePay: Math.round(overtimePay * 100) / 100,
                grossSalary: Math.round(grossSalary * 100) / 100,
                salary: Math.round(grossSalary * 100) / 100, // UI expects 'salary'
                cashAdvance: totalCashAdvance,
                deductions: totalCashAdvance, // UI expects 'deductions'
                netSalary: Math.round(netSalary * 100) / 100,
                status: 'Pending',
                date: new Date(),
                archived: false
            });

            console.log(`  ✅ ${emp.firstName} ${emp.lastName}:`);
            console.log(`     - Days: ${totalDaysWorked}, Hours: ${totalHoursWorked.toFixed(1)}h`);
            console.log(`     - Basic: ₱${basicSalary.toFixed(2)}, OT: ₱${overtimePay.toFixed(2)}`);
            console.log(`     - Gross: ₱${grossSalary.toFixed(2)}, Deductions: ₱${totalCashAdvance.toFixed(2)}`);
            console.log(`     - Net: ₱${netSalary.toFixed(2)}`);
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
            console.log(`     - ${pr.employeeName}: ₱${pr.salary?.toFixed(2) || 'N/A'} - ₱${pr.deductions?.toFixed(2) || 'N/A'} = ₱${pr.netSalary?.toFixed(2) || 'N/A'}`);
        }

        const finalCashAdvances = await CashAdvance.find({
            employeeId: { $in: ['EMP-1491', 'EMP-7520', 'EMP-1480', 'EMP-2651'] }
        });

        console.log(`\n  💰 Cash Advances: ${finalCashAdvances.length}/3`);
        for (const ca of finalCashAdvances) {
            console.log(`     - ${ca.employeeName || 'Unknown'}: ₱${ca.amount} (${ca.status})`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('🎉 COMPREHENSIVE FIX COMPLETED');
        console.log('='.repeat(70));
        console.log('\n✅ All data structures aligned with UI expectations');
        console.log('✅ Salary calculations updated with proper rules');
        console.log('✅ Attendance records recalculated with lunch break exclusion');
        console.log('✅ Payroll records regenerated with correct field names\n');

        await mongoose.disconnect();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error during fix:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

comprehensiveFix();
