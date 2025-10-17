import requests

def test_with_real_template():
    try:
        # Get employees to find a real template
        print("Getting employees...")
        response = requests.get("http://localhost:5000/api/employees")
        employees = response.json()
        
        # Find employee with fingerprint template
        employee_with_template = None
        for emp in employees:
            if emp.get('fingerprintTemplate') and emp['fingerprintTemplate'] != 'ENROLLED' and len(emp['fingerprintTemplate']) > 100:
                employee_with_template = emp
                break
        
        if employee_with_template:
            print(f"Found employee: {employee_with_template['employeeId']}")
            print(f"Template length: {len(employee_with_template['fingerprintTemplate'])}")
            
            # Test duplicate check
            duplicate_data = {
                "fingerprintTemplate": employee_with_template['fingerprintTemplate'],
                "excludeEmployeeId": None
            }
            
            response = requests.post(
                "http://localhost:5000/api/fingerprint/check-duplicate",
                json=duplicate_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            print(f"Duplicate check response: {response.status_code}")
            result = response.json()
            print(f"Response: {result}")
            
            if result.get('duplicateFound'):
                print("✅ DUPLICATE DETECTED!")
            else:
                print("❌ NO DUPLICATE DETECTED")
        else:
            print("No employee with fingerprint template found")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_with_real_template()
