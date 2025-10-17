#!/usr/bin/env python3
"""
Comprehensive Test Suite for Biometric Attendance System
Tests all major functionality: fingerprint recognition, attendance recording, deductions, frontend refresh
"""

import requests
import json
import time
import sys
from datetime import datetime

class BiometricSystemTester:
    def __init__(self):
        self.backend_url = "http://localhost:5000"
        self.test_results = []
        self.test_employee_id = None
        self.test_fingerprint_template = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def test_backend_connection(self):
        """Test 1: Backend server connectivity"""
        try:
            response = requests.get(f"{self.backend_url}/api/employees", timeout=5)
            if response.status_code == 200:
                self.log_test("Backend Connection", True, "Backend server is running and accessible")
                return True
            else:
                self.log_test("Backend Connection", False, f"Backend returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Connection", False, f"Failed to connect to backend: {str(e)}")
            return False
    
    def test_employee_creation(self):
        """Test 2: Create test employee with salary"""
        try:
            employee_data = {
                "firstName": "Test",
                "lastName": "Employee",
                "email": f"test{int(time.time())}@example.com",
                "contactNumber": "1234567890",
                "status": "regular",
                "hireDate": "2024-01-01",
                "salary": 30000,  # Set a salary for deduction testing
                "username": f"testemp{int(time.time())}",
                "password": "testpass"
            }
            
            response = requests.post(f"{self.backend_url}/api/employees", json=employee_data)
            if response.status_code == 201:
                employee = response.json()
                self.test_employee_id = employee.get('_id')
                self.log_test("Employee Creation", True, f"Created employee: {employee.get('firstName')} {employee.get('lastName')}", 
                            f"Employee ID: {employee.get('employeeId')}")
                return True
            else:
                self.log_test("Employee Creation", False, f"Failed to create employee: {response.text}")
                return False
        except Exception as e:
            self.log_test("Employee Creation", False, f"Error creating employee: {str(e)}")
            return False
    
    def test_fingerprint_enrollment(self):
        """Test 3: Enroll fingerprint template"""
        try:
            # Create a completely unique fingerprint template using timestamp
            timestamp = str(int(time.time()))
            # Create a unique template by modifying the base template
            base_template = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200"
            # Replace some characters with timestamp to make it unique
            unique_part = timestamp.zfill(8) + "0" * (4096 - len(base_template) - 8)
            self.test_fingerprint_template = base_template + unique_part
            
            fingerprint_data = {
                "fingerprintTemplate": self.test_fingerprint_template
            }
            
            response = requests.post(f"{self.backend_url}/api/employees/{self.test_employee_id}/fingerprint", 
                                   json=fingerprint_data)
            if response.status_code == 200:
                self.log_test("Fingerprint Enrollment", True, "Fingerprint template enrolled successfully",
                            f"Template length: {len(self.test_fingerprint_template)}")
                return True
            else:
                self.log_test("Fingerprint Enrollment", False, f"Failed to enroll fingerprint: {response.text}")
                return False
        except Exception as e:
            self.log_test("Fingerprint Enrollment", False, f"Error enrolling fingerprint: {str(e)}")
            return False
    
    def test_fingerprint_recognition(self):
        """Test 4: Fingerprint recognition and attendance recording"""
        try:
            attendance_data = {
                "fingerprint_template": self.test_fingerprint_template
            }
            
            response = requests.post(f"{self.backend_url}/api/attendance/record", json=attendance_data)
            if response.status_code == 200:
                result = response.json()
                self.log_test("Fingerprint Recognition", True, f"Fingerprint recognized: {result.get('message')}",
                            f"Status: {result.get('status')}, Employee: {result.get('employee', {}).get('name')}")
                return True
            else:
                self.log_test("Fingerprint Recognition", False, f"Fingerprint not recognized: {response.text}")
                return False
        except Exception as e:
            self.log_test("Fingerprint Recognition", False, f"Error testing fingerprint recognition: {str(e)}")
            return False
    
    def test_half_day_deduction(self):
        """Test 5: Half Day deduction creation"""
        try:
            # Check if deduction was created
            deductions_response = requests.get(f"{self.backend_url}/api/deductions")
            if deductions_response.status_code == 200:
                deductions = deductions_response.json()
                employee_deductions = [d for d in deductions if d.get('employee') == self.test_employee_id]
                
                if len(employee_deductions) > 0:
                    deduction = employee_deductions[0]
                    self.log_test("Half Day Deduction", True, f"Deduction created: {deduction.get('name')}",
                                f"Amount: ${deduction.get('amount')}, Type: {deduction.get('type')}")
                    return True
                else:
                    self.log_test("Half Day Deduction", False, "No deduction was created for Half Day attendance")
                    return False
            else:
                self.log_test("Half Day Deduction", False, f"Failed to fetch deductions: {deductions_response.text}")
                return False
        except Exception as e:
            self.log_test("Half Day Deduction", False, f"Error checking deductions: {str(e)}")
            return False
    
    def test_attendance_records(self):
        """Test 6: Attendance records in database"""
        try:
            response = requests.get(f"{self.backend_url}/api/attendance")
            if response.status_code == 200:
                attendance_records = response.json()
                employee_records = [r for r in attendance_records if r.get('employeeId') == self.test_employee_id]
                
                if len(employee_records) > 0:
                    latest_record = employee_records[0]
                    self.log_test("Attendance Records", True, f"Attendance record found: {latest_record.get('status')}",
                                f"Time: {latest_record.get('time')}, Notes: {latest_record.get('notes')}")
                    return True
                else:
                    self.log_test("Attendance Records", False, "No attendance records found for test employee")
                    return False
            else:
                self.log_test("Attendance Records", False, f"Failed to fetch attendance: {response.text}")
                return False
        except Exception as e:
            self.log_test("Attendance Records", False, f"Error fetching attendance: {str(e)}")
            return False
    
    def test_time_out_recording(self):
        """Test 7: Time Out recording (should fail outside allowed hours)"""
        try:
            attendance_data = {
                "fingerprint_template": self.test_fingerprint_template
            }
            
            response = requests.post(f"{self.backend_url}/api/attendance/record", json=attendance_data)
            if response.status_code == 400:
                result = response.json()
                if "Time Out is only allowed" in result.get('error', ''):
                    self.log_test("Time Out Restriction", True, "Time Out correctly restricted to 4:00 PM - 6:00 PM",
                                f"Error: {result.get('error')}")
                    return True
                else:
                    self.log_test("Time Out Restriction", False, f"Unexpected error: {result.get('error')}")
                    return False
            else:
                self.log_test("Time Out Restriction", False, f"Expected 400 error, got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Time Out Restriction", False, f"Error testing time out: {str(e)}")
            return False
    
    def test_frontend_api_endpoints(self):
        """Test 8: Frontend API endpoints accessibility"""
        endpoints = [
            "/api/employees",
            "/api/attendance",
            "/api/attendance/stats",
            "/api/deductions"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    self.log_test(f"API Endpoint {endpoint}", True, "Endpoint accessible")
                else:
                    self.log_test(f"API Endpoint {endpoint}", False, f"Status {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"API Endpoint {endpoint}", False, f"Error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def cleanup_test_data(self):
        """Clean up test data"""
        try:
            if self.test_employee_id:
                response = requests.delete(f"{self.backend_url}/api/employees/{self.test_employee_id}")
                if response.status_code == 200:
                    print("🧹 Cleaned up test employee")
                else:
                    print(f"⚠️  Failed to clean up test employee: {response.text}")
        except Exception as e:
            print(f"⚠️  Error cleaning up test data: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🧪 Starting Comprehensive Biometric System Tests")
        print("=" * 60)
        
        # Run tests in sequence
        tests = [
            self.test_backend_connection,
            self.test_employee_creation,
            self.test_fingerprint_enrollment,
            self.test_fingerprint_recognition,
            self.test_half_day_deduction,
            self.test_attendance_records,
            self.test_time_out_recording,
            self.test_frontend_api_endpoints
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
        
        # Generate report
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED! System is working correctly.")
        else:
            print(f"\n⚠️  {total - passed} tests failed. Please check the issues above.")
        
        # Clean up
        self.cleanup_test_data()
        
        return passed == total

def main():
    tester = BiometricSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
