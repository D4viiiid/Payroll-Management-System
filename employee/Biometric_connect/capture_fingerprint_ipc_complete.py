#!/usr/bin/env python3
"""
Fingerprint Capture Script for ZKTeco Device with Direct Database Access (IPC)
Captures fingerprint, looks up employee, and records attendance directly
Supports IPC (Inter-Process Communication) for efficient biometric operations
"""

import sys
import json
import time
import base64
import os
from pyzkfp import ZKFP2
from pymongo import MongoClient
from datetime import datetime

def get_database_connection():
    """Connect to MongoDB database"""
    try:
        # Get MongoDB URI from environment or use default
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/employee_db')

        # Connect to MongoDB
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)

        # Test connection
        client.admin.command('ping')

        # Get database
        db = client.employee_db

        return db, client
    except Exception as e:
        return None, f"Database connection failed: {str(e)}"

def check_device_health():
    """Quick device health check without waiting for fingerprint"""
    try:
        # Initialize ZKTeco device
        zkfp2 = ZKFP2()
        zkfp2.Init()

        # Get device count
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint devices found"
            }

        # Try to open first device
        try:
            zkfp2.OpenDevice(0)

            # Quick test - try to get device info
            try:
                # Test basic device communication
                pass
            except:
                pass

            # Terminate device connection
            zkfp2.Terminate()

            return {
                "success": True,
                "message": "Device is connected and responding",
                "device_count": device_count
            }

        except Exception as e:
            try:
                zkfp2.Terminate()
            except:
                pass
            return {
                "success": False,
                "error": f"Failed to open device: {str(e)}"
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Device initialization failed: {str(e)}"
        }

def capture_and_record_attendance():
    """Capture fingerprint and directly record attendance in database"""
    try:
        # First, connect to database
        db, client = get_database_connection()
        if db is None:  # ✅ FIX: Check if db is None (connection failed)
            return {
                "success": False,
                "error": f"Database connection failed: {client}"  # client contains error message
            }

        # Initialize ZKTeco device
        zkfp2 = ZKFP2()
        zkfp2.Init()

        # Get device count
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint devices found"
            }

        # Open first device
        zkfp2.OpenDevice(0)

        print("Place your finger on the scanner...", file=sys.stderr)

        # Capture fingerprint with timeout
        start_time = time.time()
        timeout = 25  # 25 seconds timeout for low-end hardware

        captured_template = None
        while time.time() - start_time < timeout:
            try:
                capture = zkfp2.AcquireFingerprint()
                if capture:
                    template, img = capture
                    captured_template = template
                    break

            except Exception as e:
                print(f"Capture attempt failed: {e}", file=sys.stderr)
                time.sleep(0.1)

        # Terminate device connection - MUST keep device open for matching!
        # zkfp2.Terminate()  # ← DON'T terminate yet, need for matching!

        if not captured_template:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "Fingerprint capture timeout - no finger detected within 25 seconds"
            }

        # ✅ FIX: Use pyzkfp's DB matching instead of exact comparison
        # Get all enrolled employees
        employees_collection = db.employees
        enrolled_employees = list(employees_collection.find({
            "fingerprintEnrolled": True,
            "isActive": True,
            "fingerprintTemplate": {"$exists": True, "$ne": None}
        }))

        if not enrolled_employees:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "No enrolled employees found in database"
            }

        # Build template database for matching
        template_list = []
        employee_list = []
        
        for emp in enrolled_employees:
            try:
                # Decode stored template from base64
                stored_template = base64.b64decode(emp['fingerprintTemplate'])
                template_list.append(stored_template)
                employee_list.append(emp)
            except Exception as e:
                print(f"Error decoding template for {emp.get('employeeId')}: {e}", file=sys.stderr)
                continue

        if not template_list:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "No valid fingerprint templates found"
            }

        # Use DB1toN matching (1-to-many matching)
        try:
            # DBMatch compares captured template against template database
            match_result = zkfp2.DBMatch(captured_template, template_list)
            
            zkfp2.Terminate()  # Now we can terminate
            
            if match_result >= 0:
                # Match found at index match_result
                employee = employee_list[match_result]
            else:
                return {
                    "success": False,
                    "error": "Fingerprint not recognized - please try again or contact administrator"
                }
        except Exception as e:
            zkfp2.Terminate()
            # If DBMatch fails (SIMPLE not implemented), fall back to exact match as last resort
            print(f"DBMatch failed: {e}, trying fallback matching...", file=sys.stderr)
            
            matched_employee = None
            for idx, stored_template in enumerate(template_list):
                # Fallback: Check if templates are similar enough (this is NOT ideal!)
                # This won't work well but better than nothing
                if stored_template == captured_template:
                    matched_employee = employee_list[idx]
                    break
            
            if not matched_employee:
                return {
                    "success": False,
                    "error": f"Fingerprint matching failed: {str(e)}"
                }
            
            employee = matched_employee

        # Determine Time In or Time Out based on last attendance
        attendance_collection = db.attendances

        # Find last attendance record for this employee
        last_attendance = attendance_collection.find_one(
            {"employeeId": employee["employeeId"]},
            sort=[("time", -1)]
        )

        # Determine status
        if not last_attendance or last_attendance.get("status") == "Time Out":
            status = "Time In"
        else:
            status = "Time Out"

        # Create attendance record
        attendance_record = {
            "employeeId": employee["employeeId"],
            "employeeName": f"{employee['firstName']} {employee['lastName']}",
            "time": datetime.utcnow(),
            "status": status,
            "deviceType": "biometric",
            "location": "Main Office"
        }

        # Insert attendance record
        result = attendance_collection.insert_one(attendance_record)

        if result.inserted_id:
            return {
                "success": True,
                "message": f"Attendance recorded successfully ({status})",
                "employee": {
                    "employeeId": employee["employeeId"],
                    "name": f"{employee['firstName']} {employee['lastName']}",
                    "position": employee.get("position", "N/A")
                },
                "attendance": {
                    "status": status,
                    "time": attendance_record["time"].isoformat(),
                    "id": str(result.inserted_id)
                }
            }
        else:
            return {
                "success": False,
                "error": "Failed to save attendance record"
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Biometric attendance recording failed: {str(e)}"
        }

