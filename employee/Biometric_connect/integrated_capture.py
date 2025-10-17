#!/usr/bin/env python3
"""
Integrated Fingerprint Capture for Employee Management System
Supports: --capture, --health, --direct (attendance)
"""

import sys
import json
import time
import base64
import os
from pyzkfp import ZKFP2
from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId
import pytz  # For timezone handling

# Manila timezone
MANILA_TZ = pytz.timezone('Asia/Manila')

def calculate_work_hours(time_in, time_out):
    """
    Calculate work hours excluding lunch break (12:00 PM - 12:59 PM)
    Returns hours as a float
    """
    if not time_in or not time_out:
        return 0.0
    
    # Ensure datetime objects
    if isinstance(time_in, str):
        time_in = datetime.fromisoformat(time_in.replace('Z', '+00:00'))
    if isinstance(time_out, str):
        time_out = datetime.fromisoformat(time_out.replace('Z', '+00:00'))
    
    # Calculate total time in seconds
    total_seconds = (time_out - time_in).total_seconds()
    
    # Check if lunch break (12:00 PM - 12:59 PM) is within work hours
    lunch_start = time_in.replace(hour=12, minute=0, second=0, microsecond=0)
    lunch_end = time_in.replace(hour=13, minute=0, second=0, microsecond=0)
    
    # If employee worked through lunch time, subtract 1 hour
    if time_in < lunch_end and time_out > lunch_start:
        # Calculate overlap with lunch break
        overlap_start = max(time_in, lunch_start)
        overlap_end = min(time_out, lunch_end)
        lunch_overlap_seconds = (overlap_end - overlap_start).total_seconds()
        
        if lunch_overlap_seconds > 0:
            total_seconds -= lunch_overlap_seconds
    
    # Convert seconds to hours
    hours = max(0.0, total_seconds / 3600.0)
    return hours

def get_database_connection():
    """Connect to MongoDB database"""
    try:
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/employee_db')
        print(f"🔗 Connecting to MongoDB: {mongodb_uri[:50]}...", file=sys.stderr)
        
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        
        # Extract database name from URI or use default
        if 'mongodb+srv://' in mongodb_uri or 'mongodb://' in mongodb_uri:
            # Parse URI to get database name
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(mongodb_uri)
            
            # Database name is in the path
            db_name = parsed.path.strip('/').split('?')[0]
            if not db_name:
                db_name = 'employee_db'
            
            print(f"📊 Using database: {db_name}", file=sys.stderr)
            db = client[db_name]
        else:
            db = client.employee_db
        
        return db, client, None  # Return db, client, and no error
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}", file=sys.stderr)
        return None, None, f"Database connection failed: {str(e)}"  # Return error

def check_device_health():
    """Check if ZKTeco device is connected and responding"""
    try:
        zkfp2 = ZKFP2()
        zkfp2.Init()
        device_count = zkfp2.GetDeviceCount()
        
        if device_count == 0:
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "No biometric device found"
            }
        
        try:
            zkfp2.OpenDevice(0)
            zkfp2.CloseDevice()
            zkfp2.Terminate()
            return {
                "success": True,
                "message": "Device connected and ready",
                "device_count": device_count
            }
        except Exception as e:
            zkfp2.Terminate()
            return {
                "success": False,
                "message": f"Device error: {str(e)}"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Device initialization failed: {str(e)}"
        }

