import requests
import json
import time
import random
import string

def test_fingerprint_matching_debug():
    print("🔍 Testing fingerprint matching debug...")
    
    # Generate completely unique template
    random_bytes = [random.randint(0, 255) for _ in range(2048)]
    unique_template = ''.join([f'{b:02x}' for b in random_bytes])
    print(f"📋 Generated unique template (first 50 chars): {unique_template[:50]}")
    print(f"📋 Template length: {len(unique_template)}")
    
    # Create unique employee data
    timestamp = str(int(time.time()))
    unique_username = f"debug_test_{timestamp}"
    
    employee_data = {
        "firstName": "Debug",
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
        print("📤 Creating debug employee...")
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
                
                # Now test the fingerprint matching by making a request and checking the server logs
                from datetime import datetime
                now = datetime.now().replace(hour=13, minute=0, second=0, microsecond=0)  # 1:00 PM
                attendance_payload = {
                    "fingerprint_template": unique_template,
                    "device_id": "test_device",
                    "timestamp": now.isoformat()
                }
                
                print("📤 Testing attendance recording with debug...")
                print(f"📤 Payload: {json.dumps(attendance_payload, indent=2)}")
                
                attendance_response = requests.post('http://localhost:5000/api/attendance/record', json=attendance_payload)
                
                print(f"📤 Response status: {attendance_response.status_code}")
                print(f"📤 Response: {attendance_response.text}")
                
                if attendance_response.status_code == 200:
                    result = attendance_response.json()
                    print("✅ SUCCESS! Attendance recorded!")
                    print(f"📊 Result: {result}")
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
    test_fingerprint_matching_debug()
