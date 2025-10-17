# 🚀 PHASE 2 IMPLEMENTATION PLAN
**Computerized Payroll Management System**  
**Date:** October 14, 2025  
**Phase 1 Status:** ✅ Completed (97.5% Success Rate)  
**Timeline:** 2-3 Weeks  
**Priority Order:** Enhanced Attendance → On-Call Scheduling → Scheduled Tasks → PDF Payslips

---

## 📋 PREREQUISITES

### ✅ Phase 1 Completed (100%)
1. ✅ Employee Model with salary rates (dailyRate, hourlyRate, overtimeRate)
2. ✅ Cash Advance with ₱1,100 limit and approval workflow
3. ✅ Mandatory Deductions (SSS, PhilHealth, Pag-IBIG, Tax)
4. ✅ Enhanced Payroll calculation engine
5. ✅ Payroll Calculator Service (15+ functions)
6. ✅ Migration script (all 17 employees updated)
7. ✅ 35 API endpoints created
8. ✅ Zero compile/runtime/console errors

### 🔧 System Requirements
- Node.js 16+ with ES Modules
- MongoDB Atlas connection
- Python 3.8+ (for biometric script)
- ZKTeco fingerprint scanner (already integrated)

---

## 🎯 PHASE 2 GOALS

### Primary Objectives
1. **Enhanced Attendance Rules** - Time-in validation for full day vs half day
2. **On-Call Scheduling System** - Daily schedule management (2 regular + 3 on-call)
3. **PDF Payslip Generation** - Export payslips as downloadable PDF
4. **Scheduled Tasks** - Auto-generate weekly payroll (node-cron)
5. **Employee Dashboard Updates** - Replace mock data with real API calls

### Success Criteria
- All attendance rules working (8:00-9:30 = Full, 9:31+ = Half, 4hr minimum)
- Schedule creation and validation working
- PDF payslips generated correctly
- Weekly payroll auto-generated every Sunday
- Dashboard showing real-time data

---

## 📅 DETAILED TASK BREAKDOWN

### **TASK GROUP 1: Enhanced Attendance Rules** (Week 1, Days 1-3)
**Priority:** 🔥 HIGH  
**Estimated Time:** 3 days  
**Dependencies:** None

#### Task 1.1: Create Attendance Calculator Utility
**File:** `employee/payroll-backend/utils/attendanceCalculator.js` (NEW)

**Sub-tasks:**
- [ ] Create new utility file in utils folder
- [ ] Implement `calculateAttendanceStatus(timeIn)` function
  - Returns: { status, salaryAmount, type }
  - Full Day: 8:00-9:30 AM → ₱550
  - Half Day: 9:31+ AM → ₱275
  - Late/Absent logic
- [ ] Implement `validateHalfDayMinimum(hours)` function
  - Minimum 4 hours for half day
  - Return validation result with salary amount
- [ ] Add comprehensive JSDoc comments
- [ ] Export all functions

**Code Structure:**
```javascript
export const calculateAttendanceStatus = (timeIn) => {
  // Logic here
};

export const validateHalfDayMinimum = (hours) => {
  // Logic here
};

export const getAttendanceType = (timeIn, timeOut) => {
  // Combined logic
};
```

**Testing:**
- [ ] Unit tests for all time scenarios
- [ ] Edge cases (exactly 9:30, 9:31, etc.)
- [ ] Boundary testing

---

#### Task 1.2: Update Attendance Model
**File:** `employee/payroll-backend/models/AttendanceModels.js`

**Changes:**
- [ ] Add `attendanceType` field: Enum ['Full Day', 'Half Day', 'Late', 'Absent']
- [ ] Add `calculatedSalary` field: Number (₱550, ₱275, or 0)
- [ ] Add `isValidHalfDay` field: Boolean
- [ ] Update pre-save middleware to use attendanceCalculator
- [ ] Add validation for half-day minimum hours

