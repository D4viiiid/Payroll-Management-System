#!/usr/bin/env python
"""
Fixed attendance matching function using DBIdentify (1:N matching)
This replaces the broken DBMatch approach that caused AccessViolationException
"""

def match_fingerprint_and_record_attendance_FIXED():
    """
    Match fingerprint against enrolled employees and record attendance.
    Uses DBIdentify for proper 1:N matching instead of DBMatch.
    """
    try:
        print("🔍 Starting fingerprint matching for attendance...", file=sys.stderr)
        
        # Connect to database
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/employee_db")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client.get_database()
        
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
        print("✅ Device opened successfully", file=sys.stderr)
        
        # Initialize database handle for DBIdentify
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
        
        print(f"📊 Loading {len(employees)} enrolled employees into device memory...", file=sys.stderr)
        
        # Map to track numeric ID to employee document
        employee_map = {}
        loaded_count = 0
        
        # Load all fingerprint templates into device memory using DBAdd
        for idx, employee in enumerate(employees):
            employee_id_str = employee.get('employeeId', str(employee['_id']))
            
            # Extract numeric ID for device (DBIdentify returns integer IDs)
            try:
                if employee_id_str.startswith('EMP'):
                    numeric_id = int(employee_id_str[3:])  # EMP001 -> 1
                else:
                    numeric_id = int(employee_id_str)
            except:
                # Use index + 1000 as fallback to avoid conflicts
                numeric_id = idx + 1000
            
            # Try multi-template format first
            if employee.get('fingerprintTemplates'):
                for fp_data in employee['fingerprintTemplates']:
                    try:
                        stored_template_b64 = fp_data.get('template', '')
                        if stored_template_b64:
                            stored_template_bytes = base64.b64decode(stored_template_b64)
                            
                            # Add template to device database memory
                            zkfp2.DBAdd(numeric_id, stored_template_bytes)
                            employee_map[numeric_id] = employee
                            loaded_count += 1
                            print(f"  ✅ Loaded: {employee.get('firstName')} {employee.get('lastName')} (ID: {numeric_id})", file=sys.stderr)
                            break  # Only load first template
                    except Exception as e:
                        print(f"  ⚠️ Failed to load template for {employee.get('firstName', 'Unknown')}: {str(e)}", file=sys.stderr)
                        continue
            
            # Try legacy single template format
            elif employee.get('fingerprintTemplate'):
                try:
                    stored_template_b64 = employee['fingerprintTemplate']
                    stored_template_bytes = base64.b64decode(stored_template_b64)
                    
                    zkfp2.DBAdd(numeric_id, stored_template_bytes)
                    employee_map[numeric_id] = employee
                    loaded_count += 1
                    print(f"  ✅ Loaded (legacy): {employee.get('firstName')} {employee.get('lastName')} (ID: {numeric_id})", file=sys.stderr)
                except Exception as e:
                    print(f"  ⚠️ Failed to load legacy template: {str(e)}", file=sys.stderr)
                    continue
        
        print(f"📊 Successfully loaded {loaded_count} templates", file=sys.stderr)
        
        if loaded_count == 0:
            zkfp2.DBFree(db_handle)
            zkfp2.CloseDevice()
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "No valid templates found. Please enroll employees first."
            }
        
        # Capture fingerprint with timeout
        print("📱 Place finger on scanner...", file=sys.stderr)
        timeout = 20
        start_time = time.time()
        capture_success = False
        tmp = None
        
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
            zkfp2.DBFree(db_handle)
            zkfp2.CloseDevice()
            zkfp2.Terminate()
            return {
                "success": False,
                "message": "Capture timeout. Please try again."
            }
        
        # Use DBIdentify for 1:N matching
        print("🔍 Matching fingerprint using DBIdentify...", file=sys.stderr)
        
        try:
            fid, score = zkfp2.DBIdentify(tmp)
            print(f"📊 DBIdentify result - FID: {fid}, Score: {score}", file=sys.stderr)
            
            if fid > 0 and score > 0:
                matched_employee = employee_map.get(fid)
                if matched_employee:
                    print(f"✅ MATCH FOUND: {matched_employee.get('firstName')} {matched_employee.get('lastName')} (Score: {score})", file=sys.stderr)
                else:
                    print(f"⚠️ FID {fid} matched but not in employee map", file=sys.stderr)
                    matched_employee = None
            else:
                print(f"❌ No match (FID: {fid}, Score: {score})", file=sys.stderr)
                matched_employee = None
        except Exception as e:
            print(f"❌ DBIdentify error: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            matched_employee = None
        
        # Cleanup
        zkfp2.DBFree(db_handle)
        zkfp2.CloseDevice()
        zkfp2.Terminate()
        
        if not matched_employee:
            return {
                "success": False,
                "message": "Fingerprint not recognized. Please enroll first."
            }
        
        # REST OF THE CODE: Record attendance (same as before)
        # ... attendance recording code stays the same ...
        
        return {
            "success": True,
            "message": "Attendance recorded",
            "employee": matched_employee.get('firstName') + " " + matched_employee.get('lastName')
        }
        
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }
