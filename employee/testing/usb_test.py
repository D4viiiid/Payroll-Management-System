# usb_test.py
import os
import clr

dll_path = r"C:\Users\Allan\Downloads\ZKFingerSDK-5.3_ZK10.0\ZKFingerSDK 5.3_ZK10.0\ZKFingerSDK 5.3_Windows_ZK10.0\C#\lib\x64\libzkfpcsharp.dll"

print("Testing Fingerprint Scanner After Driver Installation...")

try:
    clr.AddReference(dll_path)
    from libzkfpcsharp import zkfp2
    import System
    
    zkfp_instance = zkfp2()
    
    init_result = zkfp_instance.Init()
    print(f"Init result: {init_result}")
    
    if init_result == 0:
        device_count = zkfp_instance.GetDeviceCount()
        print(f"Connected devices: {device_count}")
        
        if device_count > 0:
            device_handle = zkfp_instance.OpenDevice(0)
            print(f"Device handle: {device_handle}")
            
            if device_handle != System.IntPtr.Zero:
                print("✅ SCANNER WORKING! Ready for fingerprint capture.")
                zkfp_instance.CloseDevice(device_handle)
            else:
                print("❌ Device opened but invalid handle")
        else:
            print("❌ No devices found - check connection")
    else:
        print("❌ Init failed")
        
    zkfp_instance.Terminate()
    
except Exception as e:
    print(f"Error: {e}")