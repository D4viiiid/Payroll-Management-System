#!/usr/bin/env python3
"""
Simple test script to check if ZKTeco fingerprint device is working
"""

import sys
import json
from pyzkfp import ZKFP2

def test_device():
    """Test basic device connectivity"""
    try:
        print("🔍 Testing ZKTeco device connectivity...", file=sys.stderr)

        # Initialize ZKTeco device
        zkfp2 = ZKFP2()
        zkfp2.Init()

        # Get device count
        device_count = zkfp2.GetDeviceCount()
        print(f"📊 Device count: {device_count}", file=sys.stderr)

        if device_count == 0:
            return {
                "success": False,
                "error": "No ZKTeco fingerprint devices found",
                "device_count": 0
            }

        # Try to open first device
        try:
            print("🔌 Opening device...", file=sys.stderr)
            zkfp2.OpenDevice(0)
            # Note: Some versions of pyzkfp don't have Start() method
            # We'll test without it first
            print("✅ Device opened successfully", file=sys.stderr)

            # Terminate device connection
            zkfp2.Terminate()
            print("🔌 Device connection terminated", file=sys.stderr)

            return {
                "success": True,
                "message": "Device is connected and working properly",
                "device_count": device_count
            }

        except Exception as e:
            print(f"❌ Failed to open device: {e}", file=sys.stderr)
            try:
                zkfp2.Terminate()
            except:
                pass
            return {
                "success": False,
                "error": f"Failed to open device: {str(e)}",
                "device_count": device_count
            }

    except Exception as e:
        print(f"❌ Device initialization failed: {e}", file=sys.stderr)
        return {
            "success": False,
            "error": f"Device initialization failed: {str(e)}"
        }

if __name__ == "__main__":
    result = test_device()
    print(json.dumps(result))
    sys.exit(0 if result["success"] else 1)
