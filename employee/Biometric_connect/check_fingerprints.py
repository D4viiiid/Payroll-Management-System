from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb+srv://jakemesina21:Brokenrecord_6@cluster0.h11oj.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0')
db = client['employee_db']

# Get all employees
employees = list(db.employees.find({}, {
    'firstName': 1, 
    'lastName': 1, 
    'employeeId': 1,
    'fingerprintEnrolled': 1, 
    'fingerprintTemplate': 1,
    'fingerprintTemplates': 1,
    'biometricStatus': 1
}))

print(f'\n=== TOTAL EMPLOYEES: {len(employees)} ===\n')

for emp in employees:
    has_template = 'fingerprintTemplate' in emp and emp['fingerprintTemplate'] is not None
    has_templates_array = 'fingerprintTemplates' in emp and emp['fingerprintTemplates'] is not None and len(emp['fingerprintTemplates']) > 0
    
    print(f"Employee: {emp['firstName']} {emp['lastName']} ({emp.get('employeeId', 'NO-ID')})")
    print(f"  - fingerprintEnrolled: {emp.get('fingerprintEnrolled', False)}")
    print(f"  - biometricStatus: {emp.get('biometricStatus', 'N/A')}")
    print(f"  - Has fingerprintTemplate: {has_template}")
    print(f"  - Has fingerprintTemplates array: {has_templates_array}")
    
    if has_template:
        template_len = len(emp['fingerprintTemplate']) if emp['fingerprintTemplate'] else 0
        print(f"  - Template length: {template_len}")
    
    print()

client.close()
