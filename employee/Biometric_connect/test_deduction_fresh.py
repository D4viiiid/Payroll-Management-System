import requests
import json
import time

def test_deduction_with_fresh_employee():
    print("🔍 Testing deduction creation with fresh employee...")
    
    # Create a new employee with a salary
    employee_data = {
        "firstName": "Deduction",
        "lastName": "Test",
        "email": f"deduction{int(time.time())}@example.com",
        "contactNumber": "1234567890",
        "status": "regular",
        "hireDate": "2024-01-01",
        "salary": 25000,  # Set a salary
        "username": f"deduction{int(time.time())}",
        "password": "testpass"
    }
    
    try:
        # Create employee
        response = requests.post('http://localhost:5000/api/employees', json=employee_data)
        if response.status_code == 201:
            employee = response.json()
            print(f"✅ Created test employee: {employee.get('firstName')} {employee.get('lastName')}")
            print(f"📋 Employee ID: {employee.get('employeeId')}")
            
            # Add fingerprint template
            fake_template = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200" + "0" * 3996
            
            fingerprint_data = {
                "fingerprintTemplate": fake_template
            }
            
            fingerprint_response = requests.post(f'http://localhost:5000/api/employees/{employee.get("_id")}/fingerprint', 
                                               json=fingerprint_data)
            if fingerprint_response.status_code == 200:
                print("✅ Added fingerprint template to employee")
                
                # Test attendance recording (this should create a deduction since it's after 9:30 AM)
                attendance_data = {
                    "fingerprint_template": fake_template
                }
                
                print("📤 Testing attendance recording with Half Day scenario...")
                attendance_response = requests.post('http://localhost:5000/api/attendance/record', 
                                                   json=attendance_data)
                
                if attendance_response.status_code == 200:
                    result = attendance_response.json()
                    print("✅ SUCCESS! Attendance recorded!")
                    print(f"📊 Result: {result}")
                    
                    # Check if deduction was created
                    deductions_response = requests.get('http://localhost:5000/api/deductions')
                    if deductions_response.status_code == 200:
                        deductions = deductions_response.json()
                        employee_deductions = [d for d in deductions if d.get('employee') == employee.get('_id')]
                        print(f"📋 Found {len(employee_deductions)} deductions for this employee")
                        for deduction in employee_deductions:
                            print(f"   - {deduction.get('name')}: ${deduction.get('amount')}")
                            
                        if len(employee_deductions) > 0:
                            print("🎉 SUCCESS: Deduction was created!")
                        else:
                            print("❌ FAILED: No deduction was created")
                else:
                    print(f"❌ Attendance failed: {attendance_response.status_code}")
                    print(f"📝 Error: {attendance_response.text}")
            else:
                print(f"❌ Failed to add fingerprint: {fingerprint_response.status_code}")
        else:
            print(f"❌ Failed to create employee: {response.status_code}")
            print(f"📝 Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_deduction_with_fresh_employee()
