"""
Command-Line Fingerprint Enrollment Script
Captures 3 fingerprint scans, merges them, and stores in MongoDB
Returns JSON output for bridge server
"""
import sys
import json
import base64
from pyzkfp import ZKFP2
from pymongo import MongoClient
import os
from datetime import datetime

def log(message):
    """Log to stderr so it doesn't interfere with JSON output"""
    print(message, file=sys.stderr)

def enroll_fingerprint(employee_data):
    """
    Enroll fingerprint for employee
    Returns: dict with success status and template data
    """
    try:
        # Extract employee info
        employee_id = employee_data.get('_id') or employee_data.get('employeeId')
        first_name = employee_data.get('firstName', 'Unknown')
        last_name = employee_data.get('lastName', 'Employee')
        email = employee_data.get('email', '')
        
        log(f"📋 Enrolling: {first_name} {last_name} (ID: {employee_id})")
        
        # Initialize device
        log("🔌 Initializing ZKTeco device...")
        zkfp2 = ZKFP2()
        zkfp2.Init()
        
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint device found. Please connect the scanner."
            }
        
        log(f"✅ Found {device_count} device(s)")
        
        # Open first device
        zkfp2.OpenDevice(0)
        log("✅ Device opened successfully")
        
        # Capture 3 fingerprints
        templates = []
        log("\n👆 Please scan your finger 3 times...")
        
        for i in range(3):
            log(f"\n🔍 Scan {i+1}/3 - Place your finger on the scanner...")
            
            # Capture fingerprint
            while True:
                tmp, img = zkfp2.AcquireFingerprint()
                if tmp:
                    templates.append(tmp)
                    log(f"✅ Scan {i+1}/3 captured successfully!")
                    log("   Remove your finger and wait 2 seconds...")
                    break
        
        # Merge templates
        log("\n🔀 Merging fingerprint templates...")
        reg_temp, reg_temp_len = zkfp2.DBMerge(*templates)
        log(f"✅ Template merged successfully (length: {reg_temp_len} bytes)")
        
        # Convert template to base64 for storage
        template_base64 = base64.b64encode(bytes(reg_temp)).decode('utf-8')
        template_hex = bytes(reg_temp).hex()
        
        # Store in MongoDB
        mongodb_uri = os.getenv('MONGODB_URI')
        if mongodb_uri:
            try:
                log("\n💾 Storing fingerprint in MongoDB...")
                client = MongoClient(mongodb_uri)
                db = client['employee_db']
                employees = db['employees']
                
                # Update employee with fingerprint template
                result = employees.update_one(
                    {'_id': employee_id},
                    {
                        '$set': {
                            'fingerprintTemplate': template_hex,
                            'fingerprintEnrolled': True,
                            'fingerprintEnrollmentDate': datetime.utcnow(),
                            'updatedAt': datetime.utcnow()
                        }
                    }
                )
                
                if result.matched_count > 0:
                    log(f"✅ Fingerprint stored in MongoDB for employee {employee_id}")
                else:
                    log(f"⚠️  Employee {employee_id} not found in database, returning template anyway")
                
                client.close()
            except Exception as db_error:
                log(f"⚠️  MongoDB error: {str(db_error)}")
                log("   Continuing with template return...")
        
        # Close device
        zkfp2.CloseDevice()
        zkfp2.Terminate()
        log("\n✅ Enrollment complete!")
        
        # Return success with template data
        return {
            "success": True,
            "message": f"Fingerprint enrolled successfully for {first_name} {last_name}",
            "employeeId": employee_id,
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "template": template_base64,
            "templateHex": template_hex,
            "templateLength": reg_temp_len,
            "fingerprintEnrolled": True
        }
        
    except Exception as error:
        log(f"\n❌ Enrollment error: {str(error)}")
        return {
            "success": False,
            "error": str(error),
            "message": "Fingerprint enrollment failed"
        }

def main():
    """Main entry point"""
    try:
        # Parse command line arguments
        if len(sys.argv) < 3 or sys.argv[1] != '--data':
            print(json.dumps({
                "success": False,
                "error": "Invalid arguments. Usage: python enroll_fingerprint_cli.py --data <json_employee_data>"
            }))
            sys.exit(1)
        
        # Parse employee data from JSON argument
        employee_data_json = sys.argv[2]
        employee_data = json.loads(employee_data_json)
        
        # Perform enrollment
        result = enroll_fingerprint(employee_data)
        
        # Print JSON result to stdout
        print(json.dumps(result))
        
        # Exit with appropriate code
        sys.exit(0 if result['success'] else 1)
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
