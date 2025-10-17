#!/usr/bin/env python3
"""
Quick test to check what fingerprint templates are stored in the database
"""

import requests
import json

def test_fingerprint_recognition():
    print("🔍 Testing fingerprint recognition in database...")
    
    # Test the attendance endpoint with a sample template
    test_template = "4ae353523232000003a0a50505050709ced000002fa1910000000083b719c0a0b101f20fe3005e0071af0600bc00050f7200"
    
    try:
        # First, let's check what employees exist
        print("📊 Checking employees in database...")
        response = requests.get('http://localhost:5000/api/employees')
        if response.status_code == 200:
            employees = response.json()
            print(f"✅ Found {len(employees)} employees")
            
            # Look for employees with fingerprint templates
            fingerprint_employees = [emp for emp in employees if emp.get('fingerprintTemplate')]
            print(f"🔍 Found {len(fingerprint_employees)} employees with fingerprints:")
            
            for emp in fingerprint_employees[:3]:  # Show first 3
                template = emp.get('fingerprintTemplate', '')
                print(f"   - {emp.get('employeeId')}: {emp.get('firstName')} {emp.get('lastName')}")
                print(f"     Template length: {len(template)}")
                print(f"     Template start: {template[:50]}...")
                
        else:
            print(f"❌ Failed to get employees: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_fingerprint_recognition()
