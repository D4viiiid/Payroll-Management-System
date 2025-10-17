#!/usr/bin/env python3
"""
Fingerprint Capture Script for ZKTeco Device
Captures a single fingerprint and returns the template for attendance processing
Supports health check mode for device connectivity testing
"""

import sys
import json
import time
import base64
from pyzkfp import ZKFP2

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
                # Some devices support getting parameters, but we'll skip this for now
                pass
            except:
                pass  # Not all devices support this

            # Skip light control for health check to avoid errors
            # Light control can be problematic on some devices

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

def capture_fingerprint():
    """Capture a single fingerprint from ZKTeco device"""
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

        # Skip light control to avoid device compatibility issues
        # Some devices don't support light control or have different color parameters

        print("Place your finger on the scanner...", file=sys.stderr)

        # Capture fingerprint with timeout
        start_time = time.time()
        timeout = 15  # 15 seconds timeout

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
            "error": "Fingerprint capture timeout - no finger detected within 15 seconds"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Device initialization failed: {str(e)}"
        }

def main():
    """Main function"""
    # Check if this is a health check call
    if len(sys.argv) > 1 and sys.argv[1] == "--health":
        result = check_device_health()
    else:
        result = capture_fingerprint()

    # Output JSON result to stdout
    print(json.dumps(result))

    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
