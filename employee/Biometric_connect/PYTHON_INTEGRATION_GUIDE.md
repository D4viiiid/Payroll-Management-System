# 🐍 PYTHON SCANNER INTEGRATION GUIDE
**Phase 2 Enhanced Attendance Validation**  
**Biometric Scanner → Node.js Backend Integration**

---

## 📋 OVERVIEW

This guide explains how to integrate the Phase 2 enhanced attendance calculator with the existing Python biometric scanner scripts.

### New API Endpoints Available

1. **`POST /api/attendance/validate-timein`** - Real-time validation when employee scans
2. **`POST /api/attendance/calculate`** - Full calculation for completed attendance records

---

## 🔌 API ENDPOINT 1: Real-Time Time-In Validation

### Purpose
Call this immediately when an employee scans their fingerprint for time-in to give them instant feedback about their attendance status.

### Endpoint
```
POST http://localhost:5000/api/attendance/validate-timein
```

### Request Body
```python
import requests
from datetime import datetime

# Get current time and date
now = datetime.now()
time_in = now.strftime('%H:%M:%S')  # e.g., "08:30:00"
date = now.strftime('%Y-%m-%d')     # e.g., "2025-10-14"

# Make request
response = requests.post('http://localhost:5000/api/attendance/validate-timein', json={
    'timeIn': time_in,
    'date': date,
    'employeeId': employee_id  # Optional but recommended
})

data = response.json()
```

### Response Format
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "status": "On Time",
    "message": "Good morning! Time-in recorded successfully.",
    "dayType": "Full Day",
    "expectedPay": "Full day salary",
    "timeIn": "08:30:00",
    "date": "2025-10-14",
    "employeeInfo": {
      "dailyRate": 550,
      "expectedFullDayPay": 550,
      "expectedHalfDayPay": 275
    }
  }
}
```

### Response - Half Day Warning
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "status": "Half Day",
    "message": "Warning: You arrived after 9:30 AM. This will be recorded as HALF DAY. You must work at least 4 hours to receive half-day pay.",
    "dayType": "Half Day (Conditional)",
    "expectedPay": "Half day salary (if 4+ hours worked)",
    "timeIn": "10:30:00",
    "date": "2025-10-14",
    "employeeInfo": {
      "dailyRate": 550,
      "expectedFullDayPay": 550,
      "expectedHalfDayPay": 275
    }
  }
}
```

---

## 🔌 API ENDPOINT 2: Full Attendance Calculation

### Purpose
Call this when you have both time-in and time-out to get complete attendance calculation.

### Endpoint
```
POST http://localhost:5000/api/attendance/calculate
```

### Request Body
```python
response = requests.post('http://localhost:5000/api/attendance/calculate', json={
    'employeeId': '12345',
    'date': '2025-10-14',
    'timeIn': '08:30:00',
    'timeOut': '17:00:00'
})

data = response.json()
```

### Response Format
```json
{
  "success": true,
  "employee": {
    "employeeId": "12345",
    "name": "Juan Dela Cruz",
    "dailyRate": 550
  },
  "calculation": {
    "dayType": "Full Day",
    "hoursWorked": "7.50",
    "timeInStatus": "On Time",
    "isValid": true,
    "reason": "Arrived on time (by 9:30 AM)",
    "overtimeHours": "0.00",
    "overtimePay": "0.00",
    "daySalary": "550.00",
    "totalPay": "550.00",
    "dailyRate": 550,
    "overtimeRate": 85.94,
    "calculatedAt": "2025-10-14T10:30:00.000Z"
  }
}
```

---

## 🔧 PYTHON IMPLEMENTATION EXAMPLES

### Example 1: attendance_gui.py Integration