**New Schema Fields:**
```javascript
{
  attendanceType: {
    type: String,
    enum: ['Full Day', 'Half Day', 'Late', 'Absent'],
    required: true
  },
  calculatedSalary: {
    type: Number,
    required: true,
    min: 0
  },
  isValidHalfDay: {
    type: Boolean,
    default: true
  }
}
```

---

#### Task 1.3: Update Attendance Routes
**File:** `employee/payroll-backend/routes/Attendance.js`

**Changes:**
- [ ] Import attendanceCalculator functions
- [ ] Update POST /attendance to auto-calculate type and salary
- [ ] Add validation for half-day minimum
- [ ] Return detailed attendance info in response
- [ ] Add error handling for invalid attendance

**API Response Update:**
```javascript
{
  success: true,
  attendance: {
    _id: "...",
    employee: "...",
    timeIn: "2025-10-14T08:15:00Z",
    timeOut: "2025-10-14T17:00:00Z",
    status: "Present",
    attendanceType: "Full Day",
    calculatedSalary: 550,
    hoursWorked: 8,
    isValidHalfDay: true
  }
}
```

---

#### Task 1.4: Update Python Biometric Script
**File:** `employee/Biometric_connect/main.py` or attendance integration script

**Changes:**
- [ ] No changes needed - Python script sends raw time-in/time-out
- [ ] Backend calculates everything automatically
- [ ] Verify Python script still works with new schema

---

#### Task 1.5: Update Payroll Calculator Integration
**File:** `employee/payroll-backend/services/payrollCalculator.js`

**Changes:**
- [ ] Update `getAttendanceSummary()` to use new `attendanceType` field
- [ ] Use `calculatedSalary` instead of calculating from hours
- [ ] Handle half-day validation failures
- [ ] Update `calculateBasicSalary()` to sum calculatedSalary values

**Updated Function:**
```javascript
export const getAttendanceSummary = async (employeeId, startDate, endDate) => {
  const attendanceRecords = await AttendanceModel.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
    status: 'Present'
  });
  
  let fullDays = 0;
  let halfDays = 0;
  let totalSalary = 0;
  
  attendanceRecords.forEach(record => {
    if (record.attendanceType === 'Full Day') {
      fullDays++;
      totalSalary += record.calculatedSalary;
    } else if (record.attendanceType === 'Half Day' && record.isValidHalfDay) {
      halfDays++;
      totalSalary += record.calculatedSalary;
    }
  });
  
  return {
    fullDays,
    halfDays,
    totalBasicSalary: totalSalary,
    // ... other fields
  };
};
```

---

#### Task 1.6: Testing Attendance Rules
**Create:** `employee/payroll-backend/test-attendance-rules.js`

**Test Scenarios:**
- [ ] Time-in 8:00 AM → Full Day (₱550)
- [ ] Time-in 9:30 AM → Full Day (₱550)
- [ ] Time-in 9:31 AM → Half Day (₱275)
- [ ] Time-in 10:00 AM, 3 hours worked → Half Day Invalid (₱0)
- [ ] Time-in 10:00 AM, 5 hours worked → Half Day Valid (₱275)
- [ ] Time-in 2:00 PM, 4+ hours worked → Half Day Valid (₱275)
- [ ] Verify lunch break exclusion (12:00-12:59 PM)
- [ ] Calculate payroll with mixed full/half days
- [ ] Verify YTD calculations

---

### **TASK GROUP 2: On-Call Scheduling System** (Week 1-2, Days 4-7)
**Priority:** 🟡 MEDIUM  
**Estimated Time:** 4 days  
**Dependencies:** None

#### Task 2.1: Create Schedule Model
**File:** `employee/payroll-backend/models/Schedule.model.js` (NEW)

**Schema:**
```javascript
const ScheduleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  regularEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    validate: {
      validator: function(v) {
        return v.length === 2;
      },
      message: 'Must have exactly 2 regular employees'
    }
  }],
  onCallEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    validate: {
      validator: function(v) {
        return v.length === 3;
      },
      message: 'Must have exactly 3 on-call employees'
    }
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Completed'],
    default: 'Draft'
  }
}, { timestamps: true });
```

