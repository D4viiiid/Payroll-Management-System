"""
Test Script for Fingerprint Enrollment Fix
Tests the new CLI enrollment script
"""
import sys
import json
import os

# Add parent directory to path to import the CLI script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_enrollment():
    """Test the enrollment CLI script"""
    print("=" * 60)
    print("FINGERPRINT ENROLLMENT CLI TEST")
    print("=" * 60)
    print()
    
    # Test data
    test_employee = {
        "_id": "TEST-9999",
        "employeeId": "TEST-9999",
        "firstName": "Test",
        "lastName": "Employee",
        "email": "test@example.com"
    }
    
    print("📋 Test Employee Data:")
    print(json.dumps(test_employee, indent=2))
    print()
    
    print("🔍 Checking if script exists...")
    script_path = os.path.join(os.path.dirname(__file__), 'enroll_fingerprint_cli.py')
    if os.path.exists(script_path):
        print(f"✅ Script found: {script_path}")
    else:
        print(f"❌ Script not found: {script_path}")
        return False
    
    print()
    print("🧪 Testing import...")
    try:
        import enroll_fingerprint_cli
        print("✅ Script imports successfully")
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False
    
    print()
    print("📝 Script Functions:")
    print(f"   - enroll_fingerprint: {hasattr(enroll_fingerprint_cli, 'enroll_fingerprint')}")
    print(f"   - main: {hasattr(enroll_fingerprint_cli, 'main')}")
    print(f"   - log: {hasattr(enroll_fingerprint_cli, 'log')}")
    
    print()
    print("=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print()
    print("To test with actual device:")
    print(f"  python enroll_fingerprint_cli.py --data '{json.dumps(test_employee)}'")
    print()
    
    return True

if __name__ == '__main__':
    success = test_enrollment()
    sys.exit(0 if success else 1)
