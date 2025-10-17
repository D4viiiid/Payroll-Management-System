# 🧪 PHASE 1 TESTING GUIDE
## Quick Start Testing for Enhanced Features

**Date:** October 14, 2025  
**Status:** Ready for Testing

---

## 🚀 PRE-TESTING SETUP

### 1. **Run Migration Script** (Update Existing Employees)
```bash
# From the employee directory
cd employee/payroll-backend
node migrations/migrateEmployees.js
```

**Expected Output:**
```
✅ Connected to MongoDB
📊 Found X employees to process
✅ Updated: [Employee Names]
========================================
📊 MIGRATION SUMMARY
========================================
Total Employees:     X
✅ Updated:          X
⏭️  Skipped:          0
❌ Errors:           0
========================================
✅ Migration completed successfully!
```

### 2. **Seed Default Mandatory Deductions**
```bash
# Using curl or Postman
curl -X POST http://localhost:5000/api/mandatory-deductions/seed/defaults
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Default deductions seeding completed",
  "created": 4,
  "skipped": 0,
  "deductions": [
    { "deductionName": "SSS", "percentageRate": 0.045 },
    { "deductionName": "PhilHealth", "percentageRate": 0.04 },
    { "deductionName": "Pag-IBIG", "percentageRate": 0.02 },
    { "deductionName": "Withholding Tax", "percentageRate": 0.15 }
  ]
}
```

---

## 📋 TESTING CHECKLIST

### ✅ **1. Employee Management (Enhanced)**

#### **Test: Create Employee with Salary Rates**
```http
POST http://localhost:5000/api/employees
Content-Type: application/json

{
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "email": "juan.delacruz@example.com",
  "contactNumber": "09171234567",
  "position": "Landscaper",
  "hireDate": "2025-10-14",
  "employmentType": "Regular",
  "dailyRate": 550,
  "hourlyRate": 68.75,
  "overtimeRate": 85.94
}
```

**Expected:** ✅ Employee created with salary rate fields

#### **Test: Frontend Employee Form**
1. Go to Employee Management page
2. Click "Add Employee"
3. Fill in all fields including:
   - Employment Type (dropdown)
   - Daily Rate (default: 550)
   - Hourly Rate (default: 68.75)
   - Overtime Rate (default: 85.94)
4. Submit form

**Expected:** ✅ Employee created successfully

---

### ✅ **2. Cash Advance (Enhanced)**

#### **Test: Request Cash Advance (₱1,100 Limit)**
```http
POST http://localhost:5000/api/cash-advance
Content-Type: application/json

{
  "employee": "EMPLOYEE_ID_HERE",
  "amount": 1100,
  "purpose": "Medical Emergency",
  "notes": "Urgent request"
}
```

**Expected:** ✅ Cash advance request created (status: Pending)

#### **Test: Reject Amount > ₱1,100**
```http
POST http://localhost:5000/api/cash-advance
Content-Type: application/json

{
  "employee": "EMPLOYEE_ID_HERE",
  "amount": 1200,
  "purpose": "Test"
}
```

**Expected:** ❌ Error: "Cash advance cannot exceed ₱1,100"

#### **Test: Approve Cash Advance**
```http
PUT http://localhost:5000/api/cash-advance/ADVANCE_ID/approve
Content-Type: application/json

{
  "approvedBy": "ADMIN_ID_HERE",
  "notes": "Approved for medical emergency",
  "deductionSchedule": "2025-10-20"
}
```

**Expected:** ✅ Status changed to "Approved"

#### **Test: Get Outstanding Advances**
```http
GET http://localhost:5000/api/cash-advance/outstanding/EMPLOYEE_ID
```

**Expected:** ✅ List of outstanding advances with total

---

### ✅ **3. Mandatory Deductions**

#### **Test: Get Active Deductions for Regular Employee**
```http
GET http://localhost:5000/api/mandatory-deductions/active/Regular
```

**Expected:** ✅ List of SSS, PhilHealth, Pag-IBIG, Tax

#### **Test: Calculate Deduction Amount**
```http
POST http://localhost:5000/api/mandatory-deductions/calculate
Content-Type: application/json

{
  "deductionId": "DEDUCTION_ID_HERE",
  "grossSalary": 5500
}
```

**Expected for SSS (4.5%):**
```json
{
  "success": true,
  "deductionName": "SSS",
  "deductionType": "Percentage",
  "grossSalary": 5500,
  "amount": 247.50,
  "rate": 0.045
}
```

