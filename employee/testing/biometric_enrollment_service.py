import http.server
import socketserver
import json
import threading
from datetime import datetime
import sys
import os

try:
    from zk import ZK
    ZK_AVAILABLE = True
except ImportError:
    ZK_AVAILABLE = False
    print("⚠️  zk module not available - running in simulation mode")

class BiometricEnrollmentService:
    def __init__(self, port=8000):
        self.port = port
        self.zk_device = None
        self.is_scanning = False
        self.current_scan_data = None
        
    def connect_to_device(self):
        """Connect to ZKTeco biometric device"""
        if not ZK_AVAILABLE:
            print("🔸 Running in simulation mode (no zk module)")
            return True
            
        try:
            # Try USB connection first
            self.zk_device = ZK(ip='', port=0, timeout=30)
            connection = self.zk_device.connect()
            
            if connection:
                device_name = self.zk_device.get_device_name()
                print(f"✅ Connected to device: {device_name}")
                return True
            else:
                print("❌ Failed to connect to device")
                return False
                
        except Exception as e:
            print(f"❌ Device connection error: {e}")
            return False
    
    def start_enrollment(self, employee_data):
        """Start fingerprint enrollment process"""
        if not ZK_AVAILABLE:
            # Simulation mode
            print(f"🔸 SIMULATION: Enrolling fingerprint for {employee_data['name']}")
            return self.simulate_enrollment(employee_data)
            
        try:
            print(f"🔹 Starting enrollment for: {employee_data['name']}")
            
            # Placeholder for actual ZKFinger enrollment logic
            # This would use zk_device.enroll() or similar method
            
            # For now, simulate the process
            return self.simulate_enrollment(employee_data)
            
        except Exception as e:
            print(f"❌ Enrollment error: {e}")
            return {"success": False, "error": str(e)}
    
    def simulate_enrollment(self, employee_data):
        """Simulate enrollment process (for testing)"""
        import time
        
        print("👆 Please place finger on scanner...")
        time.sleep(2)
        
        print("🔹 Scanning fingerprint...")
        time.sleep(2)
        
        print("✅ Fingerprint captured successfully!")
        time.sleep(1)
        
        # Generate template data (simulated)
        template_data = f"FP_TEMPLATE_{employee_data['employeeId']}_{datetime.now().timestamp()}"
        
        return {
            "success": True,
            "employeeId": employee_data["employeeId"],
            "template": template_data,
            "timestamp": datetime.now().isoformat(),
            "message": "Fingerprint enrolled successfully"
        }
    
    def start_http_server(self):
        """Start HTTP server for React communication"""
        class EnrollmentHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                self.enrollment_service = kwargs.pop('enrollment_service')
                super().__init__(*args, **kwargs)
            
            def do_OPTIONS(self):
                self.send_response(200)
                self.send_cors_headers()
            
            def send_cors_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            
            def do_GET(self):
                if self.path == '/health':
                    self.send_response(200)
                    self.send_cors_headers()
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    
                    status = {
                        "status": "running",
                        "device_connected": self.enrollment_service.zk_device is not None,
                        "simulation_mode": not ZK_AVAILABLE
                    }
                    self.wfile.write(json.dumps(status).encode())
                    
                elif self.path == '/status':
                    self.send_response(200)
                    self.send_cors_headers()
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    
                    status = {
                        "is_scanning": self.enrollment_service.is_scanning,
                        "current_scan": self.enrollment_service.current_scan_data
                    }
                    self.wfile.write(json.dumps(status).encode())
                    
                else:
                    self.send_response(404)
                    self.send_cors_headers()
                    self.end_headers()
            
            def do_POST(self):
                if self.path == '/enroll':
                    content_length = int(self.headers['Content-Length'])
                    post_data = self.rfile.read(content_length)
                    
                    try:
                        employee_data = json.loads(post_data.decode())
                        
                        self.send_response(200)
                        self.send_cors_headers()
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        
                        # Start enrollment
                        self.enrollment_service.is_scanning = True
                        self.enrollment_service.current_scan_data = employee_data
                        
                        result = self.enrollment_service.start_enrollment(employee_data)
                        
                        self.enrollment_service.is_scanning = False
                        self.enrollment_service.current_scan_data = None
                        
                        self.wfile.write(json.dumps(result).encode())
                        
                    except Exception as e:
                        self.send_response(500)
                        self.send_cors_headers()
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        
                        error_response = {
                            "success": False,
                            "error": str(e)
                        }
                        self.wfile.write(json.dumps(error_response).encode())
                
                else:
                    self.send_response(404)
                    self.send_cors_headers()
                    self.end_headers()
        
        handler = lambda *args: EnrollmentHandler(*args, enrollment_service=self)
        server = socketserver.TCPServer(("", self.port), handler)
        
        print(f"🚀 Biometric Enrollment Service running on port {self.port}")
        print(f"🔗 React can connect to: http://localhost:{self.port}")
        
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")
            if self.zk_device:
                self.zk_device.disconnect()

def main():
    service = BiometricEnrollmentService()
    
    print("=" * 50)
    print("🖐️  Biometric Enrollment Service")
    print("=" * 50)
    
    # Connect to device
    if not service.connect_to_device():
        print("⚠️  Running in simulation mode only")
    
    # Start HTTP server
    service.start_http_server()

if __name__ == "__main__":
    main()