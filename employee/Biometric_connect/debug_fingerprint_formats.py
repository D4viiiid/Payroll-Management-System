import requests
import json

def debug_fingerprint_formats():
    """Debug fingerprint template formats between registration and attendance"""
    
    print("🔍 Debugging fingerprint template formats...")
    
    # Get employees with fingerprint templates
    try:
        response = requests.get("http://localhost:5000/api/employees")
        employees = response.json()
        
        employees_with_fingerprints = [emp for emp in employees if emp.get('fingerprintTemplate') and emp['fingerprintTemplate'] != 'ENROLLED']
        
        if employees_with_fingerprints:
            test_employee = employees_with_fingerprints[0]
            print(f"✅ Found employee: {test_employee['firstName']} {test_employee['lastName']}")
            print(f"   Employee ID: {test_employee['employeeId']}")
            print(f"   Template length: {len(test_employee['fingerprintTemplate'])}")
            print(f"   Template type: {type(test_employee['fingerprintTemplate'])}")
            print(f"   Template first 100 chars: {test_employee['fingerprintTemplate'][:100]}...")
            print(f"   Template last 100 chars: ...{test_employee['fingerprintTemplate'][-100:]}")
            
            # Test if this template works with attendance
            print(f"\n🔍 Testing attendance with this template...")
            payload = {
                "fingerprint_template": test_employee['fingerprintTemplate']
            }
            
            response = requests.post(
                "http://localhost:5000/api/attendance/record",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Attendance recording successful!")
                print(f"   Message: {result.get('message')}")
            else:
                error_data = response.json()
                print(f"❌ Attendance recording failed: {error_data.get('error')}")
                
        else:
            print("❌ No employees with fingerprint templates found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_fingerprint_formats()
