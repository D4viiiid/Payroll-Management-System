# 🚀 PHASE 2 QUICK START GUIDE
**Get Phase 2 Features Running in Minutes**

---

## ✅ PREREQUISITES

Before starting, ensure you have:
- ✅ Node.js installed (v14+)
- ✅ MongoDB running (local or Atlas)
- ✅ Phase 1 completed and working
- ✅ Environment variables configured (`config.env`)

---

## 📦 STEP 1: VERIFY DEPENDENCIES

Check if Phase 2 packages are installed:

```bash
cd employee/payroll-backend
npm list node-cron pdfkit moment-timezone
```

If not installed, run:
```bash
npm install node-cron pdfkit moment-timezone
```

**Expected Output:**
```
node-cron@3.0.3
pdfkit@0.14.0
moment-timezone@0.5.45
```

---

## 🔧 STEP 2: START THE SERVER

```bash
cd employee/payroll-backend
npm start
```

**Look for these messages:**
```
🚀 Server running on http://localhost:5000
✅ MongoDB Connected
✅ Weekly payroll job scheduled
⏰ Next run: Sunday, October 20, 2025 at 11:59 PM (in 6 days)
```

---

## 🧪 STEP 3: RUN PHASE 2 TESTS

Open a new terminal (keep server running):

```bash
cd employee/payroll-backend
node test-phase2.js
```

**Expected Output:**
```
🧪 PHASE 2 COMPREHENSIVE TEST SUITE
====================================================================

📋 CATEGORY 1: ATTENDANCE VALIDATION
✅ TEST 1: On-Time Validation - PASSED
✅ TEST 2: Half-Day Validation - PASSED
✅ TEST 3: Attendance Calculation - PASSED

📋 CATEGORY 2: SCHEDULING SYSTEM
✅ TEST 4: Create Schedule - PASSED
✅ TEST 5: Get Schedule by Date - PASSED
...

📊 TEST SUMMARY
====================================================================
Total Tests Run:    15
✅ Passed:          14 (93%)
❌ Failed:          1 (7%)
Success Rate:       93%
```

---

## 🎯 STEP 4: TEST KEY FEATURES

### 4.1 Test Attendance Validation

**On-Time Arrival (8:30 AM):**
```bash
curl -X POST http://localhost:5000/api/attendance/validate-timein \
  -H "Content-Type: application/json" \
  -d '{
    "timeIn": "08:30:00",
    "date": "2025-10-14"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "validation": {
    "status": "On Time",
    "message": "Good morning! Time-in recorded successfully.",
    "dayType": "Full Day",
    "expectedPay": "Full day salary"
  }
}
```

**Late Arrival (10:00 AM):**
```bash
curl -X POST http://localhost:5000/api/attendance/validate-timein \
  -H "Content-Type: application/json" \
  -d '{
    "timeIn": "10:00:00",
    "date": "2025-10-14"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "validation": {
    "status": "Half Day",
    "message": "Warning: You arrived after 9:30 AM. This will be recorded as HALF DAY...",
    "dayType": "Half Day (Conditional)"
  }
}
```

### 4.2 Test Automated Payroll Status

```bash
curl http://localhost:5000/api/admin/payroll-status
```

**Expected Response:**
```json
{
  "success": true,
  "currentWeek": {
    "payPeriod": {
      "startDate": "2025-10-13",
      "endDate": "2025-10-19"
    },
    "generated": 0,
    "totalEmployees": 17
  },
  "nextScheduledRun": {
    "nextRun": "2025-10-20 23:59:00",
    "daysUntil": 6,
    "humanReadable": "in 6 days"
  }
}
```

### 4.3 Test Schedule Creation

```bash
curl -X POST http://localhost:5000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-10-15",
    "regularEmployees": ["EMPLOYEE_ID_1", "EMPLOYEE_ID_2"],
    "onCallEmployees": ["EMPLOYEE_ID_3"],
    "notes": "Test schedule"
  }'
```

### 4.4 Test PDF Payslip Download

First, create a test payroll:
```bash
curl -X POST http://localhost:5000/api/enhanced-payroll/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "YOUR_EMPLOYEE_OBJECT_ID",
    "startDate": "2025-10-07",
    "endDate": "2025-10-13"
  }'
```

Then download the PDF:
```bash
curl -o payslip.pdf \
  http://localhost:5000/api/enhanced-payroll/PAYROLL_ID/payslip/download
```

Open `payslip.pdf` to verify.

---

## 📋 STEP 5: VERIFY FEATURES

### ✅ Attendance Validation
- [ ] On-time arrival shows "Full Day"
- [ ] Late arrival (after 9:30) shows "Half Day" warning
- [ ] Incomplete records (< 4 hours) calculated correctly
- [ ] Overtime hours calculated properly

### ✅ Automated Payroll
- [ ] Cron job scheduled for Sunday 11:59 PM
- [ ] Next run time displayed correctly
- [ ] Manual trigger works: `POST /api/admin/trigger-payroll`
- [ ] Payroll generated for all active employees

