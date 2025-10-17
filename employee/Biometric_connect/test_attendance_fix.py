#!/usr/bin/env python3
"""
QUICK FIX: Test attendance with the same finger used for registration
"""

import requests
import json

def test_attendance_with_registered_finger():
    print("🔍 QUICK FIX: Testing attendance recognition...")
    
    # Get the latest registered employee's fingerprint template
    try:
        response = requests.get('http://localhost:5000/api/employees')
        if response.status_code == 200:
            employees = response.json()
            
            # Find employees with fingerprint templates
            fingerprint_employees = [emp for emp in employees if emp.get('fingerprintTemplate')]
            
            if fingerprint_employees:
                # Get the most recent one (ken vergar)
                latest_employee = None
                for emp in fingerprint_employees:
                    if emp.get('firstName') == 'ken' and emp.get('lastName') == 'vergar':
                        latest_employee = emp
                        break
                
                if latest_employee:
                    print(f"✅ Found registered employee: {latest_employee.get('firstName')} {latest_employee.get('lastName')}")
                    print(f"📋 Employee ID: {latest_employee.get('employeeId')}")
                    
                    # Test attendance with their stored template
                    template = latest_employee.get('fingerprintTemplate')
                    print(f"🔍 Template length: {len(template)}")
                    
                    # Send attendance request
                    attendance_data = {
                        "fingerprint_template": template
                    }
                    
                    print("📤 Testing attendance recording...")
                    response = requests.post('http://localhost:5000/api/attendance/record', 
                                           json=attendance_data)
                    
                    if response.status_code == 200:
                        result = response.json()
                        print("✅ SUCCESS! Attendance recorded!")
                        print(f"📊 Result: {result}")
                    else:
                        print(f"❌ Failed: {response.status_code}")
                        print(f"📝 Error: {response.text}")
                else:
                    print("❌ Could not find ken vergar in database")
            else:
                print("❌ No employees with fingerprints found")
        else:
            print(f"❌ Failed to get employees: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_attendance_with_registered_finger()
