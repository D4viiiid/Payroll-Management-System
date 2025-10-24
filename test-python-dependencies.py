#!/usr/bin/env python3
"""
Test script to verify Python dependencies are installed correctly
Checks all packages required for ZKTeco fingerprint scanner
"""

import sys
import subprocess

def test_import(package_name, import_name=None):
    """Test if a package can be imported"""
    if import_name is None:
        import_name = package_name
    
    try:
        __import__(import_name)
        print(f"✅ {package_name:20} - Installed and importable")
        return True
    except ImportError as e:
        print(f"❌ {package_name:20} - NOT INSTALLED ({str(e)})")
        return False

def get_package_version(package_name):
    """Get installed version of a package"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'show', package_name],
            capture_output=True,
            text=True
        )
        for line in result.stdout.split('\n'):
            if line.startswith('Version:'):
                return line.split(':', 1)[1].strip()
        return "Unknown"
    except:
        return "Not installed"

print("=" * 80)
print("PYTHON ENVIRONMENT DIAGNOSTIC")
print("=" * 80)
print()

# Python version
print(f"Python Version: {sys.version}")
print(f"Python Executable: {sys.executable}")
print()

print("=" * 80)
print("TESTING REQUIRED PACKAGES")
print("=" * 80)
print()

# Critical packages
critical_packages = [
    ('pyzkfp', 'pyzkfp'),
    ('pymongo', 'pymongo'),
]

# Optional packages
optional_packages = [
    ('python-dotenv', 'dotenv'),
    ('pillow', 'PIL'),
    ('requests', 'requests'),
    ('dnspython', 'dns'),
]

# Standard library (should always work)
stdlib_packages = [
    ('json', 'json'),
    ('base64', 'base64'),
    ('datetime', 'datetime'),
    ('os', 'os'),
    ('sys', 'sys'),
]

print("CRITICAL PACKAGES (Required for fingerprint scanner):")
print("-" * 80)
critical_ok = all(test_import(pkg, imp) for pkg, imp in critical_packages)
print()

print("OPTIONAL PACKAGES (Required for full functionality):")
print("-" * 80)
optional_ok = all(test_import(pkg, imp) for pkg, imp in optional_packages)
print()

print("STANDARD LIBRARY (Should always work):")
print("-" * 80)
stdlib_ok = all(test_import(pkg, imp) for pkg, imp in stdlib_packages)
print()

# Test pyzkfp specifically
print("=" * 80)
print("TESTING PYZKFP (ZKTECO SDK)")
print("=" * 80)
print()

try:
    from pyzkfp import ZKFP2
    print("✅ pyzkfp.ZKFP2 imported successfully")
    
    # Try to initialize
    try:
        zkfp2 = ZKFP2()
        zkfp2.Init()
        device_count = zkfp2.GetDeviceCount()
        print(f"✅ ZKFP2 initialized successfully")
        print(f"📱 Detected {device_count} ZKTeco device(s)")
        
        if device_count > 0:
            print()
            print("🎉 SUCCESS! USB fingerprint scanner is detected!")
        else:
            print()
            print("⚠️  pyzkfp works, but NO devices detected.")
            print("   Please:")
            print("   1. Connect your ZKTeco fingerprint scanner via USB")
            print("   2. Check Device Manager for 'SLK20R' or 'ZKTeco' device")
            print("   3. Install ZKTeco drivers if needed")
        
        zkfp2.Terminate()
    except Exception as e:
        print(f"⚠️  pyzkfp imported but initialization failed: {e}")
        print("   This might be OK if scanner is not connected yet")
    
except ImportError as e:
    print(f"❌ CRITICAL ERROR: Cannot import pyzkfp!")
    print(f"   Error: {e}")
    print()
    print("SOLUTION:")
    print("  Run: FIX_PYZKFP_INSTALLATION.bat (as Administrator)")
    print()

# Package versions
print()
print("=" * 80)
print("INSTALLED PACKAGE VERSIONS")
print("=" * 80)
print()

all_packages = ['pyzkfp', 'pymongo', 'python-dotenv', 'pillow', 'requests', 'dnspython']
for pkg in all_packages:
    version = get_package_version(pkg)
    print(f"{pkg:20} {version}")

print()
print("=" * 80)

if critical_ok and optional_ok:
    print("✅ ALL PACKAGES INSTALLED CORRECTLY!")
    print()
    print("Next steps:")
    print("  1. Make sure ZKTeco scanner is connected via USB")
    print("  2. Restart Fingerprint Bridge Service")
    print("  3. Check dashboard for device status")
elif critical_ok:
    print("⚠️  CRITICAL PACKAGES OK, but optional packages missing")
    print("   System might work with reduced functionality")
else:
    print("❌ CRITICAL PACKAGES MISSING!")
    print()
    print("   Run: FIX_PYZKFP_INSTALLATION.bat (as Administrator)")

print("=" * 80)
