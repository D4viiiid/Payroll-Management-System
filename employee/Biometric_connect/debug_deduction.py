import requests
import json
import time

def debug_deduction_creation():
    print("🔍 Debugging deduction creation...")
    
    # Create employee
    employee_data = {
        "firstName": "Debug",
        "lastName": "Test",
        "email": f"debug{int(time.time())}@example.com",
        "contactNumber": "1234567890",
        "status": "regular",
        "hireDate": "2024-01-01",
        "salary": 25000,
        "username": f"debug{int(time.time())}",
        "password": "testpass"
    }
    
    try:
        response = requests.post('http://localhost:5000/api/employees', json=employee_data)
        if response.status_code == 201:
            employee = response.json()
            print(f"✅ Created employee: {employee.get('firstName')} {employee.get('lastName')}")
            print(f"📋 Employee ID: {employee.get('employeeId')}")
            print(f"📋 MongoDB ID: {employee.get('_id')}")
            print(f"💰 Salary: {employee.get('salary')}")
            
            # Add fingerprint
            fake_template = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200" + "0" * 3996
            
            fingerprint_data = {
                "fingerprintTemplate": fake_template
            }
            
            fingerprint_response = requests.post(f'http://localhost:5000/api/employees/{employee.get("_id")}/fingerprint', 
                                               json=fingerprint_data)
            if fingerprint_response.status_code == 200:
                print("✅ Added fingerprint template")
                
                # Record attendance
                attendance_data = {
                    "fingerprint_template": fake_template
                }
                
                print("📤 Recording attendance...")
                attendance_response = requests.post('http://localhost:5000/api/attendance/record', 
                                                   json=attendance_data)
                
                if attendance_response.status_code == 200:
                    result = attendance_response.json()
                    print("✅ Attendance recorded successfully!")
                    print(f"📊 Result: {result}")
                    
                    # Check deductions
                    print("🔍 Checking deductions...")
                    deductions_response = requests.get('http://localhost:5000/api/deductions')
                    if deductions_response.status_code == 200:
                        deductions = deductions_response.json()
                        print(f"📋 Total deductions in system: {len(deductions)}")
                        
                        employee_deductions = [d for d in deductions if d.get('employee') == employee.get('_id')]
                        print(f"📋 Deductions for this employee: {len(employee_deductions)}")
                        
                        for deduction in employee_deductions:
                            print(f"   - {deduction.get('name')}: ${deduction.get('amount')}")
                        
                        if len(employee_deductions) == 0:
                            print("❌ No deductions found - checking all deductions...")
                            for i, deduction in enumerate(deductions[:5]):  # Show first 5
                                print(f"   Deduction {i+1}: Employee={deduction.get('employee')}, Name={deduction.get('name')}")
                    else:
                        print(f"❌ Failed to fetch deductions: {deductions_response.status_code}")
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
    debug_deduction_creation()
