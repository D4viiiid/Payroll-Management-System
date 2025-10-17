# 🚀 QUICK REFERENCE GUIDE

## Employee Management System - Quick Start

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Common Operations](#common-operations)
4. [Troubleshooting](#troubleshooting)
5. [Verification Scripts](#verification-scripts)

---

## SYSTEM OVERVIEW

### Work Week Configuration
- **Work Days:** Monday - Saturday (6 days)
- **Cutoff Day:** Sunday (no operations allowed)
- **Payroll Generation:** Next Monday after cutoff

### Salary Rates (Default)
- **Daily Rate:** ₱550
- **Hourly Rate:** ₱68.75
- **Overtime Rate:** ₱85.94

### Cash Advance Rules
- **Maximum:** ₱1,100 per week
- **Eligibility:** For ≥₱1,100, must have earned ≥₱1,100 from ≥2 full days
- **Restrictions:** No pending requests, cannot exceed balance

---

## QUICK START

### Start Backend Server
```bash
cd employee/payroll-backend
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend
```bash
cd employee
npm run dev
# Frontend runs on http://localhost:5173
```

### Access System
- **Admin:** http://localhost:5173/admin
- **Employee:** http://localhost:5173/employee

---

## COMMON OPERATIONS

### 1. Add New Employee

**Steps:**
1. Go to Employee Management
2. Click "Add Employee"
3. Fill required fields:
   - First Name, Last Name
   - Email, Contact Number
   - Hire Date
   - Status (regular/oncall)
4. Click "Save"

**Auto-Generated:**
- ✅ Employee ID (e.g., EMP-1234)
- ✅ Username (same as Employee ID)
- ✅ Password (random, shown once)

**Next Step:** Enroll fingerprints (up to 3)

---

### 2. Enroll Fingerprints

**Requirements:**
- Employee already created
- ZKTeco fingerprint scanner connected

**Steps:**
1. Go to Employee Management
2. Find employee, click "Enroll Fingerprint"
3. Follow on-screen instructions
4. Scan same finger 3 times for each template
5. Repeat for up to 3 different fingers

**Maximum:** 3 fingerprint templates per employee

---

### 3. Record Attendance (Fingerprint)

**Dashboard Method:**
1. Click "Fingerprint Attendance" button
2. Scan finger
3. **First scan:** Records Time In
4. **Second scan:** Records Time Out
5. **Third scan:** Error (already complete)

**Status Computation:**
- ≥ 6.5 hours = **Present** (full pay)
- ≥ 4.0 hours = **Half-Day** (50% pay)
- < 4.0 hours = **Incomplete** (no pay)

**Note:** Lunch break (12:00-12:59 PM) excluded automatically

---

### 4. Request Cash Advance

**Employee Steps:**
1. Go to Cash Advance page
2. Enter amount (max ₱1,100)
3. Submit request

**Validation:**
- ❌ Cannot request if pending request exists
- ❌ Cannot exceed ₱1,100 per week
- ❌ For ≥₱1,100: Must have worked ≥2 full days

**Admin Steps:**
1. Go to Cash Advance management
2. Review pending requests
3. Approve or Reject

---

### 5. Generate Payroll

**Automatic Process:**
- **Runs:** Every Monday
- **Covers:** Previous Monday-Saturday (6 days)
- **Cutoff:** Sunday

**Manual Process:**
1. Go to Payroll page
2. Select date range (Mon-Sat)
3. Click "Generate Payroll"

**Calculation:**
```
Net Pay = Total Salary - Cash Advances
```

**Status:**
- Initial: **Pending**
- After payment: **Paid**

---

### 6. View Attendance Details

**Admin View:**
1. Go to Attendance page
2. Filter by:
   - Date range
   - Employee
   - Status (present/half-day/absent)
3. View detailed records

**Employee View:**
1. Login to employee portal
2. Go to My Attendance
3. View personal attendance history

---

## TROUBLESHOOTING

### Issue: "Attendance recording failed"

**Cause:** Already recorded Time In and Time Out today

**Solution:** 
- First scan = Time In
- Second scan = Time Out
- Third scan = Not allowed (expected behavior)

**If Error After First Scan:**
- Check if duplicate attendance exists
- Delete today's attendance record and retry

---

### Issue: Employee shows "Unknown" in payroll

**Cause:** Payroll record missing employee reference

**Solution:**
```bash
cd employee/payroll-backend
node fix-payroll-records.js
```

This will link existing payroll records to employees.

---

### Issue: Employee marked as enrolled but 0 fingerprints

**Cause:** Legacy fingerprint data not migrated

**Solution:**
```bash
cd employee/payroll-backend
node migrate-fingerprint-data.js
```

This will migrate legacy data to new format.

---

### Issue: Salary calculation incorrect

**Check:**
1. Attendance records exist for period
2. Time In/Out recorded correctly
3. Status computed properly
4. Work week is Mon-Sat (not Sunday)

**Verify:**
```bash
cd employee/payroll-backend
node verify-complete-system-flow.js
```

---

### Issue: Cash advance request rejected

**Possible Causes:**
1. ❌ Amount > ₱1,100
2. ❌ Pending request already exists
3. ❌ For ≥₱1,100: Not enough attendance (need ≥2 full days)
4. ❌ Exceeds available balance

**Solution:** Check eligibility criteria

---

## VERIFICATION SCRIPTS

### Full System Verification

**Purpose:** Test all 6 components end-to-end

```bash
cd employee/payroll-backend
node verify-complete-system-flow.js
```

**Output:**
- ✅ Employee addition verification
- ✅ Fingerprint attendance workflow
- ✅ Attendance status computation
- ✅ Salary calculations
- ✅ Cash advance rules
- ✅ Payroll generation

---

### Check Fingerprint Data

**Purpose:** Verify fingerprint enrollment status

```bash
cd employee/payroll-backend
node check-fingerprint-data.js
```

**Output:**
- Number of enrolled employees
- Legacy vs new format data
- Employees with missing data

---

### Fix Payroll Records

**Purpose:** Link payroll records to employees

```bash
cd employee/payroll-backend
node fix-payroll-records.js
```

**Actions:**
- Adds employee reference to payroll records
- Adds paymentStatus field
- Adds cashAdvance field
- Adds archived field

---

### Migrate Fingerprint Data

**Purpose:** Convert legacy to new format

```bash
cd employee/payroll-backend
node migrate-fingerprint-data.js
```

**Actions:**
- Converts single template to array
- Fixes incorrect enrollment status
- Preserves existing data

---

## DATABASE ACCESS

### MongoDB Atlas Connection

**Connection String:** Set in `config.env`
```
MONGODB_URI=mongodb+srv://...
```

### Direct Database Access

**Using MongoDB Compass:**
1. Open MongoDB Compass
2. Paste connection string
3. Connect

**Using MongoDB Shell:**
```bash
mongosh "<MONGODB_URI>"
```

### Collections
- `employees` - Employee records
- `attendances` - Time In/Out records
- `cashadvances` - Cash advance requests
- `payrolls` - Weekly payroll records

---

## API ENDPOINTS

### Employees
- `GET /api/employees` - List all
- `POST /api/employees` - Create new
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete

### Attendance
- `GET /api/attendance` - List all
- `POST /api/attendance` - Record Time In
- `PUT /api/attendance/:id` - Update Time Out

### Cash Advance
- `GET /api/cashadvance` - List all
- `POST /api/cashadvance` - Request advance
- `PUT /api/cashadvance/:id` - Approve/Reject

### Payroll
- `GET /api/payrolls` - List active
- `GET /api/payrolls/archived` - List archived
- `POST /api/payrolls` - Generate payroll
- `PUT /api/payrolls/:id` - Update status

---

## BACKUP & RESTORE

### Backup Database

```bash
mongodump --uri="<MONGODB_URI>" --out=backup_$(date +%Y%m%d)
```

### Restore Database

```bash
mongorestore --uri="<MONGODB_URI>" backup_YYYYMMDD/
```

---

## USEFUL COMMANDS

### Check Backend Status
```bash
cd employee/payroll-backend
npm run dev
# Look for "Server running on port 5000"
```

### Check Frontend Status
```bash
cd employee
npm run dev
# Look for "Local: http://localhost:5173"
```

### View Logs
```bash
# Backend logs in terminal
cd employee/payroll-backend
npm run dev

# Frontend logs in browser console (F12)
```

### Clear Test Data

**Clear Today's Attendance:**
```bash
cd employee/payroll-backend
node clear-today-attendance.js
```

---

## SUPPORT

### Error Checking
```bash
# Run verification script
node verify-complete-system-flow.js

# Check fingerprint data
node check-fingerprint-data.js

# Fix payroll records
node fix-payroll-records.js

# Migrate fingerprint data
node migrate-fingerprint-data.js
```

### System Health
- ✅ Backend: http://localhost:5000/api/health
- ✅ Database: Connection in verification script
- ✅ Frontend: http://localhost:5173

### Documentation
- Full Report: `COMPLETE_SYSTEM_VERIFICATION_REPORT.md`
- Quick Guide: `QUICK_REFERENCE_GUIDE.md` (this file)

---

**Last Updated:** January 19, 2025  
**System Status:** ✅ OPERATIONAL

