import requests
import json
from datetime import datetime

class BackendConnector:
    """Connects biometric scans to your Node.js backend"""
    
    def __init__(self, backend_url="http://localhost:5000"):
        self.backend_url = backend_url
        self.connected = False
    
    def test_backend(self):
        """Test if backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/api/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend is running!")
                self.connected = True
                return True
        except:
            print("❌ Backend not reachable")
            print(f"💡 Make sure your Node.js server is running at {self.backend_url}")
        return False
    
    def send_attendance(self, scan_data):
        """Send attendance data to backend"""
        if not self.connected:
            print("❌ Not connected to backend")
            return False
            
        payload = {
            "employeeId": scan_data["user_id"],
            "employeeName": scan_data["user_name"],
            "timestamp": scan_data["timestamp"],
            "type": "check_in",
            "source": "biometric"
        }
        
        try:
            response = requests.post(
                f"{self.backend_url}/api/attendance",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ Attendance recorded: {scan_data['user_name']}")
                return True
            else:
                print(f"❌ Failed to record attendance: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

class BiometricService:
    """Main biometric service that connects everything"""
    
    def __init__(self):
        self.backend = BackendConnector()
        print("🚀 Biometric Service Started")
    
    def start(self):
        """Start the biometric service"""
        print("=" * 50)
        print("🔗 Starting Biometric Integration")
        print("=" * 50)
        
        # Test backend connection
        if not self.backend.test_backend():
            print("💡 Starting backend simulation mode...")
            return self.simulation_mode()
        
        # Ready for real scans
        print("🎯 Ready for fingerprint scans!")
        print("💡 Connect ZKFinger Demo to send real scan data")
        return True
    
    def simulation_mode(self):
        """Run in simulation mode for testing"""
        print("\n🧪 SIMULATION MODE - Test Data")
        print("=" * 30)
        
        test_scans = [
            {"user_id": "EMP001", "user_name": "Juan Dela Cruz"},
            {"user_id": "EMP002", "user_name": "Maria Santos"},
            {"user_id": "EMP003", "user_name": "Pedro Reyes"}
        ]
        
        for scan in test_scans:
            scan_data = {
                "user_id": scan["user_id"],
                "user_name": scan["user_name"],
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"👆 Simulating scan: {scan['user_name']}")
            # In simulation, just show what would be sent
            print(f"   📤 Would send: {scan_data}")
        
        print("\n🎉 Simulation completed!")
        print("💡 When backend is running, real scans will be sent automatically")
        return True

if __name__ == "__main__":
    service = BiometricService()
    service.start()
