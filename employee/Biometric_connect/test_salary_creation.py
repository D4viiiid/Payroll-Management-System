import requests
import json

def test_employee_creation():
    print("🔍 Testing employee creation with salary...")
    
    employee_data = {
        "firstName": "Salary",
        "lastName": "Test",
        "email": "salarytest@example.com",
        "contactNumber": "1234567890",
        "status": "regular",
        "hireDate": "2024-01-01",
        "salary": 30000,
        "username": "salarytest",
        "password": "testpass"
    }
    
    try:
        response = requests.post('http://localhost:5000/api/employees', json=employee_data)
        print(f"📤 Response status: {response.status_code}")
        print(f"📤 Response headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            employee = response.json()
            print("✅ Employee created successfully!")
            print(f"📋 Employee ID: {employee.get('employeeId')}")
            print(f"📋 MongoDB ID: {employee.get('_id')}")
            print(f"💰 Salary: {employee.get('salary')}")
            print(f"📋 Full response: {json.dumps(employee, indent=2)}")
            
            # Clean up
            emp_id = employee.get('_id')
            if emp_id:
                delete_response = requests.delete(f'http://localhost:5000/api/employees/{emp_id}')
                print(f"🧹 Cleanup status: {delete_response.status_code}")
        else:
            print(f"❌ Failed to create employee: {response.status_code}")
            print(f"📝 Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_employee_creation()