#### **Test: Create Custom Deduction**
```http
POST http://localhost:5000/api/mandatory-deductions
Content-Type: application/json

{
  "deductionName": "Other",
  "deductionType": "Fixed",
  "fixedAmount": 100,
  "effectiveDate": "2025-10-14",
  "isActive": true,
  "applicableTo": "All",
  "description": "Uniform deduction"
}
```

**Expected:** ✅ Custom deduction created

---

### ✅ **4. Enhanced Payroll**

#### **Test: Calculate Payroll for Single Employee**
```http
POST http://localhost:5000/api/enhanced-payroll/calculate/EMPLOYEE_ID
Content-Type: application/json

{
  "startDate": "2025-10-07",
  "endDate": "2025-10-13"
}
```

**Expected:**
```json
{
  "success": true,
  "payroll": {
    "employee": "EMPLOYEE_ID",
    "payPeriod": { "startDate": "...", "endDate": "..." },
    "workDays": 5,
    "halfDays": 1,
    "totalHoursWorked": 35.5,
    "overtimeHours": 2.5,
    "basicSalary": 3025,
    "overtimePay": 214.85,
    "grossSalary": 3239.85,
    "mandatoryDeductions": [
      { "deductionName": "SSS", "amount": 145.79 },
      { "deductionName": "PhilHealth", "amount": 129.59 },
      { "deductionName": "Pag-IBIG", "amount": 64.80 },
      { "deductionName": "Withholding Tax", "amount": 0 }
    ],
    "cashAdvanceDeduction": 1100,
    "totalDeductions": 1440.18,
    "netSalary": 1799.67,
    "yearToDate": 1799.67,
    "status": "Draft"
  },
  "summary": { ... }
}
```

#### **Test: Sunday Cutoff Validation**
```http
POST http://localhost:5000/api/enhanced-payroll/calculate/EMPLOYEE_ID
Content-Type: application/json

{
  "startDate": "2025-10-07",
  "endDate": "2025-10-14"
}
```

**Expected:** ❌ Error: "Payroll cutoff must be on Sunday"  
(October 14, 2025 is a Tuesday)

#### **Test: Create Payroll Record**
```http
POST http://localhost:5000/api/enhanced-payroll
Content-Type: application/json

{
  "employee": "EMPLOYEE_ID",
  "payPeriod": {
    "startDate": "2025-10-06",
    "endDate": "2025-10-12"
  },
  "workDays": 5,
  "halfDays": 1,
  "totalHoursWorked": 35.5,
  "overtimeHours": 2.5,
  "basicSalary": 3025,
  "overtimePay": 214.85,
  "grossSalary": 3239.85,
  "mandatoryDeductions": [
    { "deductionName": "SSS", "amount": 145.79, "percentageRate": 0.045, "calculationType": "Percentage" }
  ],
  "cashAdvanceDeduction": 1100,
  "totalDeductions": 1440.18,
  "netSalary": 1799.67,
  "yearToDate": 1799.67,
  "status": "Draft"
}
```

**Expected:** ✅ Payroll record created

#### **Test: Update Payroll Status (Process)**
```http
PUT http://localhost:5000/api/enhanced-payroll/PAYROLL_ID/status
Content-Type: application/json

{
  "status": "Processed",
  "userId": "ADMIN_ID"
}
```

**Expected:** ✅ Status updated, processedBy and processedDate set

#### **Test: Update Payroll Status (Paid) - Processes Cash Advance**
```http
PUT http://localhost:5000/api/enhanced-payroll/PAYROLL_ID/status
Content-Type: application/json

{
  "status": "Paid",
  "userId": "ADMIN_ID"
}
```

**Expected:** 
- ✅ Status updated to "Paid"
- ✅ Cash advance balance deducted
- ✅ Payment history added to cash advance

#### **Test: Get YTD for Employee**
```http
GET http://localhost:5000/api/enhanced-payroll/ytd/EMPLOYEE_ID/2025
```

**Expected:**
```json
{
  "success": true,
  "ytd": {
    "yearToDateGross": 15000,
    "yearToDateNet": 12000,
    "yearToDateDeductions": 3000,
    "totalWorkDays": 25,
    "totalHalfDays": 3,
    "totalOvertimeHours": 10
  }
}
```

#### **Test: Get Payroll Summary for Period**
```http
GET http://localhost:5000/api/enhanced-payroll/summary/period?startDate=2025-10-01&endDate=2025-10-31
```

