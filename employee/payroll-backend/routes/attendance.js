﻿import express from 'express';
const router = express.Router();
import Attendance from '../models/AttendanceModels.js';
import Employee from '../models/EmployeeModels.js';
import SalaryRate from '../models/SalaryRate.model.js';
import { localEmployeeStorage, localAttendanceStorage } from '../localStorage.js';
import { mongoConnected } from '../server.js';
import { validateTimeInRealTime, validateAndCalculateAttendance } from '../utils/attendanceCalculator.js';
import moment from 'moment-timezone';
import { validateNoSunday } from '../middleware/validateDates.js';
import { getPhilippinesNow, getStartOfDay, getEndOfDay, getDateOnly, formatTime } from '../utils/dateHelpers.js';

// Version: 1.0.3 - Fixed attendance stats to count only active employees (Oct 23, 2025)
import { validateAttendanceForFraud, validateNoMultipleOpenShifts } from '../middleware/fraudPrevention.js';
import { getPaginationParams, createPaginatedResponse, optimizeMongooseQuery } from '../utils/paginationHelper.js';
import { setCacheHeaders } from '../middleware/cacheMiddleware.js';

// Helper function to check MongoDB connection
const isMongoConnected = () => {
  return mongoConnected;
};

// Helper function to calculate work hours (excluding lunch break)
// Lunch break: 12:00 PM - 12:59 PM (1 hour)
const calculateWorkHours = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  
  const startTime = new Date(timeIn);
  const endTime = new Date(timeOut);
  
  // Calculate total time in milliseconds
  let totalMs = endTime - startTime;
  
  // Check if lunch break (12:00 PM - 12:59 PM) is within work hours
  const lunchStart = new Date(startTime);
  lunchStart.setHours(12, 0, 0, 0);
  
  const lunchEnd = new Date(startTime);
  lunchEnd.setHours(13, 0, 0, 0); // 1:00 PM
  
  // If employee worked through lunch time, subtract 1 hour
  if (startTime < lunchEnd && endTime > lunchStart) {
    // Calculate overlap with lunch break
    const overlapStart = startTime < lunchStart ? lunchStart : startTime;
    const overlapEnd = endTime > lunchEnd ? lunchEnd : endTime;
    const lunchOverlapMs = overlapEnd - overlapStart;
    
    if (lunchOverlapMs > 0) {
      totalMs -= lunchOverlapMs;
    }
  }
  
  // Convert milliseconds to hours
  const hours = totalMs / (1000 * 60 * 60);
  return Math.max(0, hours); // Ensure non-negative
};