**Methods:**
- [ ] `validateEmployeeAvailability()` - Check if employee is assigned to multiple dates
- [ ] `getSchedule(date)` - Get schedule for specific date
- [ ] `getWeekSchedule(startDate)` - Get schedule for entire week
- [ ] `createBulkSchedule(schedules)` - Create multiple schedules at once

---

#### Task 2.2: Create Schedule Routes
**File:** `employee/payroll-backend/routes/schedule.js` (NEW)

**Endpoints:**
- [ ] `GET /api/schedules` - Get all schedules with filters
- [ ] `GET /api/schedules/:date` - Get schedule for specific date
- [ ] `GET /api/schedules/week/:startDate` - Get week schedule
- [ ] `POST /api/schedules` - Create new schedule
- [ ] `POST /api/schedules/bulk` - Create multiple schedules
- [ ] `PUT /api/schedules/:date` - Update schedule
- [ ] `DELETE /api/schedules/:date` - Delete schedule
- [ ] `GET /api/schedules/employee/:employeeId` - Get employee's assigned dates
- [ ] `PUT /api/schedules/:date/publish` - Publish schedule (notify employees)
- [ ] `GET /api/schedules/available-employees/:date` - Get available employees for date

---

#### Task 2.3: Schedule Validation Service
**File:** `employee/payroll-backend/services/scheduleValidator.js` (NEW)

**Functions:**
- [ ] `validateScheduleRules(schedule)` - Ensure 2 regular + 3 on-call
- [ ] `checkEmployeeAvailability(employeeId, date)` - Prevent double booking
- [ ] `getAvailableEmployees(date, employmentType)` - Get unassigned employees
- [ ] `validateDateRange(startDate, endDate)` - Prevent past date scheduling
- [ ] `checkEmployeeWorkload(employeeId, week)` - Ensure fair distribution

---

#### Task 2.4: Frontend Schedule Management
**File:** `employee/src/components/ScheduleManagement.jsx` (NEW)

**Features:**
- [ ] Calendar view of schedules
- [ ] Drag-and-drop employee assignment
- [ ] Visual indicators (2 regular, 3 on-call slots)
- [ ] Employee availability display
- [ ] Bulk schedule creation (week/month)
- [ ] Schedule publishing workflow
- [ ] Employee notifications

**UI Components:**
- Weekly calendar grid
- Employee list (regular/on-call filtered)
- Assignment slots with validation
- Save/Publish buttons
- Conflict warnings

---

#### Task 2.5: Schedule Notifications
**Optional - Can defer to Phase 3**

**Features:**
- [ ] Email notifications when schedule published
- [ ] SMS notifications (optional)
- [ ] In-app notifications
- [ ] Reminder 1 day before assigned date

---

### **TASK GROUP 3: Scheduled Tasks (Auto-Payroll)** (Week 2, Days 1-2)
**Priority:** 🟡 MEDIUM  
**Estimated Time:** 2 days  
**Dependencies:** Enhanced Attendance (Task Group 1)

#### Task 3.1: Install and Configure node-cron
**File:** `employee/payroll-backend/package.json`

**Installation:**
```bash
npm install node-cron --save
```

**Configuration File:** `employee/payroll-backend/services/cronJobs.js` (NEW)
```javascript
import cron from 'node-cron';
import { generateWeeklyPayroll } from './payrollCalculator.js';

// Run every Sunday at 11:59 PM
export const scheduleWeeklyPayroll = () => {
  cron.schedule('59 23 * * 0', async () => {
    console.log('🔄 Running weekly payroll generation...');
    try {
      const result = await generateWeeklyPayroll();
      console.log('✅ Weekly payroll generated:', result);
    } catch (error) {
      console.error('❌ Payroll generation failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Manila"
  });
  
  console.log('✅ Cron job scheduled: Weekly payroll generation (Sundays 11:59 PM)');
};
```

---

#### Task 3.2: Update Server Initialization
**File:** `employee/payroll-backend/server.js`