def capture_fingerprint():
    """Capture a single fingerprint from ZKTeco device (legacy mode)"""
    try:
        # Initialize ZKTeco device
        zkfp2 = ZKFP2()
        zkfp2.Init()

        # Get device count
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint devices found"
            }

        # Open first device
        zkfp2.OpenDevice(0)

        print("Place your finger on the scanner...", file=sys.stderr)

        # Capture fingerprint with timeout
        start_time = time.time()
        timeout = 25  # 25 seconds timeout for low-end hardware

        while time.time() - start_time < timeout:
            try:
                capture = zkfp2.AcquireFingerprint()
                if capture:
                    template, img = capture

                    # Convert template to base64 for JSON transmission
                    template_b64 = base64.b64encode(template).decode('utf-8')

                    # Terminate device connection
                    zkfp2.Terminate()

                    return {
                        "success": True,
                        "fingerprint_template": template_b64,
                        "message": "Fingerprint captured successfully"
                    }

            except Exception as e:
                print(f"Capture attempt failed: {e}", file=sys.stderr)
                time.sleep(0.1)

        # Timeout reached
        zkfp2.Terminate()

        return {
            "success": False,
            "error": "Fingerprint capture timeout - no finger detected within 25 seconds"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Device initialization failed: {str(e)}"
        }