// Helper function to normalize fingerprint template format
const normalizeFingerprintTemplate = (template) => {
  if (!template) return null;
  
  // If it's already a string, return as is
  if (typeof template === 'string') {
    return template;
  }
  
  // If it's an object (System.Byte[] from Python), try to convert
  if (typeof template === 'object') {
    try {
      // Try to convert to hex string
      if (Array.isArray(template)) {
        return template.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      // If it has a hex method
      if (typeof template.hex === 'function') {
        return template.hex();
      }
      // If it's a Buffer-like object
      if (template.length) {
        return Array.from(template).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.log('⚠️ Could not normalize object template:', e.message);
    }
  }
  
  return null;
};

// Improved fingerprint matching function
const findEmployeeByFingerprint = async (inputTemplate, useMongoDB) => {
  try {
    const normalizedInput = normalizeFingerprintTemplate(inputTemplate);
    if (!normalizedInput) {
      console.log('❌ Could not normalize input template');
      return null;
    }
    
    console.log('🔍 Normalized input template length:', normalizedInput.length);
    console.log('🔍 Normalized input first 50 chars:', normalizedInput.substring(0, 50));
    
    if (useMongoDB) {
      console.log('🗄️ Using MongoDB for employee lookup');
      
      // Get all employees with fingerprints
      const employees = await Employee.find({ 
        fingerprintEnrolled: true,
        fingerprintTemplate: { $exists: true, $ne: null }
      });
      
      console.log(`📊 Found ${employees.length} employees with fingerprints in database`);
      
      // Check each employee's fingerprint template
      for (const employee of employees) {
        const storedTemplate = normalizeFingerprintTemplate(employee.fingerprintTemplate);
        
        if (storedTemplate) {
          console.log(`🔍 Checking employee ${employee.employeeId}:`);
          console.log(`   Stored template length: ${storedTemplate.length}`);
          console.log(`   Stored template first 50 chars: ${storedTemplate.substring(0, 50)}`);
          
          // For now, use exact string matching (can be improved with fuzzy matching later)
          if (storedTemplate === normalizedInput) {
            console.log(`✅ Exact match found for employee ${employee.employeeId}`);
            return employee;
          }
          
          // Check if templates are similar (for debugging)
          if (storedTemplate.length === normalizedInput.length) {
            let differences = 0;
            for (let i = 0; i < Math.min(storedTemplate.length, normalizedInput.length); i++) {
              if (storedTemplate[i] !== normalizedInput[i]) {
                differences++;
              }
            }
            console.log(`   Similarity: ${((storedTemplate.length - differences) / storedTemplate.length * 100).toFixed(2)}%`);
          }
        } else {
          console.log(`⚠️ Employee ${employee.employeeId} has invalid template format`);
        }
      }
      
      console.log('❌ No matching fingerprint found in database');
      return null;
      
    } else {
      console.log('💾 Using local storage for employee lookup');
      return localEmployeeStorage.findByFingerprint(normalizedInput);
    }
    
  } catch (error) {
    console.error('❌ Error in fingerprint matching:', error);
    return null;
  }
};

// Create attendance record
router.post('/attendance', validateNoSunday, async (req, res) => {
    try {
        const { employeeId, employeeName, time, status, deviceType, location, date } = req.body;
        
        // Validate date is not Sunday
        const attendanceDate = new Date(date || time || Date.now());
        if (attendanceDate.getDay() === 0) {
          return res.status(400).json({
            success: false,
            message: 'Sunday is not a valid work day. Work week is Monday-Saturday only.'
          });
        }

        const attendance = new Attendance({
            employeeId,
            employeeName,
            date: attendanceDate,
            time: new Date(time || Date.now()),
            status: status || 'Time In',
            deviceType: deviceType || 'biometric',
            location: location || 'Main Office'
        });

        await attendance.save();
        res.status(201).json({
            message: 'Attendance recorded successfully',
            attendance
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get attendance records (with pagination and filtering)
// ✅ FIX: Remove HTTP caching to prevent stale data
router.get('/attendance', async (req, res) => {
    // ✅ CRITICAL FIX: Set no-cache headers to prevent browser HTTP caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
        // ✅ PERFORMANCE FIX: Start timing
        const startTime = Date.now();
        
        // Parse pagination parameters
        const paginationParams = getPaginationParams(req.query);
        const { page, limit, skip, maxLimit } = paginationParams;
        const safeLimit = Math.min(limit, maxLimit);

        // ✅ FIX: Build query with filters for employeeId, startDate, endDate
        const { employeeId, startDate, endDate } = req.query;
        let filter = { archived: false }; // ✅ Always filter archived by default
        
        // Filter by employeeId if provided
        if (employeeId) {
            filter.employee = employeeId;
        }
        
        // Filter by date range if provided
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                filter.date.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.date.$lte = new Date(endDate);
            }
        }

        // ✅ CRITICAL PERFORMANCE FIX: Run count and query in parallel
        // Also optimize populate to only select needed fields
        const [totalCount, results] = await Promise.all([
            Attendance.countDocuments(filter).exec(),
            
            Attendance.find(filter)
                .sort({ date: -1, timeIn: -1 })
                .populate('employee', 'firstName lastName employeeId') // Only select needed employee fields
                .skip(skip)
                .limit(safeLimit)
                .select('employee employeeId date timeIn timeOut status dayType actualHoursWorked overtimeHours daySalary totalPay') // Select only needed attendance fields
                .lean() // Use lean() for 5-10x faster queries
                .exec()
        ]);

        // Build paginated response
        const response = createPaginatedResponse(results, totalCount, paginationParams);

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        console.log(`📊 Retrieved ${results.length} of ${totalCount} attendance records (page ${page}) in ${totalTime}ms`);
        
        res.json(response);
    } catch (error) {
        console.error('❌ Error fetching attendance records:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get attendance statistics - MUST be before /:employeeId to avoid route conflict
router.get('/attendance/stats', async (req, res) => {
    try {
        // ✅ PERFORMANCE FIX: Start timing
        const startTime = Date.now();
        
        // Use Philippines timezone for accurate date
        const today = getStartOfDay();
        const tomorrow = getEndOfDay();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log(`📊 Fetching attendance stats for ${getDateOnly()}`);
        
        let todayRecords = [];
        let totalEmployees = 0;

        if (isMongoConnected()) {
            // ✅ CRITICAL PERFORMANCE FIX: Run queries in parallel
            const [records, empCount] = await Promise.all([
                // Use lean() for 5-10x faster queries, select only needed fields
                Attendance.find({
                    date: { $gte: today, $lt: tomorrow },
                    archived: false
                })
                .select('employeeId timeIn timeOut status dayType actualHoursWorked')
                .lean()
                .exec(),
                
                // ✅ CRITICAL BUG FIX: Robust employee count query
                // Handle both explicit true and undefined/missing isActive field
                Employee.countDocuments({ 
                    $or: [
                        { isActive: true },
                        { isActive: { $exists: false } }, // Include docs without isActive field
                        { isActive: { $ne: false } } // Include any value except explicit false
                    ]
                }).exec()
            ]);
            
            todayRecords = records;
            totalEmployees = empCount;
            
            const queryTime = Date.now() - startTime;
            console.log(`📊 Found ${todayRecords.length} attendance records for today in ${queryTime}ms`);
            console.log(`📊 Total active employees: ${totalEmployees}`);
            
            // ✅ VALIDATION: Ensure totalEmployees is reasonable (not 0 or 1 when we expect more)
            if (totalEmployees === 0 || totalEmployees === 1) {
                console.warn(`⚠️ WARNING: totalEmployees = ${totalEmployees} seems incorrect!`);
                console.warn(`⚠️ Retrying with direct collection query...`);
                
                // Fallback: Direct collection query
                try {
                    const mongoose = (await import('mongoose')).default;
                    const directCount = await mongoose.connection.db
                        .collection('employees')
                        .countDocuments({ isActive: { $ne: false } });
                    
                    console.log(`📊 Direct collection query result: ${directCount}`);
                    
                    if (directCount > totalEmployees) {
                        console.log(`✅ Using direct count: ${directCount}`);
                        totalEmployees = directCount;
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback query failed:', fallbackError);
                }
            }
        } else {
            // Use local storage
            todayRecords = localAttendanceStorage.getTodayAttendance();
            totalEmployees = localEmployeeStorage.count();
        }

        // ✅ FIX ISSUE 2: Accurate statistics calculation
        // Count employees based on attendance status and ACTUAL WORK HOURS
        // Present: Has timeIn but NO timeOut yet (currently working)
        // Full Day: Worked >= 6.5 hours (excluding 1-hour lunch break)
        // Half Day: Worked >= 4 hours but < 6.5 hours
        // Invalid: Worked < 4 hours (no pay eligibility)
        // Absent: Did not show up today
        
        let present = 0;       // Currently working (has timeIn, no timeOut)
        let fullDay = 0;       // Completed full day (>= 6.5 hours)
        let halfDay = 0;       // Partial day (>= 4 hours, < 6.5 hours)
        let invalid = 0;       // Invalid attendance (< 4 hours worked)
        let totalAttended = 0; // Total who showed up today

        todayRecords.forEach(record => {
            if (record.timeIn) {
                totalAttended++;
                
                if (record.timeOut) {
                    // ✅ FIX: Use status from database
                    // Status rules:
                    // - 'present': Only for employees who clocked in but haven't clocked out yet
                    // - 'invalid': <4 hours worked (no pay)
                    // - 'half-day': 4 to <6.5 hours worked (variable pay)
                    // - 'full-day': 6.5-8 hours worked (100% daily rate)
                    // - 'overtime': >6.5 hours + timed out after 5PM (full pay + OT)
                    const status = record.status || 'present';
                    
                    if (status === 'invalid') {
                        invalid++;
                    } else if (status === 'half-day') {
                        halfDay++;
                    } else if (status === 'full-day') {
                        // Full day: 6.5-8 hours worked
                        fullDay++;
                    } else if (status === 'overtime') {
                        // Overtime also counts as full day worked
                        fullDay++;
                    } else if (status === 'present') {
                        // Legacy records: 'present' with timeOut means full day
                        // Fallback calculation for old data
                        const hoursWorked = calculateWorkHours(record.timeIn, record.timeOut);
                        if (hoursWorked >= 6.5) {
                            fullDay++;
                        } else if (hoursWorked >= 4) {
                            halfDay++;
                        } else {
                            invalid++;
                        }
                    }
                } else {
                    // Employee has time in but no time out = Currently Present
                    present++;
                }
            }
        });

        const absent = totalEmployees - totalAttended;

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        console.log(`📊 Stats: Present=${present}, FullDay=${fullDay}, HalfDay=${halfDay}, Invalid=${invalid}, Absent=${absent}, TotalEmployees=${totalEmployees}, TotalAttended=${totalAttended}`);
        console.log(`⚡ Total processing time: ${totalTime}ms`);

        res.json({
            totalPresent: present,  // Currently working (no timeOut)
            fullDay,
            halfDay,
            invalid,  // ✅ NEW: Include invalid count
            absent
        });
    } catch (error) {
        console.error('❌ Error fetching attendance stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get attendance for specific employee - After /stats to avoid route conflict
router.get('/attendance/:employeeId', async (req, res) => {
    try {
        const attendance = await Attendance.find({
            employeeId: req.params.employeeId
        }).sort({ date: -1, timeIn: -1, time: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// New route for fingerprint-based attendance recording
router.post('/attendance/record', async (req, res) => {
    try {
        console.log('📨 Attendance record request received:', req.body);
        const { fingerprint_template } = req.body;

        if (!fingerprint_template) {
            console.log('❌ No fingerprint template provided');
            return res.status(400).json({ error: 'Fingerprint template is required' });
        }

        console.log('🔍 Searching for employee with fingerprint template...');
        console.log('🔍 DEBUG: Template type:', typeof fingerprint_template);
        console.log('🔍 DEBUG: Template length:', fingerprint_template ? fingerprint_template.length : 'undefined');
        console.log('🔍 DEBUG: Template first 100 chars:', fingerprint_template ? fingerprint_template.substring(0, 100) + '...' : 'undefined');
        console.log('🔍 DEBUG: Template last 100 chars:', fingerprint_template ? '...' + fingerprint_template.substring(fingerprint_template.length - 100) : 'undefined');
        
        // Use the improved fingerprint matching function
        const employee = await findEmployeeByFingerprint(fingerprint_template, isMongoConnected());
        console.log('👤 Employee found:', employee ? employee.employeeId : 'None');

        if (!employee) {
            console.log('❌ Fingerprint not recognized');
            return res.status(404).json({ error: 'Fingerprint not recognized' });
        }

        // Get current date and time in Philippines timezone
        const now = getPhilippinesNow();
        const today = getDateOnly(); // YYYY-MM-DD format
        const currentTime = formatTime(now, 'HH:mm:ss'); // HH:MM:SS format
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        // Find today's attendance record for this employee
        const startOfDay = getStartOfDay();
        const endOfDay = getEndOfDay();

        const todayRecord = await Attendance.findOne({
            employeeId: employee.employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ timeIn: -1 });

        let message = '';
        let actionType = '';
        let timeInStatus = 'On Time'; // Default status
        let deductionCreated = false;

        if (!todayRecord) {
            // First time in for today - create new attendance record
            
            // ✅ FIX ISSUE 1: Validate attendance date cannot be before hire date
            if (employee.hireDate) {
                const hireDateStart = new Date(employee.hireDate);
                hireDateStart.setHours(0, 0, 0, 0);
                
                if (getStartOfDay() < hireDateStart) {
                    return res.status(400).json({
                        error: 'INVALID_ATTENDANCE_DATE',
                        message: 'Cannot create attendance record before hire date',
                        hireDate: employee.hireDate,
                        attemptedDate: getStartOfDay()
                    });
                }
            }
            
            // 🛡️ FRAUD CHECK: Validate for fraud before allowing time in
            const fraudCheck = await validateAttendanceForFraud({
                employeeId: employee.employeeId,
                timeIn: now,
                timeOut: null,
                date: getStartOfDay(),
                action: 'time_in'
            });

            if (!fraudCheck.passed) {
                console.warn(`⚠️  Fraud validation failed for ${employee.employeeId}:`, fraudCheck.errors);
                return res.status(400).json({
                    error: 'FRAUD_VALIDATION_FAILED',
                    message: 'Attendance record failed fraud validation checks',
                    details: fraudCheck.errors,
                    validations: fraudCheck
                });
            }

            // Log warnings if any
            if (fraudCheck.warnings.length > 0) {
                console.warn(`⚠️  Attendance warnings for ${employee.employeeId}:`, fraudCheck.warnings);
            }
            
            // Check if it's after 9:30 AM for Half Day status
            if (currentHour > 9 || (currentHour === 9 && currentMinutes >= 30)) {
                timeInStatus = 'Half Day';
                console.log(`🕐 Time is after 9:30 AM - marking as Half Day`);
                // Create automatic deduction for Half Day (50% of daily salary)
                deductionCreated = await createAttendanceDeduction(employee, 'Half Day', 0.5, now);
                console.log(`💰 Deduction creation result: ${deductionCreated}`);
            }

            // Get employee to populate the employee field
            const employeeDoc = await Employee.findOne({ employeeId: employee.employeeId });

            // Create new attendance record with timeIn
            const newAttendance = new Attendance({
                employee: employeeDoc._id,
                employeeId: employee.employeeId,
                date: getStartOfDay(), // Set to start of day for date field
                timeIn: now,
                timeOut: null,
                status: timeInStatus === 'On Time' ? 'present' : 'late',
                timeInStatus: timeInStatus,
                dayType: 'Incomplete', // Will be updated when timing out
                notes: timeInStatus === 'Half Day' ? 'Late arrival - Half Day deduction' : 'On time',
                // Legacy field for backward compatibility
                time: now
            });

            await newAttendance.save();

            console.log(`✅ Time In recorded for ${employee.firstName} ${employee.lastName} (${timeInStatus})`);
            message = `${employee.firstName} ${employee.lastName} timed in successfully at ${formatTime(now)} (${timeInStatus})`;
            actionType = 'time_in';

        } else if (todayRecord && !todayRecord.timeOut) {
            // Already timed in, this is a Time Out

            // 🛡️ FRAUD CHECK: Validate shift duration
            const fraudCheck = await validateAttendanceForFraud({
                employeeId: employee.employeeId,
                timeIn: todayRecord.timeIn,
                timeOut: now,
                date: todayRecord.date,
                action: 'time_out'
            });

            if (!fraudCheck.passed) {
                console.warn(`⚠️  Fraud validation failed for ${employee.employeeId}:`, fraudCheck.errors);
                return res.status(400).json({
                    error: 'FRAUD_VALIDATION_FAILED',
                    message: 'Time out validation failed',
                    details: fraudCheck.errors,
                    validations: fraudCheck
                });
            }

            // Check if it's within the allowed Time Out window (4:00 PM - 6:00 PM)
            if (currentHour < 16 || currentHour >= 18) {
                return res.status(400).json({
                    error: 'Time Out is only allowed between 4:00 PM and 6:00 PM'
                });
            }

            // Update existing record with timeOut
            todayRecord.timeOut = now;
            
            // ✅ FIX: Get current salary rate from SalaryRate collection
            const currentRate = await SalaryRate.getCurrentRate();
            
            // ✅ CRITICAL FIX: Call validateAndCalculateAttendance with CURRENT SALARY RATE
            const calculation = validateAndCalculateAttendance(
                {
                    timeIn: todayRecord.timeIn,
                    timeOut: now,
                    date: todayRecord.date,
                    notes: todayRecord.notes || ''
                },
                {
                    dailyRate: currentRate.dailyRate,
                    overtimeRate: currentRate.overtimeRate
                }
            );

            console.log(`📊 Using current salary rate: Daily=₱${currentRate.dailyRate}, OT=₱${currentRate.overtimeRate}`);

            // Update record with calculated values
            todayRecord.dayType = calculation.dayType;
            todayRecord.actualHoursWorked = calculation.hoursWorked;
            todayRecord.overtimeHours = calculation.overtimeHours;
            todayRecord.daySalary = calculation.daySalary;
            todayRecord.overtimePay = calculation.overtimePay;
            todayRecord.totalPay = calculation.totalPay;
            todayRecord.isValidDay = calculation.isValid;
            todayRecord.validationReason = calculation.reason;
            // ✅ FIX ISSUE #1 & #2: Map dayType to proper status
            // Present: Employee clocked in only (no clock out yet)
            // Invalid: Worked <4 hours (0% pay - No Pay)
            // Half-Day: Worked 4 to <6.5 hours (variable pay by exact hours)
            // Full-Day: Worked 6.5-8 hours (100% daily rate)
            // Overtime: Worked >6.5 hrs + timed out after 5PM (Full pay + OT rate)
            // Absent: No time-in record for the day (0% pay)
            todayRecord.status = calculation.dayType === 'Full Day' ? 'full-day' : 
                                calculation.dayType === 'Half Day' ? 'half-day' : 
                                calculation.dayType === 'Invalid' ? 'invalid' : 
                                calculation.dayType === 'Overtime' ? 'overtime' : 
                                calculation.dayType === 'Absent' ? 'absent' : 'present';

            await todayRecord.save();

            console.log(`✅ Time Out recorded for ${employee.firstName} ${employee.lastName} - ${calculation.dayType}`);
            message = `${employee.firstName} ${employee.lastName} timed out successfully at ${formatTime(now)} (${calculation.dayType}: ${calculation.hoursWorked.toFixed(2)} hours)`;
            actionType = 'time_out';

        } else {
            // Already timed in and out for today
            return res.status(400).json({
                error: 'Already timed in and out for today'
            });
        }

        // Return success response
        res.json({
            message,
            status: actionType,
            employee: {
                id: employee._id,
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`
            },
            attendance: {
                time: now.toISOString(),
                action: actionType === 'time_in' ? 'Time In' : 'Time Out',
                timeInStatus: actionType === 'time_in' ? timeInStatus : todayRecord?.timeInStatus,
                dayType: actionType === 'time_out' ? todayRecord?.dayType : 'Incomplete',
                deductionCreated
            }
        });

    } catch (error) {
        console.error('❌ Attendance recording error:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

// Helper function to create automatic deductions for attendance issues
async function createAttendanceDeduction(employee, reason, percentage, date) {
    try {
        console.log(`💰 Starting deduction creation for ${employee.firstName} ${employee.lastName}`);
        
        // Import Deduction model directly instead of dynamic import
        const Deduction = (await import('../models/Deduction.model.js')).default;

        // Use employee salary or default to minimum wage if not set
        const employeeSalary = employee.salary || 15000; // Default to 15,000 PHP monthly
        const dailySalary = employeeSalary / 30; // Assuming monthly salary, divide by 30 days
        const deductionAmount = dailySalary * percentage;

        console.log(`💰 Creating deduction for ${employee.firstName} ${employee.lastName}:`);
        console.log(`   Employee salary: ${employeeSalary} (${employee.salary ? 'set' : 'default'})`);
        console.log(`   Daily salary: ${dailySalary.toFixed(2)}`);
        console.log(`   Deduction percentage: ${percentage * 100}%`);
        console.log(`   Deduction amount: ${deductionAmount.toFixed(2)}`);

        // Create deduction record
        const deduction = new Deduction({
            employee: employee._id,
            name: `Attendance: ${reason}`,
            type: reason === 'Half Day' ? 'Half Day' : 'Absent', // Use proper type
            amount: deductionAmount,
            date: date,
            status: employee.status || 'regular' // Default to regular if not set
        });

        console.log(`💰 Saving deduction to database...`);
        await deduction.save();
        console.log(`✅ Created ${reason} deduction for ${employee.firstName} ${employee.lastName}: $${deductionAmount.toFixed(2)}`);
        return true;

    } catch (error) {
        console.error('❌ Error creating attendance deduction:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        return false;
    }
}

// New route for direct biometric login (fingerprint capture and employee lookup)
router.post('/biometric/login', async (req, res) => {
    try {
        // Import the spawn function for IPC
        const { spawn } = await import('child_process');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const { dirname } = await import('path');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const pythonScript = path.resolve(
            __dirname,
            '../../Biometric_connect/capture_fingerprint_ipc_complete.py'
        );

        // Spawn Python script for biometric login
        const process = spawn("py", [pythonScript, "--login"], {
            stdio: "pipe",
            timeout: 30000, // 30 second timeout
            env: {
                ...process.env,
                MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db'
            }
        });

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        process.on("close", (code) => {
            try {
                if (code === 0) {
                    // Parse the JSON response from Python script
                    const result = JSON.parse(stdout.trim());

                    if (result.success) {
                        // Successful biometric login
                        res.json({
                            success: true,
                            message: result.message,
                            employee: result.employee
                        });
                    } else {
                        res.status(401).json({
                            success: false,
                            error: result.error || "Biometric login failed"
                        });
                    }
                } else {
                    res.status(500).json({
                        success: false,
                        error: "Biometric login process failed",
                        details: stderr
                    });
                }
            } catch (parseError) {
                res.status(500).json({
                    success: false,
                    error: "Failed to parse biometric login response",
                    details: stdout || stderr
                });
            }
        });

        process.on("error", (error) => {
            res.status(500).json({
                success: false,
                error: "Failed to start biometric login process",
                details: error.message
            });
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Biometric login failed",
            details: error.message
        });
    }
});

// Fingerprint attendance route (keeping for backward compatibility)
router.post('/fingerprint/attendance', async (req, res) => {
    try {
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        // Find the last attendance record for this employee
        const lastAttendance = await Attendance.findOne({ employeeId }).sort({ time: -1 });

        let status;
        if (!lastAttendance || lastAttendance.status === 'Time Out') {
            status = 'Time In';
        } else {
            status = 'Time Out';
        }

        // Create new attendance record
        const newAttendance = new Attendance({
            employeeId,
            status,
            time: new Date()
        });

        await newAttendance.save();

        res.status(201).json({
            message: `Successfully ${status}`,
            time: newAttendance.time.toISOString()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Test endpoint to simulate attendance recording (for testing without device)
router.post('/attendance/test-record', async (req, res) => {
    try {
        const { employeeId, status } = req.body;

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Find employee
        let employee;
        if (isMongoConnected()) {
            employee = await Employee.findOne({ employeeId });
        } else {
            employee = localEmployeeStorage.findByEmployeeId(employeeId);
        }

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get current date and time
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        // Find today's attendance record
        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const todayRecord = await Attendance.findOne({
            employeeId: employee.employeeId,
            time: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ time: -1 });

        let message = '';
        let attendanceStatus = 'Present';
        let deductionCreated = false;

        if (!todayRecord || (todayRecord && todayRecord.status === 'Time Out')) {
            // This is a Time In
            if (currentHour > 9 || (currentHour === 9 && currentMinutes >= 30)) {
                attendanceStatus = 'Half Day';
                deductionCreated = await createAttendanceDeduction(employee, 'Half Day', 0.5, now);
            }

            const newAttendance = new Attendance({
                employeeId: employee.employeeId,
                status: 'Time In',
                time: now,
                notes: attendanceStatus
            });

            await newAttendance.save();

            message = `${employee.firstName} ${employee.lastName} timed in successfully at ${now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })} (${attendanceStatus})`;

            // Broadcast real-time attendance update
            // WebSocket broadcast removed - not needed

        } else if (todayRecord && todayRecord.status === 'Time In') {
            // This is a Time Out
            if (currentHour < 16 || currentHour >= 18) {
                return res.status(400).json({
                    error: 'Time Out is only allowed between 4:00 PM and 6:00 PM'
                });
            }

            const newAttendance = new Attendance({
                employeeId: employee.employeeId,
                status: 'Time Out',
                time: now,
                notes: todayRecord.notes || 'Present'
            });

            await newAttendance.save();

            message = `${employee.firstName} ${employee.lastName} timed out successfully at ${now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })}`;

            // Broadcast real-time attendance update
            // WebSocket broadcast removed - not needed

        } else {
            return res.status(400).json({
                error: 'Already timed in and out for today'
            });
        }

        res.json({
            message,
            status: status || 'success',
            employee: {
                id: employee._id,
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`
            },
            attendance: {
                time: now.toISOString(),
                status: (!todayRecord || todayRecord.status === 'Time Out') ? 'Time In' : 'Time Out',
                attendanceStatus,
                deductionCreated
            }
        });

    } catch (error) {
        console.error('Test attendance recording error:', error);
        res.status(500).json({ error: 'Failed to record test attendance' });
    }
});

// Archive attendance record
router.patch('/attendance/:id/archive', async (req, res) => {
    try {
        console.log(`📦 Archiving attendance record: ${req.params.id}`);
        
        const attendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            { archived: true },
            { new: true }
        );
        
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        
        console.log(`✅ Attendance record archived successfully`);
        res.json(attendance);
    } catch (error) {
        console.error('❌ Error archiving attendance:', error);
        res.status(500).json({ message: error.message });
    }
});

// Restore attendance record from archive
router.patch('/attendance/:id/restore', async (req, res) => {
    try {
        console.log(`📤 Restoring attendance record: ${req.params.id}`);
        
        const attendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            { archived: false },
            { new: true }
        );
        
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        
        console.log(`✅ Attendance record restored successfully`);
        res.json(attendance);
    } catch (error) {
        console.error('❌ Error restoring attendance:', error);
        res.status(500).json({ message: error.message });
    }
});

// 🆕 PHASE 2: Real-time time-in validation (for biometric scanner)
router.post('/attendance/validate-timein', async (req, res) => {
    try {
        const { timeIn, date, employeeId } = req.body;
        
        console.log(`⏰ Validating time-in for employee ${employeeId || 'unknown'} at ${timeIn} on ${date}`);
        
        // Validate required fields
        if (!timeIn || !date) {
            return res.status(400).json({
                success: false,
                error: 'timeIn and date are required',
                message: 'Missing required fields'
            });
        }

        // Use real-time validation
        const validation = validateTimeInRealTime(timeIn, date);
        
        // If employeeId provided, get employee details for rate info
        let employeeInfo = null;
        if (employeeId) {
            try {
                const employee = await Employee.findOne({ employeeId: employeeId });
                if (employee) {
                    employeeInfo = {
                        dailyRate: employee.dailyRate || 550,
                        expectedFullDayPay: employee.dailyRate || 550,
                        expectedHalfDayPay: (employee.dailyRate || 550) / 2
                    };
                }
            } catch (err) {
                console.warn('Could not fetch employee details:', err.message);
            }
        }
        
        console.log(`✅ Validation result: ${validation.status}`);
        
        res.json({
            success: true,
            validation: {
                ...validation,
                timeIn,
                date,
                employeeInfo
            }
        });
        
    } catch (error) {
        console.error('❌ Error validating time-in:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to validate time-in'
        });
    }
});

// 🆕 PHASE 2: Calculate attendance record (for manual/admin updates)
router.post('/attendance/calculate', async (req, res) => {
    try {
        const { timeIn, timeOut, date, employeeId } = req.body;
        
        console.log(`🧮 Calculating attendance for employee ${employeeId} on ${date}`);
        
        // Validate required fields
        if (!date || !employeeId) {
            return res.status(400).json({
                success: false,
                error: 'date and employeeId are required'
            });
        }

        // Get employee details
        const employee = await Employee.findOne({ employeeId: employeeId });
        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
        }

        // ✅ FIX: Get current salary rate from SalaryRate collection
        const currentRate = await SalaryRate.getCurrentRate();

        // Calculate attendance using CURRENT SALARY RATE
        const calculation = validateAndCalculateAttendance(
            { timeIn, timeOut, date },
            {
                dailyRate: currentRate.dailyRate,
                overtimeRate: currentRate.overtimeRate
            }
        );
        
        console.log(`✅ Calculation complete: ${calculation.dayType}, ₱${calculation.totalPay} (Rate: ₱${currentRate.dailyRate}/day)`);
        
        res.json({
            success: true,
            employee: {
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`,
                dailyRate: currentRate.dailyRate
            },
            salaryRate: {
                dailyRate: currentRate.dailyRate,
                hourlyRate: currentRate.hourlyRate,
                overtimeRate: currentRate.overtimeRate
            },
            calculation
        });
        
    } catch (error) {
        console.error('❌ Error calculating attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to calculate attendance'
        });
    }
});

export default router;
