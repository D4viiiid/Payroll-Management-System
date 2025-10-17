import requests
import json

def test_attendance_integration():
    """Test the complete attendance integration flow"""
    
    # Test 1: Check if backend is running
    print("🔍 Testing backend connection...")
    try:
        response = requests.get("http://localhost:5000/api/attendance", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return
    
    # Test 2: Get employees with fingerprint templates
    print("\n🔍 Getting employees with fingerprint templates...")
    try:
        response = requests.get("http://localhost:5000/api/employees")
        employees = response.json()
        
        employees_with_fingerprints = [emp for emp in employees if emp.get('fingerprintTemplate') and emp['fingerprintTemplate'] != 'ENROLLED']
        
        if employees_with_fingerprints:
            test_employee = employees_with_fingerprints[0]
            print(f"✅ Found employee: {test_employee['firstName']} {test_employee['lastName']} ({test_employee['employeeId']})")
            print(f"   Fingerprint template length: {len(test_employee['fingerprintTemplate'])}")
        else:
            print("❌ No employees with fingerprint templates found")
            return
            
    except Exception as e:
        print(f"❌ Failed to get employees: {e}")
        return
    
    # Test 3: Test attendance recording
    print(f"\n🔍 Testing attendance recording for {test_employee['firstName']}...")
    try:
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
            print("✅ Attendance recorded successfully!")
            print(f"   Message: {result.get('message')}")
            print(f"   Status: {result.get('status')}")
            print(f"   Employee: {result.get('employee', {}).get('name')}")
            print(f"   Time: {result.get('attendance', {}).get('time')}")
            print(f"   Attendance Status: {result.get('attendance', {}).get('attendanceStatus')}")
        else:
            error_data = response.json()
            print(f"❌ Attendance recording failed: {error_data.get('error')}")
            
    except Exception as e:
        print(f"❌ Attendance recording error: {e}")
    
    # Test 4: Check attendance records
    print("\n🔍 Checking attendance records...")
    try:
        response = requests.get("http://localhost:5000/api/attendance")
        attendance_records = response.json()
        
        recent_records = [record for record in attendance_records if record.get('employeeId') == test_employee['employeeId']]
        
        if recent_records:
            latest_record = recent_records[0]
            print(f"✅ Found {len(recent_records)} attendance records for {test_employee['firstName']}")
            print(f"   Latest: {latest_record.get('status')} at {latest_record.get('time')}")
        else:
            print("❌ No attendance records found")
            
    except Exception as e:
        print(f"❌ Failed to get attendance records: {e}")

if __name__ == "__main__":
    test_attendance_integration()