```python
import tkinter as tk
from tkinter import messagebox
import requests
from datetime import datetime

class AttendanceGUI:
    def __init__(self):
        self.backend_url = "http://localhost:5000"
    
    def handle_time_in_scan(self, employee_id):
        """Called when employee scans fingerprint for time-in"""
        try:
            # Get current time
            now = datetime.now()
            time_in = now.strftime('%H:%M:%S')
            date = now.strftime('%Y-%m-%d')
            
            # Validate time-in in real-time
            response = requests.post(
                f'{self.backend_url}/api/attendance/validate-timein',
                json={
                    'timeIn': time_in,
                    'date': date,
                    'employeeId': employee_id
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                validation = data['validation']
                
                # Show status message
                status = validation['status']
                message = validation['message']
                
                if status == 'On Time':
                    # Green success message
                    messagebox.showinfo(
                        "✅ Time-In Successful",
                        f"{message}\n\nExpected Pay: Full Day (₱{validation['employeeInfo']['expectedFullDayPay']})"
                    )
                    self.show_success_animation()
                    
                elif status == 'Half Day':
                    # Yellow warning message
                    messagebox.showwarning(
                        "⚠️ Half Day Warning",
                        f"{message}\n\nExpected Pay: Half Day (₱{validation['employeeInfo']['expectedHalfDayPay']})"
                    )
                    self.show_warning_animation()
                
                # Record the actual attendance (existing logic)
                self.record_attendance(employee_id, time_in, date)
                
            else:
                messagebox.showerror("Error", "Failed to validate time-in")
                
        except requests.exceptions.RequestException as e:
            print(f"Error validating time-in: {e}")
            # Fall back to recording without validation
            self.record_attendance(employee_id, time_in, date)
    
    def handle_time_out_scan(self, employee_id):
        """Called when employee scans fingerprint for time-out"""
        try:
            # Get today's attendance record
            attendance = self.get_todays_attendance(employee_id)
            
            if not attendance:
                messagebox.showerror("Error", "No time-in record found for today")
                return
            
            now = datetime.now()
            time_out = now.strftime('%H:%M:%S')
            date = now.strftime('%Y-%m-%d')
            
            # Calculate full attendance
            response = requests.post(
                f'{self.backend_url}/api/attendance/calculate',
                json={
                    'employeeId': employee_id,
                    'date': date,
                    'timeIn': attendance['timeIn'],
                    'timeOut': time_out
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                calc = data['calculation']
                
                # Show detailed summary
                summary = f"""
Time-Out Recorded Successfully!

Day Type: {calc['dayType']}
Hours Worked: {calc['hoursWorked']} hours
Overtime: {calc['overtimeHours']} hours

Basic Salary: ₱{calc['daySalary']}
Overtime Pay: ₱{calc['overtimePay']}
Total Pay: ₱{calc['totalPay']}

{calc['reason']}
                """
                messagebox.showinfo("✅ Time-Out Summary", summary.strip())
                
                # Update attendance record with calculations
                self.update_attendance_with_calculations(attendance['_id'], calc)
                
            else:
                messagebox.showerror("Error", "Failed to calculate attendance")
                
        except requests.exceptions.RequestException as e:
            print(f"Error calculating attendance: {e}")
            messagebox.showerror("Error", f"Connection error: {e}")
```

---

### Example 2: Display Status on Scanner LCD/Screen

```python
def show_time_in_status(self, validation):
    """Display time-in status on device screen"""
    status = validation['status']
    
    if status == 'On Time':
        self.display_message(
            "✅ ON TIME",
            "Full Day Credited",
            color="GREEN"
        )
    elif status == 'Half Day':
        self.display_message(
            "⚠️ LATE ARRIVAL",
            "Half Day (4hrs min)",
            color="YELLOW"
        )
    else:
        self.display_message(
            "❌ ERROR",
            "Contact Admin",
            color="RED"
        )

def display_message(self, title, subtitle, color):
    """Display message on scanner screen"""
    # Your device-specific display code here
    print(f"[{color}] {title}: {subtitle}")
```

---

### Example 3: Complete Integration Example

