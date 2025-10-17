import socket
import sys
from datetime import datetime

class RealTimeBiometricManager:
    def __init__(self, ip_address="192.168.1.201", port=4370, timeout=30):
        self.ip_address = ip_address
        self.port = port
        self.timeout = timeout
        print(f"🔧 Biometric Manager initialized for: {ip_address}")

    def test_tcp_connection(self):
        """Test if device is reachable via TCP"""
        try:
            print(f"🔌 Testing TCP connection to {self.ip_address}:{self.port}...")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((self.ip_address, self.port))
            sock.close()
            
            if result == 0:
                print(f"✅ SUCCESS: Device is reachable at {self.ip_address}")
                return True
            else:
                print(f"❌ FAILED: Cannot connect to {self.ip_address} (Error: {result})")
                return False
                
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False

    def discover_devices(self):
        """Discover ZKTeco devices in common IP ranges"""
        common_ips = [
            '192.168.1.201', '192.168.1.202', '192.168.1.203',
            '192.168.0.201', '192.168.0.202', '192.168.0.203',
            '169.254.0.1', '169.254.0.2', '10.0.0.201', '10.0.0.202'
        ]
        
        print("🔍 Discovering ZKTeco devices...")
        found_devices = []
        
        for ip in common_ips:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((ip, 4370))
                sock.close()
                
                if result == 0:
                    print(f"   ✅ Found device at: {ip}")
                    found_devices.append(ip)
                else:
                    print(f"   ❌ No device at: {ip}")
                    
            except:
                print(f"   ⚠️  Timeout at: {ip}")
        
        return found_devices

    def get_connection_status(self):
        """Get connection status"""
        return {
            "ip_address": self.ip_address,
            "port": self.port,
            "status": "connected" if self.test_tcp_connection() else "disconnected",
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 ZKTeco Biometric Device Connection Test")
    print("=" * 50)
    
    manager = RealTimeBiometricManager()
    
    print("\n1. Testing specific IP...")
    manager.test_tcp_connection()
    
    print("\n2. Discovering devices...")
    devices = manager.discover_devices()
    
    if devices:
        print(f"\n🎉 Found {len(devices)} device(s): {devices}")
    else:
        print(f"\n💡 No devices found automatically.")
        print("💡 Since your ZKFinger Demo works, the device is USB-connected.")
        print("💡 For USB connection, use the ZKFinger SDK directly.")
    
    print("\n📋 Connection Status:", manager.get_connection_status())