**Changes:**
```javascript
import { scheduleWeeklyPayroll } from './services/cronJobs.js';

// ... existing code ...

// Start cron jobs
scheduleWeeklyPayroll();

console.log('✅ Scheduled tasks initialized');
```

---

#### Task 3.3: Additional Scheduled Tasks (Optional)
**Ideas for future:**
- [ ] Daily attendance reminder (8:00 AM)
- [ ] Monthly tax report generation
- [ ] Weekly backup of attendance records
- [ ] Birthday reminders for employees
- [ ] Cash advance due date reminders

---

### **TASK GROUP 4: PDF Payslip Generation** (Week 2, Days 3-5)
**Priority:** 🟢 LOW (Nice to have)  
**Estimated Time:** 3 days  
**Dependencies:** Enhanced Payroll Model (Phase 1 ✅)

#### Task 4.1: Install PDF Library
**File:** `employee/payroll-backend/package.json`

**Options:**
1. **pdfkit** (Most flexible, low-level)
2. **puppeteer** (HTML to PDF, heavier)
3. **jsPDF** (Client-side + server-side)

**Recommendation:** pdfkit for lightweight server-side generation

```bash
npm install pdfkit --save
```

---

#### Task 4.2: Create PDF Generator Service
**File:** `employee/payroll-backend/services/pdfGenerator.js` (NEW)

**Function:**
```javascript
import PDFDocument from 'pdfkit';
import fs from 'fs';

export const generatePayslipPDF = async (payrollId, outputPath) => {
  const payroll = await EnhancedPayroll.findById(payrollId)
    .populate('employee')
    .populate('mandatoryDeductions.deduction');
  
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  // Header
  doc.fontSize(20).text('RAE DISENYO GARDEN & LANDSCAPING', { align: 'center' });
  doc.fontSize(16).text('PAYSLIP', { align: 'center' });
  doc.moveDown();
  
  // Employee Info
  doc.fontSize(12);
  doc.text(`Employee: ${payroll.employee.firstName} ${payroll.employee.lastName}`);
  doc.text(`Employee ID: ${payroll.employee.employeeId}`);
  doc.text(`Pay Period: ${payroll.payPeriod.startDate.toLocaleDateString()} - ${payroll.payPeriod.endDate.toLocaleDateString()}`);
  doc.moveDown();
  
  // Earnings
  doc.fontSize(14).text('EARNINGS', { underline: true });
  doc.fontSize(12);
  doc.text(`Work Days: ${payroll.workDays}`);
  doc.text(`Half Days: ${payroll.halfDays}`);
  doc.text(`Basic Salary: ₱${payroll.basicSalary.toFixed(2)}`);
  doc.text(`Overtime Pay: ₱${payroll.overtimePay.toFixed(2)}`);
  doc.text(`Gross Salary: ₱${payroll.grossSalary.toFixed(2)}`);
  doc.moveDown();
  
  // Deductions
  doc.fontSize(14).text('DEDUCTIONS', { underline: true });
  doc.fontSize(12);
  payroll.mandatoryDeductions.forEach(ded => {
    doc.text(`${ded.deduction.name}: ₱${ded.amount.toFixed(2)}`);
  });
  if (payroll.cashAdvanceDeduction > 0) {
    doc.text(`Cash Advance: ₱${payroll.cashAdvanceDeduction.toFixed(2)}`);
  }
  doc.text(`Total Deductions: ₱${payroll.totalDeductions.toFixed(2)}`);
  doc.moveDown();
  
  // Net Pay
  doc.fontSize(16).text(`NET PAY: ₱${payroll.netSalary.toFixed(2)}`, { bold: true });
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};
```

---

#### Task 4.3: Add PDF Download Endpoint
**File:** `employee/payroll-backend/routes/enhancedPayroll.js`

**New Endpoint:**
```javascript
// GET /api/enhanced-payroll/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const payrollId = req.params.id;
    const pdfPath = `./temp/payslip-${payrollId}.pdf`;
    
    await generatePayslipPDF(payrollId, pdfPath);
    
    res.download(pdfPath, `payslip-${payrollId}.pdf`, (err) => {
      if (err) {
        console.error('PDF download error:', err);
      }
      // Clean up temp file
      fs.unlinkSync(pdfPath);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});
```