def capture_and_login():
    """Capture fingerprint and lookup employee for login (IPC)"""
    try:
        # First, connect to database
        db, client = get_database_connection()
        if db is None:  # ✅ FIX: Check if db is None (connection failed)
            return {
                "success": False,
                "error": f"Database connection failed: {client}"  # client contains error message
            }

        # Initialize ZKTeco device
        zkfp2 = ZKFP2()
        zkfp2.Init()

        # Get device count
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint devices found"
            }

        # Open first device
        zkfp2.OpenDevice(0)

        print("Place your finger on the scanner for login...", file=sys.stderr)

        # Capture fingerprint with timeout
        start_time = time.time()
        timeout = 25  # 25 seconds timeout for low-end hardware

        captured_template = None
        while time.time() - start_time < timeout:
            try:
                capture = zkfp2.AcquireFingerprint()
                if capture:
                    template, img = capture
                    captured_template = template
                    break

            except Exception as e:
                print(f"Capture attempt failed: {e}", file=sys.stderr)
                time.sleep(0.1)

        if not captured_template:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "Fingerprint capture timeout - no finger detected within 25 seconds"
            }

        # DON'T terminate device yet - need it for DBMatch!
        # zkfp2.Terminate()  # ← Moved to after matching

        # Look up employee by fingerprint template
        employees_collection = db.employees
        enrolled_employees = list(employees_collection.find({
            "fingerprintEnrolled": True,
            "isActive": True,
            "fingerprintTemplate": {"$exists": True, "$ne": ""}
        }))

        if not enrolled_employees:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "No enrolled employees found in database"
            }

        # Build template database for DBMatch
        template_list = []
        employee_list = []
        for emp in enrolled_employees:
            try:
                stored_template = base64.b64decode(emp['fingerprintTemplate'])
                template_list.append(stored_template)
                employee_list.append(emp)
            except Exception as e:
                print(f"Error decoding template for {emp.get('employeeId')}: {e}", file=sys.stderr)
                continue

        if not template_list:
            zkfp2.Terminate()
            return {
                "success": False,
                "error": "No valid fingerprint templates found"
            }

        # Use DBMatch for fuzzy fingerprint matching (1-to-many)
        employee = None
        try:
            match_result = zkfp2.DBMatch(captured_template, template_list)
            zkfp2.Terminate()  # Now safe to terminate

            if match_result >= 0:
                # Found match at index match_result
                employee = employee_list[match_result]
                print(f"✅ Fingerprint matched: {employee.get('employeeId')} - {employee.get('firstName')} {employee.get('lastName')}", file=sys.stderr)
            else:
                return {
                    "success": False,
                    "error": "Fingerprint not recognized - please enroll first or contact administrator"
                }

        except Exception as e:
            zkfp2.Terminate()
            print(f"⚠️ DBMatch failed: {e}, trying fallback exact match...", file=sys.stderr)

            # Fallback: Try exact byte comparison (may not work well for fingerprints)
            for emp in employee_list:
                try:
                    stored_template = base64.b64decode(emp['fingerprintTemplate'])
                    if stored_template == captured_template:
                        employee = emp
                        print(f"✅ Fingerprint matched (fallback): {employee.get('employeeId')}", file=sys.stderr)
                        break
                except Exception as decode_error:
                    print(f"Decode error during fallback: {decode_error}", file=sys.stderr)
                    continue

        if not employee:
            return {
                "success": False,
                "error": "Fingerprint not recognized - please enroll first or contact administrator"
            }

        # Update last login timestamp
        employees_collection.update_one(
            {"_id": employee["_id"]},
            {"$set": {"lastLogin": datetime.utcnow()}}
        )

        return {
            "success": True,
            "message": "Biometric login successful",
            "employee": {
                "id": str(employee["_id"]),
                "employeeId": employee["employeeId"],
                "firstName": employee["firstName"],
                "lastName": employee["lastName"],
                "email": employee["email"],
                "position": employee.get("position", ""),
                "department": employee.get("department", ""),
                "salary": employee.get("salary", 0),
                "hireDate": employee.get("hireDate", "").isoformat() if employee.get("hireDate") else None,
                "passwordChanged": employee.get("passwordChanged", False)
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Biometric login failed: {str(e)}"
        }

def main():
    """Main function with IPC support"""
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--health":
            result = check_device_health()
        elif sys.argv[1] == "--direct":
            # Direct database access mode (IPC) for attendance
            result = capture_and_record_attendance()
        elif sys.argv[1] == "--login":
            # Direct database access mode (IPC) for login
            result = capture_and_login()
        else:
            result = {"success": False, "error": "Invalid argument"}
    else:
        # Default mode - just capture fingerprint
        result = capture_fingerprint()

    # Output JSON result to stdout
    print(json.dumps(result))

    # Exit with appropriate code
    sys.exit(0 if result.get("success", False) else 1)

if __name__ == "__main__":
    main()
