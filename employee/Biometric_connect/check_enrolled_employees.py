import os
from pymongo import MongoClient

# Set MongoDB URI
os.environ['MONGODB_URI'] = 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0'

client = MongoClient(os.environ['MONGODB_URI'])
db = client.employee_db

print("=" * 60)
print("EMPLOYEE FINGERPRINT STATUS")
print("=" * 60)

employees = db.employees.find({})

total = 0
enrolled = 0

for emp in employees:
    total += 1
    has_fingerprint = emp.get('fingerprintEnrolled', False)
    has_template = bool(emp.get('fingerprintTemplate'))
    
    status = "✅ ENROLLED" if (has_fingerprint and has_template) else "❌ NOT ENROLLED"
    
    print(f"{emp.get('employeeId', 'N/A'):10} | {emp.get('firstName', '')} {emp.get('lastName', ''):15} | {status}")
    
    if has_fingerprint and has_template:
        enrolled += 1

print("=" * 60)
print(f"Total Employees: {total}")
print(f"Enrolled: {enrolled}")
print(f"Not Enrolled: {total - enrolled}")
print("=" * 60)

if enrolled == 0:
    print("\n⚠️  WARNING: No employees have enrolled fingerprints!")
    print("   You must enroll at least one employee before testing attendance.")
    print("   Go to Employee page → Add Employee → Enroll Fingerprint")
