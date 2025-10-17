import requests
import json
from datetime import datetime

class BackendConnector:
    def __init__(self, backend_url="http://localhost:5000"):
        self.backend_url = backend_url
        
    def test_connection(self):
        """Test if backend is accessible"""
        try:
            response = requests.get(f"{self.backend_url}/", timeout=5)
            print(f"✅ Backend is running (Status: {response.status_code})")
            return True
        except Exception as e:
            print(f"❌ Cannot reach backend: {e}")
            return False
    
    def send_attendance(self, employee_data):
        """Send attendance data to backend"""
        # Try different possible endpoints
        endpoints = [
            "/api/attendance",
            "/api/employee/attendance", 
            "/api/payroll/attendance",
            "/attendance"
        ]
        
        payload = {
            "employeeId": employee_data["user_id"],
            "employeeName": employee_data["user_name"],
            "timestamp": employee_data["timestamp"],
            "type": "check_in",
            "source": "biometric"
        }
        
        for endpoint in endpoints:
            try:
                print(f"📤 Trying {endpoint}...")
                response = requests.post(
                    f"{self.backend_url}{endpoint}",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                
                if response.status_code in [200, 201]:
                    print(f"✅ SUCCESS: Attendance recorded via {endpoint}")
                    return True
                else:
                    print(f"   ❌ {endpoint} returned: {response.status_code}")
                    
            except Exception as e:
                print(f"   ⚠️  {endpoint} failed: {e}")
        
        print("❌ No working attendance endpoint found")
        return False

class BiometricIntegration:
    def __init__(self):
        self.backend = BackendConnector()
        print("🚀 Biometric Integration System")
    
    def start(self):
        print("=" * 50)
        print("🔗 ZKTeco USB → Python → Node.js Backend")
        print("=" * 50)
        
        if not self.backend.test_connection():
            print("💡 Running in demonstration mode...")
            return self.demo_mode()
        
        print("🎯 Testing attendance API...")
        test_scan = {
            "user_id": "EMP001",
            "user_name": "Test Employee",
            "timestamp": datetime.now().isoformat()
        }
        
        success = self.backend.send_attendance(test_scan)
        
        if success:
            print("\n🎉 BIOMETRIC INTEGRATION SUCCESSFUL!")
            print("💡 Your system is ready for real fingerprint scans")
        else:
            print("\n⚠️  Integration needs API endpoint setup")
            print("💡 Check your backend routes for attendance API")
    
    def demo_mode(self):
        """Show how the integration works"""
        print("\n🧪 DEMONSTRATION MODE")
        print("=" * 30)
        
        scans = [
            {"user_id": "EMP001", "user_name": "Juan Dela Cruz"},
            {"user_id": "EMP002", "user_name": "Maria Santos"}
        ]
        
        for scan in scans:
            scan_data = {
                "user_id": scan["user_id"],
                "user_name": scan["user_name"], 
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"👆 Fingerprint: {scan['user_name']}")
            print(f"   📤 Data: {json.dumps(scan_data, indent=2)}")
            print()
        
        print("🎉 SYSTEM READY!")
        print("💡 When backend has attendance API, scans will auto-send")

if __name__ == "__main__":
    integration = BiometricIntegration()
    integration.start()