---

#### Task 4.4: Frontend PDF Download Button
**File:** `employee/src/components/PayrollList.jsx` or similar

**Add:**
```javascript
const downloadPayslipPDF = async (payrollId) => {
  try {
    const response = await fetch(`/api/enhanced-payroll/${payrollId}/pdf`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${payrollId}.pdf`;
    a.click();
  } catch (error) {
    console.error('Failed to download PDF:', error);
  }
};

// Button
<button onClick={() => downloadPayslipPDF(payroll._id)}>
  Download PDF
</button>
```

---

### **TASK GROUP 5: Employee Dashboard Enhancement** (Week 3, Days 1-2)
**Priority:** 🟢 LOW (Quality of life)  
**Estimated Time:** 2 days  
**Dependencies:** Phase 1 APIs (✅)

#### Task 5.1: Replace Mock Data in EmployeeDashboard
**File:** `employee/src/components/EmployeeDashboard.jsx`

**Current Issues:**
- Uses hardcoded/mock data
- Not connected to real APIs

**Changes:**
- [ ] Replace mock attendance data with API calls
- [ ] Replace mock salary data with API calls
- [ ] Replace mock deductions data with API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add refresh functionality

**API Calls to Implement:**
```javascript
// Get employee's recent attendance
GET /api/attendance?employeeId={id}&limit=10

// Get employee's current payroll
GET /api/enhanced-payroll?employee={id}&status=Draft

// Get employee's cash advances
GET /api/cash-advance/outstanding/{employeeId}