def capture_fingerprint_template(employee_id=None, first_name=None, last_name=None):
    """Capture fingerprint and return template"""
    try:
        print(f"🖐️ Starting fingerprint capture for {first_name} {last_name}...", file=sys.stderr)
        
        # Initialize device
        zkfp2 = ZKFP2()
        zkfp2.Init()
        
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "No fingerprint device found. Please connect ZKTeco device."
            }
        
        # Open first device
        zkfp2.OpenDevice(0)
        print("📱 Device opened. Please place finger on scanner...", file=sys.stderr)
        
        # Capture 3 fingerprint scans for better accuracy
        templates = []
        scan_timeout = 30  # 30 seconds per scan
        
        for i in range(3):
            print(f"📍 Scan {i+1}/3: Place finger on scanner...", file=sys.stderr)
            
            start_time = time.time()
            scan_success = False
            
            while time.time() - start_time < scan_timeout:
                capture = zkfp2.AcquireFingerprint()
                if capture:
                    tmp, img = capture
                    if tmp:
                        templates.append(tmp)
                        print(f"✅ Scan {i+1}/3 captured successfully!", file=sys.stderr)
                        scan_success = True
                        break
                time.sleep(0.1)
            
            if not scan_success:
                zkfp2.CloseDevice()
                zkfp2.Terminate()
                return {
                    "success": False,
                    "message": f"Scan {i+1}/3 timeout. Please try again."
                }
            
            if i < 2:
                print("⏳ Please lift finger and place again...", file=sys.stderr)
                time.sleep(1)
        
        # Merge templates into single registered template
        print("🔄 Merging fingerprint scans...", file=sys.stderr)
        reg_temp, reg_temp_len = zkfp2.DBMerge(*templates)
        
        # Convert template to base64 for storage
        template_b64 = base64.b64encode(bytes(reg_temp)).decode('utf-8')
        
        # Close device
        zkfp2.CloseDevice()
        zkfp2.Terminate()
        
        print("✅ Fingerprint captured successfully!", file=sys.stderr)
        
        return {
            "success": True,
            "message": "Fingerprint captured successfully",
            "template": template_b64,
            "template_length": reg_temp_len
        }
        
    except Exception as e:
        print(f"❌ Error capturing fingerprint: {str(e)}", file=sys.stderr)
        try:
            zkfp2.Terminate()
        except:
            pass
        return {
            "success": False,
            "message": f"Capture failed: {str(e)}"
        }

