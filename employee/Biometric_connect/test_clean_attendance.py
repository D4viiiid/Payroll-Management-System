import requests
import json
import time
import random
import string

def clear_attendance_records(employee_id):
    """Clear all attendance records for an employee"""
    try:
        # Get all attendance records for this employee
        response = requests.get(f'http://localhost:5000/api/attendance')
        if response.status_code == 200:
            attendance_records = response.json()
            employee_records = [record for record in attendance_records if record.get('employeeId') == employee_id]
            
            print(f"📊 Found {len(employee_records)} attendance records for employee {employee_id}")
            
            # Delete each record
            for record in employee_records:
                record_id = record.get('_id')
                if record_id:
                    delete_response = requests.delete(f'http://localhost:5000/api/attendance/{record_id}')
                    if delete_response.status_code == 200:
                        print(f"🗑️  Deleted attendance record: {record.get('status')} at {record.get('time')}")
                    else:
                        print(f"❌ Failed to delete record {record_id}: {delete_response.status_code}")
        else:
            print(f"❌ Failed to fetch attendance records: {response.status_code}")
    except Exception as e:
        print(f"❌ Error clearing attendance records: {e}")

def test_attendance_with_clean_slate():
    print("🔍 Testing attendance with completely clean slate...")
    
    # Generate completely unique template
    random_bytes = [random.randint(0, 255) for _ in range(2048)]
    unique_template = ''.join([f'{b:02x}' for b in random_bytes])
    print(f"📋 Generated unique template (first 50 chars): {unique_template[:50]}")
    print(f"📋 Template length: {len(unique_template)}")
    
    # Create unique employee data
    timestamp = str(int(time.time()))
    unique_username = f"clean_test_{timestamp}"
    
    employee_data = {
        "firstName": "Clean",
        "lastName": "Test",
        "email": f"{unique_username}@example.com",
        "contactNumber": "1234567890",
        "status": "regular",
        "hireDate": "2024-01-01",
        "salary": 30000,
        "username": unique_username,
        "password": "testpass"
    }
    
    test_employee_id = None
    test_employee_mongo_id = None

    try:
        # Create employee
        print("📤 Creating clean test employee...")
        response = requests.post('http://localhost:5000/api/employees', json=employee_data)
        if response.status_code == 201:
            employee = response.json()
            test_employee_id = employee.get('employeeId')
            test_employee_mongo_id = employee.get('_id')
            print(f"✅ Created employee: {employee.get('firstName')} {employee.get('lastName')}")
            print(f"📋 Employee ID: {test_employee_id}")
            print(f"📋 MongoDB ID: {test_employee_mongo_id}")
            print(f"💰 Salary: {employee.get('salary')}")
            
            # Clear any existing attendance records for this employee
            print("🧹 Clearing any existing attendance records...")
            clear_attendance_records(test_employee_id)
            
            # Add unique fingerprint template
            print("📤 Adding unique fingerprint template...")
            fingerprint_data = {
                "fingerprintTemplate": unique_template
            }
            
            fingerprint_response = requests.post(f'http://localhost:5000/api/employees/{test_employee_mongo_id}/fingerprint', 
                                               json=fingerprint_data)
            if fingerprint_response.status_code == 200:
                print("✅ Added unique fingerprint template")
                
                # Test attendance recording
                from datetime import datetime
                now = datetime.now().replace(hour=13, minute=0, second=0, microsecond=0)  # 1:00 PM
                attendance_payload = {
                    "fingerprint_template": unique_template,
                    "device_id": "test_device",
                    "timestamp": now.isoformat()
                }
                
                print("📤 Testing attendance recording...")
                attendance_response = requests.post('http://localhost:5000/api/attendance/record', json=attendance_payload)
                
                if attendance_response.status_code == 200:
                    result = attendance_response.json()
                    print("✅ SUCCESS! Attendance recorded!")
                    print(f"📊 Result: {result}")
                    
                    # Check deductions
                    deductions_response = requests.get('http://localhost:5000/api/deductions')
                    if deductions_response.status_code == 200:
                        deductions = deductions_response.json()
                        employee_deductions = [d for d in deductions if d.get('employee') == test_employee_mongo_id]
                        print(f"📋 Found {len(employee_deductions)} deductions for this employee")
                        for deduction in employee_deductions:
                            print(f"   - {deduction.get('name')}: ${deduction.get('amount')}")
                else:
                    print(f"❌ Attendance failed: {attendance_response.status_code}")
                    print(f"📝 Error: {attendance_response.json()}")
            else:
                print(f"❌ Failed to add fingerprint: {fingerprint_response.status_code}")
        else:
            print(f"❌ Failed to create employee: {response.status_code}")
            print(f"📝 Error: {response.json()}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        # Clean up
        if test_employee_id:
            print(f"🧹 Cleaning up test employee {test_employee_id}...")
            # Clear attendance records first
            clear_attendance_records(test_employee_id)
            # Then delete employee
            requests.delete(f'http://localhost:5000/api/employees/{test_employee_mongo_id}')
            print("✅ Cleaned up test employee.")

if __name__ == "__main__":
    test_attendance_with_clean_slate()
