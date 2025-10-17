import requests
import json
import time
import random
import string

def cleanup_test_employees():
    print("🧹 Cleaning up test employees...")
    
    try:
        # Get all employees
        response = requests.get('http://localhost:5000/api/employees')
        if response.status_code == 200:
            employees = response.json()
            
            # Find test employees (those with test names or matching template pattern)
            test_employees = []
            for emp in employees:
                name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}".lower()
                if ('test' in name or 'debug' in name or 'deduction' in name):
                    test_employees.append(emp)
            
            print(f"📊 Found {len(test_employees)} test employees to clean up")
            
            for emp in test_employees:
                emp_id = emp.get('_id')
                emp_name = f"{emp.get('firstName')} {emp.get('lastName')}"
                print(f"🗑️  Deleting: {emp_name} ({emp.get('employeeId')})")
                
                # Delete employee
                delete_response = requests.delete(f'http://localhost:5000/api/employees/{emp_id}')
                if delete_response.status_code == 200:
                    print(f"✅ Deleted: {emp_name}")
                else:
                    print(f"❌ Failed to delete {emp_name}: {delete_response.status_code}")
        else:
            print(f"❌ Failed to fetch employees: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

def generate_unique_fingerprint_template():
    """Generate a truly unique fingerprint template"""
    # Create a unique identifier using timestamp + random string
    timestamp = str(int(time.time() * 1000))  # milliseconds for uniqueness
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    unique_id = timestamp + random_str
    
    # Create a unique template by modifying the base template
    base_template = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200"
    
    # Replace part of the template with our unique identifier
    unique_part = unique_id.ljust(100, '0')  # Pad to 100 chars
    unique_template = base_template + unique_part + "0" * (4096 - len(base_template) - len(unique_part))
    
    return unique_template

def test_fresh_employee():
    print("🔍 Testing with truly fresh employee...")
    
    # Generate unique template
    unique_template = generate_unique_fingerprint_template()
    print(f"📋 Generated unique template (first 50 chars): {unique_template[:50]}")
    
    # Create unique employee data
    timestamp = str(int(time.time()))
    unique_username = f"fresh_test_{timestamp}"
    
    employee_data = {
        "firstName": "Fresh",
        "lastName": "Test",
        "email": f"{unique_username}@example.com",
        "contactNumber": "1234567890",
        "status": "regular",
        "hireDate": "2024-01-01",
        "salary": 25000,  # Set a clear salary
        "username": unique_username,
        "password": "testpass"
    }
    
    test_employee_id = None
    test_employee_mongo_id = None

    try:
        # Create employee
        print("📤 Creating fresh employee...")
        response = requests.post('http://localhost:5000/api/employees', json=employee_data)
        if response.status_code == 201:
            employee = response.json()
            test_employee_id = employee.get('employeeId')
            test_employee_mongo_id = employee.get('_id')
            print(f"✅ Created employee: {employee.get('firstName')} {employee.get('lastName')}")
            print(f"📋 Employee ID: {test_employee_id}")
            print(f"📋 MongoDB ID: {test_employee_mongo_id}")
            print(f"💰 Salary: {employee.get('salary')}")
            
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
            requests.delete(f'http://localhost:5000/api/employees/{test_employee_mongo_id}')
            print("✅ Cleaned up test employee.")

if __name__ == "__main__":
    cleanup_test_employees()
    print("\n" + "="*50 + "\n")
    test_fresh_employee()
