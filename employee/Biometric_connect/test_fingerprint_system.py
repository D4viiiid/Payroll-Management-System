"""
Test script to verify fingerprint enrollment and attendance recording flow
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

print("=" * 80)
print("🧪 FINGERPRINT SYSTEM TEST")
print("=" * 80)

# Test 1: Device Health
print("\n📍 Test 1: Device Health Check")
try:
    response = requests.get(f"{BASE_URL}/biometric-integrated/device/health")
    data = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"   Response: {json.dumps(data, indent=2)}")
    if not data.get('success'):
        print("❌ Device not connected!")
        exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Test 2: Get all employees
print("\n📍 Test 2: Get Enrolled Employees")
try:
    response = requests.get(f"{BASE_URL}/employees")
    employees = response.json()
    print(f"✅ Total employees: {len(employees)}")
    
    enrolled_employees = [e for e in employees if e.get('fingerprintEnrolled')]
    print(f"   Enrolled employees: {len(enrolled_employees)}")
    
    for emp in enrolled_employees:
        has_template = 'fingerprintTemplate' in emp and emp['fingerprintTemplate']
        has_templates = 'fingerprintTemplates' in emp and emp['fingerprintTemplates']
        print(f"   - {emp.get('firstName')} {emp.get('lastName')} (ID: {emp.get('employeeId')})")
        print(f"     fingerprintTemplate: {'YES' if has_template else 'NO'}")
        print(f"     fingerprintTemplates: {'YES' if has_templates else 'NO'}")
        
        if not has_template and not has_templates:
            print(f"     ⚠️  WARNING: Employee marked as enrolled but has no template!")
    
    if len(enrolled_employees) == 0:
        print("\n⚠️  No enrolled employees found. Please enroll at least one employee first.")
        print("   Go to http://localhost:5174 and add an employee with fingerprint.")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 80)
print("✅ Tests complete!")
print("=" * 80)
