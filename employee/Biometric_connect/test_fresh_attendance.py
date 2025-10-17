import requests
import json

def test_attendance_with_new_employee():
    print("🔍 Testing attendance with a fresh employee...")
    
    # Get employees with fingerprints
    try:
        response = requests.get('http://localhost:5000/api/employees')
        if response.status_code == 200:
            employees = response.json()
            
            # Find employees with fingerprint templates
            fingerprint_employees = [emp for emp in employees if emp.get('fingerprintTemplate')]
            
            if fingerprint_employees:
                # Try to find one without today's attendance
                for emp in fingerprint_employees:
                    print(f"🔍 Testing employee: {emp.get('firstName')} {emp.get('lastName')} ({emp.get('employeeId')})")
                    
                    # Check if they have attendance today
                    attendance_response = requests.get(f'http://localhost:5000/api/attendance/{emp.get("employeeId")}')
                    if attendance_response.status_code == 200:
                        attendance_records = attendance_response.json()
                        
                        # Check if there's a record for today
                        from datetime import datetime
                        today = datetime.now().strftime('%Y-%m-%d')
                        today_records = [r for r in attendance_records if r.get('time', '').startswith(today)]
                        
                        if not today_records:
                            print(f"✅ Found employee without today's attendance: {emp.get('firstName')} {emp.get('lastName')}")
                            
                            # Test attendance with their stored template
                            template = emp.get('fingerprintTemplate')
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
                                return True
                            else:
                                print(f"❌ Failed: {response.status_code}")
                                print(f"📝 Error: {response.text}")
                        else:
                            print(f"ℹ️  Employee {emp.get('firstName')} already has attendance today")
                    else:
                        print(f"ℹ️  Could not check attendance for {emp.get('firstName')}")
            else:
                print("❌ No employees with fingerprints found")
        else:
            print(f"❌ Failed to get employees: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    return False

if __name__ == "__main__":
    test_attendance_with_new_employee()
