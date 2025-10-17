import requests
import json

def check_existing_fingerprints():
    print("🔍 Checking existing fingerprints in database...")
    
    try:
        # Get all employees
        response = requests.get('http://localhost:5000/api/employees')
        if response.status_code == 200:
            employees = response.json()
            print(f"📊 Total employees: {len(employees)}")
            
            employees_with_fingerprints = [emp for emp in employees if emp.get('fingerprintEnrolled') and emp.get('fingerprintTemplate')]
            print(f"📊 Employees with fingerprints: {len(employees_with_fingerprints)}")
            
            for emp in employees_with_fingerprints:
                template = emp.get('fingerprintTemplate', '')
                print(f"\n--- Employee {emp.get('employeeId')} ---")
                print(f"Name: {emp.get('firstName')} {emp.get('lastName')}")
                print(f"Template length: {len(template)}")
                print(f"Template first 50 chars: {template[:50]}")
                print(f"Template last 50 chars: {template[-50:]}")
                
                # Check if this template matches our test template
                test_template_start = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200"
                if template.startswith(test_template_start):
                    print("⚠️  WARNING: This template matches our test template pattern!")
        else:
            print(f"❌ Failed to fetch employees: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_existing_fingerprints()