// Get employee's YTD
GET /api/enhanced-payroll/ytd/{employeeId}/{year}
```

---

#### Task 5.2: Real-Time Updates
**Optional Enhancement:**

**Features:**
- [ ] WebSocket connection for real-time attendance updates
- [ ] Push notifications for payroll ready
- [ ] Auto-refresh dashboard every 5 minutes
- [ ] Live payroll status updates

---

## 📊 IMPLEMENTATION ORDER & TIMELINE

### Week 1
**Days 1-3:** Task Group 1 - Enhanced Attendance Rules  
**Days 4-7:** Task Group 2 - On-Call Scheduling System

### Week 2
**Days 1-2:** Task Group 3 - Scheduled Tasks (Auto-Payroll)  
**Days 3-5:** Task Group 4 - PDF Payslip Generation

### Week 3
**Days 1-2:** Task Group 5 - Employee Dashboard Enhancement  
**Days 3-5:** Testing, Bug Fixes, Documentation

---

## ✅ ACCEPTANCE CRITERIA

### Enhanced Attendance Rules
- [ ] Time-in before 9:31 AM = Full Day (₱550)
- [ ] Time-in at/after 9:31 AM = Half Day (₱275)
- [ ] Half day requires minimum 4 hours worked
- [ ] Lunch break (12:00-12:59 PM) excluded from hours
- [ ] Payroll calculator uses new attendance types
- [ ] All existing tests still pass

### On-Call Scheduling
- [ ] Can create schedule for any date
- [ ] Validates exactly 2 regular + 3 on-call employees
- [ ] Prevents double-booking employees
- [ ] Weekly calendar view works
- [ ] Can publish schedules
- [ ] Employees see their assigned dates

### Scheduled Tasks
- [ ] Cron job runs every Sunday at 11:59 PM
- [ ] Automatically generates payroll for previous week
- [ ] Logs success/failure
- [ ] Can be manually triggered for testing
- [ ] Uses Asia/Manila timezone

### PDF Payslips
- [ ] PDF generated with company header
- [ ] Shows all payroll details (earnings, deductions, net pay)
- [ ] Downloadable from frontend
- [ ] Properly formatted and readable
- [ ] No temp file leaks

### Employee Dashboard
- [ ] Shows real attendance data
- [ ] Shows real payroll data
- [ ] Shows real cash advances
- [ ] Loading states work
- [ ] Error handling works
- [ ] No mock data remains

---

## 🧪 TESTING STRATEGY

### Unit Tests
- [ ] Attendance calculator functions
- [ ] Schedule validation logic
- [ ] PDF generation
- [ ] Cron job functions (manual trigger)

### Integration Tests
- [ ] Full attendance workflow (time-in → payroll)
- [ ] Schedule creation → employee notification
- [ ] Payroll calculation → PDF generation
- [ ] Auto-payroll generation end-to-end

### Manual Testing
- [ ] Test all time-in scenarios
- [ ] Create schedules for various dates
- [ ] Verify PDF downloads
- [ ] Check cron job execution
- [ ] Verify dashboard data accuracy

---

## 📝 DOCUMENTATION REQUIREMENTS

### Code Documentation
- [ ] JSDoc comments for all new functions
- [ ] README updates for new features
- [ ] API documentation for new endpoints
- [ ] Database schema documentation

### User Documentation
- [ ] How to use scheduling system
- [ ] How to download PDF payslips
- [ ] How attendance rules work
- [ ] Admin guide for cron jobs

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Attendance Rules Break Existing Payroll
**Mitigation:**
- Test thoroughly with existing data
- Create database backup before deployment
- Have rollback plan ready
- Test in staging environment first

### Risk 2: Cron Job Fails Silently
**Mitigation:**
- Add comprehensive logging
- Email notifications on failure
- Manual trigger option
- Monitor cron job execution

### Risk 3: PDF Generation Performance
**Mitigation:**
- Generate PDFs asynchronously
- Cache generated PDFs
- Clean up old PDFs regularly
- Limit concurrent PDF generations

### Risk 4: Schedule Conflicts
**Mitigation:**
- Strict validation rules
- Transaction support for schedule creation
- Clear error messages
- Undo functionality

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deployment
- [ ] All tests passing (unit + integration)
- [ ] Zero compile/runtime/console errors
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Cron job timezone set correctly (Asia/Manila)
- [ ] PDF output directory created
- [ ] Migration scripts ready (if needed)

### During Deployment
- [ ] Stop application
- [ ] Run any migrations
- [ ] Deploy new code
- [ ] Restart application
- [ ] Verify cron jobs started
- [ ] Test critical paths

### After Deployment
- [ ] Verify attendance calculation
- [ ] Create test schedule
- [ ] Generate test PDF
- [ ] Check cron job logs
- [ ] Monitor for errors
- [ ] User acceptance testing

---

## 📚 ADDITIONAL RESOURCES

### Libraries to Install
```bash
npm install node-cron --save
npm install pdfkit --save
npm install nodemailer --save  # Optional: for notifications
```

### Environment Variables
```env
# Cron Job Settings
CRON_TIMEZONE=Asia/Manila
CRON_ENABLED=true

# PDF Settings
PDF_OUTPUT_DIR=./temp/pdfs
PDF_COMPANY_LOGO=./assets/logo.png

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🎯 SUCCESS METRICS

### Performance Metrics
- Attendance calculation: < 100ms
- Schedule creation: < 500ms
- PDF generation: < 2s
- Cron job execution: < 10s for 50 employees

### Quality Metrics
- Code coverage: > 80%
- Zero critical bugs
- Zero breaking changes
- 100% backward compatibility

### Business Metrics
- Payroll generation time reduced by 90%
- Scheduling time reduced by 80%
- PDF generation automated (100% vs manual)
- Admin time saved: ~5 hours/week

---

## 📞 SUPPORT & MAINTENANCE

### Phase 2 Support Period
- **Duration:** 2 weeks after deployment
- **Response Time:** < 4 hours for critical issues
- **Bug Fixes:** Included in Phase 2
- **Enhancements:** Quote for Phase 3

### Maintenance Tasks
- Weekly cron job monitoring
- Monthly PDF cleanup
- Quarterly attendance rule review
- Regular backup verification

---

**Plan Created By:** GitHub Copilot  
**Last Updated:** October 14, 2025  
**Status:** Ready for Implementation  
**Approval Required:** Yes (from project stakeholder)