**Expected:**
```json
{
  "success": true,
  "summary": {
    "totalEmployees": 10,
    "totalGrossSalary": 50000,
    "totalDeductions": 10000,
    "totalNetSalary": 40000,
    "totalOvertimePay": 2000,
    "totalCashAdvance": 5000
  }
}
```

#### **Test: Get Payslip Data**
```http
GET http://localhost:5000/api/enhanced-payroll/PAYROLL_ID/payslip
```

**Expected:** ✅ Complete payslip data with all details

---

### ✅ **5. Integration Tests**

#### **Test: Complete Workflow**

1. **Create Employee with Salary Rates**
   - ✅ Employee created

2. **Employee Requests Cash Advance (₱1,100)**
   - ✅ Request created (Pending)

3. **Admin Approves Cash Advance**
   - ✅ Status: Approved

4. **Record Attendance for Employee (Full Week)**
   - Monday: Time In 8:30 AM, Time Out 5:30 PM
   - Tuesday: Time In 8:45 AM, Time Out 5:45 PM
   - Wednesday: Time In 9:35 AM, Time Out 5:30 PM (Half Day)
   - Thursday: Time In 8:20 AM, Time Out 5:20 PM
   - Friday: Time In 8:00 AM, Time Out 6:30 PM (Overtime)

5. **Calculate Payroll for Week**
   - ✅ Work Days: 4
   - ✅ Half Days: 1
   - ✅ Basic Salary: (4 × 550) + (1 × 275) = 2,475
   - ✅ Overtime: calculated
   - ✅ Gross Salary: basicSalary + overtimePay
   - ✅ Mandatory Deductions: SSS, PhilHealth, Pag-IBIG, Tax applied
   - ✅ Cash Advance: ₱1,100 deducted
   - ✅ Net Salary: grossSalary - totalDeductions

6. **Process Payroll**
   - ✅ Status: Draft → Processed → Approved → Paid

7. **Verify Cash Advance Balance**
   - ✅ Outstanding balance: ₱0 (fully paid)
   - ✅ Status: Fully Paid

8. **Check YTD**
   - ✅ YTD updated with net salary

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue 1: Migration Script Not Running**
**Solution:**
```bash
# Make sure you're in the correct directory
cd employee/payroll-backend
node migrations/migrateEmployees.js
```

### **Issue 2: "Cannot find module" Error**
**Solution:**
```bash
# Restart the backend server
cd employee/payroll-backend
npm start
```

### **Issue 3: Sunday Cutoff Validation Failing**
**Solution:**
- End date must be a Sunday
- Use date picker or calculate: `getNextSunday(new Date())`
- Example Sunday dates: Oct 13, Oct 20, Oct 27, 2025

### **Issue 4: Cash Advance Limit Not Working**
**Solution:**
- Check if you're using the updated Deduction model
- Verify amount is a number, not string
- Maximum: 1100 (not 1000)

### **Issue 5: Deductions Not Calculating**
**Solution:**
- Seed default deductions first
- Check deduction `isActive = true`
- Verify `effectiveDate <= currentDate`
- Check `applicableTo` matches employee type

---

## 📊 SAMPLE TEST DATA

### **Employee Data:**
```json
{
  "firstName": "Maria",
  "lastName": "Santos",
  "email": "maria.santos@example.com",
  "contactNumber": "09181234567",
  "position": "Senior Landscaper",
  "hireDate": "2025-01-15",
  "employmentType": "Regular",
  "dailyRate": 550,
  "hourlyRate": 68.75,
  "overtimeRate": 85.94
}
```

### **Cash Advance Request:**
```json
{
  "employee": "EMPLOYEE_ID",
  "amount": 1100,
  "purpose": "Emergency Medical",
  "notes": "Hospital bill payment"
}
```

### **Payroll Calculation Request:**
```json
{
  "startDate": "2025-10-06",
  "endDate": "2025-10-12"
}
```

---

## ✅ SUCCESS CRITERIA

After testing, verify:
- [ ] Employees can be created with salary rates
- [ ] Cash advance limit is ₱1,100
- [ ] Cash advance approval workflow works
- [ ] Mandatory deductions are calculated correctly
- [ ] Payroll calculation includes all components
- [ ] Sunday cutoff is enforced
- [ ] YTD tracking works
- [ ] Cash advance balance is deducted from payroll
- [ ] All statuses update correctly
- [ ] No console errors
- [ ] No terminal errors

---

## 🎉 TESTING COMPLETE

Once all tests pass:
1. ✅ Mark testing as complete
2. ✅ Document any issues found
3. ✅ Proceed to Phase 2 or production deployment

**Happy Testing!** 🚀
