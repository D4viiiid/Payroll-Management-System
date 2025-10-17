import sys
import base64
from pyzkfp import ZKFP2
from pymongo import MongoClient

# Test loading templates
mongodb_uri = "mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(mongodb_uri)
db = client.employee_db

# Get employees with templates
employees = list(db.employees.find({
    "fingerprintTemplate": {"$exists": True, "$ne": None}
}).limit(5))

print(f"\n📊 Testing {len(employees)} templates\n")

# Initialize device
zkfp2 = ZKFP2()
zkfp2.Init()
zkfp2.OpenDevice(0)

db_handle = zkfp2.DBInit()
print(f"✅ DB Handle: {db_handle}\n")

loaded = 0
failed = 0

for emp in employees:
    try:
        template_b64 = emp['fingerprintTemplate']
        template_bytes = base64.b64decode(template_b64)
        
        # Try to extract numeric ID
        employee_id_str = emp.get('employeeId', str(emp['_id']))
        try:
            if employee_id_str.startswith('EMP-') or employee_id_str.startswith('EMP'):
                numeric_id = int(''.join(filter(str.isdigit, employee_id_str)))
            else:
                numeric_id = int(employee_id_str)
        except:
            numeric_id = loaded + 1000
        
        print(f"Testing: {emp['firstName']} {emp['lastName']}")
        print(f"  Employee ID: {employee_id_str} -> Numeric: {numeric_id}")
        print(f"  Template size: {len(template_bytes)} bytes")
        
        # Try DBAdd
        result = zkfp2.DBAdd(numeric_id, template_bytes)
        print(f"  ✅ DBAdd successful: {result}\n")
        loaded += 1
        
    except Exception as e:
        print(f"  ❌ DBAdd failed: {str(e)}\n")
        failed += 1

print(f"\n📊 Results: {loaded} loaded, {failed} failed")

zkfp2.DBFree()
zkfp2.CloseDevice()
zkfp2.Terminate()
client.close()