def match_fingerprint_and_record_attendance():
    """Capture fingerprint, match against database, and record attendance"""
    try:
        print("🔍 Starting fingerprint matching for attendance...", file=sys.stderr)
        
        # Connect to database
        db, client, connection_error = get_database_connection()
        if connection_error:
            return {
                "success": False,
                "message": connection_error
            }
        
        # Initialize device
        zkfp2 = ZKFP2()
        zkfp2.Init()
        
        device_count = zkfp2.GetDeviceCount()
        if device_count == 0:
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "No fingerprint device found"
            }
        
        zkfp2.OpenDevice(0)
        print("📱 Device ready. Place finger on scanner...", file=sys.stderr)
        
        # Capture fingerprint with timeout
        timeout = 20  # 20 seconds timeout
        start_time = time.time()
        capture_success = False
        
        while time.time() - start_time < timeout:
            capture = zkfp2.AcquireFingerprint()
            if capture:
                tmp, img = capture
                if tmp:
                    print("✅ Fingerprint captured!", file=sys.stderr)
                    capture_success = True
                    break
            time.sleep(0.1)
        
        if not capture_success:
            zkfp2.CloseDevice()
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "Fingerprint capture timeout. Please try again."
            }
        
        # Initialize DB handle for DBIdentify (1:N matching)
        db_handle = zkfp2.DBInit()
        print(f"✅ Database handle initialized: {db_handle}", file=sys.stderr)
        
        # Get all employees with fingerprints
        employees = list(db.employees.find({
            "fingerprintEnrolled": True,
            "$or": [
                {"fingerprintTemplates": {"$exists": True, "$ne": []}},
                {"fingerprintTemplate": {"$exists": True, "$ne": None}}
            ]
        }))
        
        print(f"📊 Found {len(employees)} employees with fingerprints", file=sys.stderr)
        print(f"📊 Loading templates into device memory...", file=sys.stderr)
        
        # Map numeric ID to employee document
        employee_map = {}
        loaded_count = 0
        skipped_count = 0
        
        # Load all templates into device memory using DBAdd
        for idx, employee in enumerate(employees):
            employee_id_str = employee.get('employeeId', str(employee['_id']))
            
            # Extract numeric ID for device
            try:
                if employee_id_str.startswith('EMP-') or employee_id_str.startswith('EMP'):
                    numeric_id = int(''.join(filter(str.isdigit, employee_id_str)))
                else:
                    numeric_id = int(employee_id_str)
            except:
                numeric_id = idx + 1000  # Fallback: use index + offset
            
            # Try loading multi-template format first
            if employee.get('fingerprintTemplates'):
                for fp_data in employee['fingerprintTemplates']:
                    try:
                        stored_template_b64 = fp_data.get('template', '')
                        if stored_template_b64:
                            stored_template_bytes = base64.b64decode(stored_template_b64)
                            
                            # Validate template size (should be 2048 bytes for ZKTeco)
                            if len(stored_template_bytes) != 2048:
                                print(f"  ⚠️  Skipping {employee.get('firstName')} {employee.get('lastName')}: Invalid template size {len(stored_template_bytes)} bytes", file=sys.stderr)
                                skipped_count += 1
                                continue
                            
                            zkfp2.DBAdd(numeric_id, stored_template_bytes)
                            employee_map[numeric_id] = employee
                            loaded_count += 1
                            print(f"  ✅ Loaded: {employee.get('firstName')} {employee.get('lastName')} (ID: {numeric_id})", file=sys.stderr)
                            break  # Only load first template per employee
                    except Exception as e:
                        print(f"  ⚠️  Failed to load template for {employee.get('firstName', 'Unknown')}: {str(e)}", file=sys.stderr)
                        skipped_count += 1
                        continue
            
            # Try loading legacy single template format
            elif employee.get('fingerprintTemplate'):
                try:
                    stored_template_b64 = employee['fingerprintTemplate']
                    stored_template_bytes = base64.b64decode(stored_template_b64)
                    
                    # Validate template size (should be 2048 bytes for ZKTeco)
                    if len(stored_template_bytes) != 2048:
                        print(f"  ⚠️  Skipping {employee.get('firstName')} {employee.get('lastName')}: Invalid template size {len(stored_template_bytes)} bytes", file=sys.stderr)
                        skipped_count += 1
                        continue
                    
                    zkfp2.DBAdd(numeric_id, stored_template_bytes)
                    employee_map[numeric_id] = employee
                    loaded_count += 1
                    print(f"  ✅ Loaded: {employee.get('firstName')} {employee.get('lastName')} (ID: {numeric_id})", file=sys.stderr)
                except Exception as e:
                    print(f"  ⚠️  Failed to load legacy template for {employee.get('firstName', 'Unknown')}: {str(e)}", file=sys.stderr)
                    skipped_count += 1
                    continue
        
        print(f"📊 Successfully loaded {loaded_count} templates (skipped {skipped_count} invalid)", file=sys.stderr)
        
        if loaded_count == 0:
            zkfp2.DBFree(db_handle)
            zkfp2.CloseDevice()
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "No valid templates found. Please enroll employees first."
            }
        
        # Use DBIdentify for 1:N matching (proper way to match against stored templates)
        print("🔍 Matching fingerprint using DBIdentify...", file=sys.stderr)
        
        matched_employee = None
        try:
            fid, score = zkfp2.DBIdentify(tmp)
            print(f"📊 DBIdentify result - FID: {fid}, Score: {score}", file=sys.stderr)
            
            if fid > 0 and score > 0:
                matched_employee = employee_map.get(fid)
                if matched_employee:
                    print(f"✅ MATCH FOUND: {matched_employee.get('firstName')} {matched_employee.get('lastName')} (Score: {score})", file=sys.stderr)
                else:
                    print(f"⚠️ FID {fid} matched but not in employee map", file=sys.stderr)
            else:
                print(f"❌ No match (FID: {fid}, Score: {score})", file=sys.stderr)
        except Exception as e:
            print(f"❌ DBIdentify error: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
        
        # Cleanup device resources
        zkfp2.DBFree()  # DBFree doesn't take parameters
        zkfp2.CloseDevice()
        zkfp2.Terminate()
        
        if not matched_employee:
            return {
                "success": False,
                "message": "Fingerprint not recognized. Please enroll first."
            }
        
        # Record attendance
        employee_id = str(matched_employee['_id'])
        employee_object_id = matched_employee['_id']
        
        # Use Manila timezone for all date/time operations
        manila_now = datetime.now(MANILA_TZ)
        today = manila_now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        # Check if attendance already exists for today using employee ObjectId (more reliable)
        attendance = db.attendances.find_one({
            "employee": employee_object_id,
            "date": {
                "$gte": today,
                "$lt": tomorrow
            }
        })
        
        current_time = manila_now
        action = ""
        
        if not attendance:
            # Create new attendance record (Time In)
            # Use today (midnight Manila time) for date field, current_time for timeIn
            attendance_data = {
                "employee": ObjectId(employee_id),
                "employeeId": matched_employee.get('employeeId', employee_id),
                "date": today,  # Store date as midnight Manila time for proper querying
                "timeIn": current_time,  # Store actual scan time in Manila timezone
                "status": "present",
                "archived": False,
                "createdAt": current_time,
                "updatedAt": current_time
            }
            result = db.attendances.insert_one(attendance_data)
            attendance_data['_id'] = result.inserted_id
            action = "time_in"
            message = f"✅ Time In recorded at {current_time.strftime('%I:%M %p')}"
        elif not attendance.get('timeOut'):
            # Update with Time Out and calculate work hours
            time_in = attendance.get('timeIn')
            
            # Ensure time_in is timezone-aware
            if time_in.tzinfo is None:
                time_in = MANILA_TZ.localize(time_in)
            
            # Calculate work hours (excluding lunch break 12:00-12:59 PM)
            work_hours = calculate_work_hours(time_in, current_time)
            
            # Determine status based on work hours
            if work_hours >= 6.5:
                status = "present"  # Full day (>= 6.5 hours)
            elif work_hours >= 4:
                status = "half-day"  # Half day (>= 4 hours but < 6.5 hours)
            else:
                status = "present"  # Too short, keep as present
            
            db.attendances.update_one(
                {"_id": attendance['_id']},
                {
                    "$set": {
                        "timeOut": current_time,
                        "status": status,
                        "updatedAt": current_time
                    }
                }
            )
            attendance['timeOut'] = current_time
            attendance['status'] = status
            attendance_data = attendance
            action = "time_out"
            message = f"✅ Time Out recorded at {current_time.strftime('%I:%M %p')} ({work_hours:.2f} hrs)"
        else:
            return {
                "success": False,
                "message": "Attendance already completed for today"
            }
        
        return {
            "success": True,
            "message": message,
            "action": action,
            "employee": {
                "_id": employee_id,
                "firstName": matched_employee.get('firstName'),
                "lastName": matched_employee.get('lastName'),
                "employeeId": matched_employee.get('employeeId')
            },
            "attendance": {
                "_id": str(attendance_data['_id']),
                "date": attendance_data['date'].isoformat() if isinstance(attendance_data['date'], datetime) else attendance_data['date'],
                "timeIn": attendance_data['timeIn'].isoformat() if isinstance(attendance_data.get('timeIn'), datetime) else attendance_data.get('timeIn'),
                "timeOut": attendance_data['timeOut'].isoformat() if isinstance(attendance_data.get('timeOut'), datetime) else None if not attendance_data.get('timeOut') else attendance_data.get('timeOut'),
                "status": attendance_data.get('status', 'present')
            }
        }
        
    except Exception as e:
        print(f"❌ Error in attendance matching: {str(e)}", file=sys.stderr)
        try:
            zkfp2.Terminate()
        except:
            pass
        return {
            "success": False,
            "message": f"Attendance recording failed: {str(e)}"
        }

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "message": "No operation specified. Use --capture, --health, or --direct"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    operation = sys.argv[1]
    
    if operation == "--health":
        result = check_device_health()
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    
    elif operation == "--capture":
        # Capture fingerprint for enrollment
        if len(sys.argv) >= 4:
            employee_id = sys.argv[2]
            first_name = sys.argv[3]
            last_name = sys.argv[4] if len(sys.argv) > 4 else ""
        else:
            employee_id = None
            first_name = "Unknown"
            last_name = ""
        
        result = capture_fingerprint_template(employee_id, first_name, last_name)
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    
    elif operation == "--direct":
        # Match fingerprint and record attendance
        result = match_fingerprint_and_record_attendance()
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    
    else:
        result = {
            "success": False,
            "message": f"Unknown operation: {operation}"
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