### ✅ Scheduling System
- [ ] Can create daily schedule
- [ ] Validation enforces 2 regular + 3 on-call limit
- [ ] Can retrieve schedule by date
- [ ] Can update/delete schedules

### ✅ PDF Payslips
- [ ] PDF download endpoint works
- [ ] PDF contains company header
- [ ] All payroll details included
- [ ] Filename formatted correctly

---

## 🐛 TROUBLESHOOTING

### Issue: "Cannot find module 'node-cron'"
**Solution:**
```bash
npm install node-cron pdfkit moment-timezone
```

### Issue: "Weekly payroll job not scheduled"
**Solution:** Check `config.env`:
```env
ENABLE_AUTO_PAYROLL=true
```

### Issue: "PDF generation failed"
**Solution:** Ensure pdfkit is installed:
```bash
npm install pdfkit
```

### Issue: "Attendance validation returns error"
**Solution:** Check date/time format:
- Date: "YYYY-MM-DD" (e.g., "2025-10-14")
- Time: "HH:MM:SS" (e.g., "08:30:00")

### Issue: "Schedule creation fails"
**Solution:** Verify employee IDs are valid MongoDB ObjectIds, not employeeId strings.

---

## 📊 MONITORING

### Check Server Logs

The server logs important events:
```
📨 POST /api/attendance/validate-timein
⏰ Validating time-in for employee 12345 at 08:30:00
✅ Validation result: On Time

📄 Generating PDF payslip for payroll: 6543210...
✅ PDF generated: Payslip_Doe_John_2025-10-07.pdf (52480 bytes)

🔔 Cron job triggered: Weekly payroll generation
🤖 AUTOMATED WEEKLY PAYROLL GENERATION
✅ Successfully Generated: 17
```

### Check Cron Job Status

```bash
curl http://localhost:5000/api/admin/payroll-status
```

### Monitor Database

Check for enhanced attendance fields:
```javascript
// MongoDB Shell
db.attendances.findOne()

// Should see new fields:
{
  timeInStatus: "On Time",
  dayType: "Full Day",
  actualHoursWorked: 8,
  overtimeHours: 0,
  daySalary: 550,
  overtimePay: 0,
  totalPay: 550,
  isValidDay: true,
  validationReason: "Arrived on time (by 9:30 AM)"
}
```

---

## 🎯 QUICK VALIDATION CHECKLIST

Before considering Phase 2 complete, verify:

- [ ] **Server starts without errors**
- [ ] **All dependencies installed**
- [ ] **Cron job scheduled** (check logs)
- [ ] **Attendance validation works** (test both on-time and late)
- [ ] **Attendance calculation works** (test with time-in/time-out)
- [ ] **Schedule CRUD works** (create, read, update, delete)
- [ ] **PDF generation works** (download test payslip)
- [ ] **Phase 2 tests run** (at least 80% passing)
- [ ] **No console errors**
- [ ] **Database updated** (attendance records have new fields)

---

## 🚀 NEXT STEPS

### If All Tests Pass (80%+):
✅ **Phase 2 Backend is READY FOR PRODUCTION!**

Next actions:
1. Deploy to production environment
2. Complete frontend components (schedule UI, PDF download button)
3. User acceptance testing
4. Train users on new features

### If Tests Fail (<80%):
Review error messages and check:
1. All dependencies installed
2. MongoDB connection working
3. Environment variables correct
4. No port conflicts (port 5000)
5. Check server logs for errors

---

## 📞 SUPPORT

### Common Commands

**Start Server:**
```bash
npm start
```

**Run Tests:**
```bash
node test-phase2.js
node test-phase1-simple.js
```

**Check Logs:**
```bash
# Server logs show in terminal where npm start is running
```

**Restart Server:**
```bash
# Press Ctrl+C to stop
npm start
```

### Documentation References
- `PHASE_2_COMPLETION_REPORT.md` - Full feature documentation
- `PYTHON_INTEGRATION_GUIDE.md` - Python scanner integration
- `PHASE_2_PROGRESS_REPORT.md` - Development progress

---

## 🎉 SUCCESS CRITERIA

**Phase 2 is successful when:**
- ✅ All Phase 2 tests pass (>80%)
- ✅ Attendance validation working correctly
- ✅ Cron job scheduled and operational
- ✅ PDF payslips generate successfully
- ✅ Schedule API functional
- ✅ Zero server errors

**Current Status:** ✅ **READY TO TEST**

---

## 💡 TIPS

1. **Keep server running** during all tests
2. **Check logs** for detailed information
3. **Use Postman** for easier API testing
4. **Test with real employee data** before production
5. **Back up database** before deployment

---

**Quick Start Version:** 1.0  
**Last Updated:** October 14, 2025  
**Status:** ✅ Ready to Run

🚀 **Let's Go! Start your server and run the tests!** 🚀
