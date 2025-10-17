import sys
import base64
from pyzkfp import ZKFP2
from pymongo import MongoClient

# Test with Gabriel Ludwig's fingerprint
mongodb_uri = "mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(mongodb_uri)
db = client.employee_db

# Get Gabriel Ludwig
emp = db.employees.find_one({"firstName": "Gabriel Ludwig"})

if not emp:
    print("❌ Employee not found!")
    sys.exit(1)

print(f"\n✅ Found: {emp['firstName']} {emp['lastName']}")
print(f"   Employee ID: {emp['employeeId']}")

template_b64 = emp['fingerprintTemplate']
template_bytes = base64.b64decode(template_b64)
print(f"   Template size: {len(template_bytes)} bytes\n")

# Initialize device
zkfp2 = ZKFP2()
zkfp2.Init()
zkfp2.OpenDevice(0)

db_handle = zkfp2.DBInit()
print(f"✅ DB Handle: {db_handle}\n")

# Add Gabriel's template with ID 7479
numeric_id = 7479
try:
    zkfp2.DBAdd(numeric_id, template_bytes)
    print(f"✅ Template loaded successfully (ID: {numeric_id})\n")
except Exception as e:
    print(f"❌ Failed to load template: {e}\n")
    zkfp2.DBFree()
    zkfp2.CloseDevice()
    zkfp2.Terminate()
    sys.exit(1)

# Now try to match a fingerprint
print("👆 Place Gabriel's finger on the scanner to test matching...\n")

import time
timeout = 20
start_time = time.time()
capture_success = False

while time.time() - start_time < timeout:
    capture = zkfp2.AcquireFingerprint()
    if capture:
        tmp, img = capture
        if tmp:
            print("✅ Fingerprint captured!\n")
            capture_success = True
            
            # Try to match
            try:
                fid, score = zkfp2.DBIdentify(tmp)
                print(f"📊 Match result:")
                print(f"   FID: {fid}")
                print(f"   Score: {score}")
                
                if fid == numeric_id:
                    print(f"\n✅ SUCCESS! Matched Gabriel Ludwig Rivera!")
                elif fid > 0:
                    print(f"\n⚠️  Matched but different ID: {fid}")
                else:
                    print(f"\n❌ No match found")
                    
            except Exception as e:
                print(f"\n❌ DBIdentify error: {e}")
            
            break
    time.sleep(0.1)

if not capture_success:
    print("❌ Timeout - no fingerprint captured")

# Cleanup
zkfp2.DBFree()
zkfp2.CloseDevice()
zkfp2.Terminate()
client.close()

print("\n✅ Test complete")