```python
#!/usr/bin/env python3
"""
Enhanced Biometric Scanner with Phase 2 Integration
"""

import requests
from datetime import datetime
from pyzkfp import ZKFP2

class EnhancedBiometricScanner:
    def __init__(self):
        self.backend_url = "http://localhost:5000"
        self.zkfp2 = ZKFP2()
    
    def process_fingerprint_scan(self):
        """Main scan processing with Phase 2 validation"""
        print("📱 Place finger on scanner...")
        
        # Capture fingerprint (your existing code)
        fingerprint_data = self.capture_fingerprint()
        
        # Match fingerprint to employee (your existing code)
        employee = self.match_fingerprint(fingerprint_data)
        
        if not employee:
            print("❌ Fingerprint not recognized")
            return
        
        employee_id = employee['employeeId']
        print(f"✅ Recognized: {employee['firstName']} {employee['lastName']}")
        
        # Check if time-in or time-out
        attendance_today = self.get_todays_attendance(employee_id)
        
        if not attendance_today or not attendance_today.get('timeIn'):
            # TIME-IN FLOW
            self.process_time_in(employee_id)
        elif not attendance_today.get('timeOut'):
            # TIME-OUT FLOW
            self.process_time_out(employee_id, attendance_today)
        else:
            print("⚠️ Already completed attendance for today")
    
    def process_time_in(self, employee_id):
        """Process time-in with real-time validation"""
        now = datetime.now()
        time_in = now.strftime('%H:%M:%S')
        date = now.strftime('%Y-%m-%d')
        
        print(f"⏰ Time-In: {time_in}")
        
        try:
            # Real-time validation
            response = requests.post(
                f'{self.backend_url}/api/attendance/validate-timein',
                json={
                    'timeIn': time_in,
                    'date': date,
                    'employeeId': employee_id
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                validation = data['validation']
                
                print(f"\n{validation['message']}\n")
                
                # Visual feedback
                if validation['status'] == 'On Time':
                    print("✅ STATUS: FULL DAY")
                    print(f"💰 Expected Pay: ₱{validation['employeeInfo']['expectedFullDayPay']}")
                else:
                    print("⚠️ STATUS: HALF DAY (Must work 4+ hours)")
                    print(f"💰 Expected Pay: ₱{validation['employeeInfo']['expectedHalfDayPay']}")
                
                # Record attendance (your existing endpoint)
                self.record_attendance(employee_id, time_in, None, date)
                
        except Exception as e:
            print(f"⚠️ Validation unavailable: {e}")
            # Fall back to simple recording
            self.record_attendance(employee_id, time_in, None, date)
    
    def process_time_out(self, employee_id, attendance_record):
        """Process time-out with full calculation"""
        now = datetime.now()
        time_out = now.strftime('%H:%M:%S')
        date = now.strftime('%Y-%m-%d')
        
        print(f"⏰ Time-Out: {time_out}")
        
        try:
            # Calculate complete attendance
            response = requests.post(
                f'{self.backend_url}/api/attendance/calculate',
                json={
                    'employeeId': employee_id,
                    'date': date,
                    'timeIn': attendance_record['timeIn'],
                    'timeOut': time_out
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                calc = data['calculation']
                
                print("\n" + "="*50)
                print("📊 ATTENDANCE SUMMARY")
                print("="*50)
                print(f"Day Type: {calc['dayType']}")
                print(f"Hours Worked: {calc['hoursWorked']} hours")
                print(f"Overtime: {calc['overtimeHours']} hours")
                print(f"Basic Salary: ₱{calc['daySalary']}")
                print(f"Overtime Pay: ₱{calc['overtimePay']}")
                print(f"Total Pay: ₱{calc['totalPay']}")
                print("="*50)
                print(f"\n{calc['reason']}\n")
                
                # Update attendance record
                self.update_attendance(attendance_record['_id'], time_out, calc)
                
        except Exception as e:
            print(f"⚠️ Calculation unavailable: {e}")
            # Fall back to simple time-out recording
            self.update_attendance(attendance_record['_id'], time_out, None)

if __name__ == '__main__':
    scanner = EnhancedBiometricScanner()
    
    print("🔐 Biometric Scanner Ready")
    print("📅 Enhanced with Phase 2 Attendance Validation")
    print("-" * 50)
    
    while True:
        scanner.process_fingerprint_scan()
        print("\nReady for next scan...")
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Step 1: Update Time-In Logic
- [ ] Add call to `/api/attendance/validate-timein`
- [ ] Display status message (On Time / Half Day warning)
- [ ] Show expected pay amount
- [ ] Add visual feedback (colors, sounds)

### Step 2: Update Time-Out Logic
- [ ] Add call to `/api/attendance/calculate`
- [ ] Display complete summary
- [ ] Show hours worked and overtime
- [ ] Show calculated pay

### Step 3: Error Handling
- [ ] Add try-except blocks for network errors
- [ ] Fall back to basic recording if API unavailable
- [ ] Add timeout handling (5 seconds recommended)
- [ ] Log errors for debugging

### Step 4: User Experience
- [ ] Clear success messages for on-time arrivals
- [ ] Warning messages for late arrivals
- [ ] Detailed summary on time-out
- [ ] Sound/visual feedback

### Step 5: Testing
- [ ] Test on-time arrival (8:00-9:30 AM)
- [ ] Test late arrival (after 9:30 AM)
- [ ] Test time-out calculation
- [ ] Test network failure scenarios
- [ ] Test with real biometric device

---

## 🎯 BUSINESS RULES REMINDER

### Time-In Rules
- **8:00 AM - 9:30 AM** → Full Day (₱550)
- **9:31 AM onwards** → Half Day (₱275) *if 4+ hours worked*
- **Less than 4 hours** → Incomplete (₱0)

### Lunch Break
- **12:00 PM - 1:00 PM** → Excluded from hours calculation

### Overtime
- **Hours beyond 8** → Overtime rate (₱85.94/hour)

---

## 🐛 TROUBLESHOOTING

### Issue: "Connection refused"
**Solution:** Ensure Node.js backend is running on port 5000

### Issue: "Employee not found"
**Solution:** Check employeeId format matches database

### Issue: Incorrect calculations
**Solution:** Verify time format is "HH:MM:SS" and date is "YYYY-MM-DD"

### Issue: Validation always returns error
**Solution:** Check request body has required fields (timeIn, date)

---

## 📞 API ERROR RESPONSES

### 400 Bad Request
```json
{
  "success": false,
  "error": "timeIn and date are required",
  "message": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Employee not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Database connection failed",
  "message": "Failed to validate time-in"
}
```

---

## ✅ TESTING THE ENDPOINTS

### Test Time-In Validation (Postman/curl)
```bash
curl -X POST http://localhost:5000/api/attendance/validate-timein \
  -H "Content-Type: application/json" \
  -d '{
    "timeIn": "08:30:00",
    "date": "2025-10-14",
    "employeeId": "12345"
  }'
```

### Test Attendance Calculation
```bash
curl -X POST http://localhost:5000/api/attendance/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "12345",
    "date": "2025-10-14",
    "timeIn": "08:30:00",
    "timeOut": "17:00:00"
  }'
```

---

**Status:** ✅ **READY FOR PYTHON INTEGRATION**  
**API Endpoints:** 2 new endpoints added  
**Backward Compatible:** YES (existing endpoints still work)  
**Documentation:** Complete

**Next:** Implement in your Python scanner files and test! 🚀
