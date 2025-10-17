# fingerprint_service.py
import clr
import os
import time
from flask import Flask, jsonify, request
import System
import json

print("=== STARTING FINGERPRINT SERVICE ===")

# Create Flask app FIRST
app = Flask(__name__)

# DLL path
dll_path = r"C:\Users\Allan\Downloads\ZKFingerSDK-5.3_ZK10.0\ZKFingerSDK 5.3_ZK10.0\ZKFingerSDK 5.3_Windows_ZK10.0\C#\lib\x64\libzkfpcsharp.dll"

try:
    clr.AddReference(dll_path)
    from libzkfpcsharp import zkfp2
    ZKFinger_available = True
    print("✅ Fingerprint SDK loaded successfully")
except Exception as e:
    ZKFinger_available = False
    print(f"❌ SDK load failed: {e}")

class FingerprintScanner:
    def __init__(self):
        self.zkfp = None
        self.device_handle = None
        
    def initialize(self):
        try:
            if not ZKFinger_available:
                return False, "SDK not loaded"
                
            self.zkfp = zkfp2()
            init_result = self.zkfp.Init()
            
            if init_result != 0:
                return False, f"Scanner initialization failed (Error: {init_result})"
            
            device_count = self.zkfp.GetDeviceCount()
            print(f"Found {device_count} devices")
            
            if device_count == 0:
                self.zkfp.Terminate()
                return False, "No fingerprint devices found"
            
            self.device_handle = self.zkfp.OpenDevice(0)
            if self.device_handle == System.IntPtr.Zero:
                self.zkfp.Terminate()
                return False, "Failed to open device"
            
            return True, "Scanner ready"
            
        except Exception as e:
            return False, str(e)
    
    def capture_fingerprint(self, timeout=30):
        try:
            if not self.device_handle:
                return False, "Scanner not initialized"
            
            print("Waiting for fingerprint...")
            start_time = time.time()
            
            # Prepare buffers for fingerprint data
            template_data = System.Array.CreateInstance(System.Byte, 2048)
            template_size = System.Array.CreateInstance(System.Int32, 1)
            template_size[0] = 2048
            
            # Wait for fingerprint capture
            while (time.time() - start_time) < timeout:
                capture_result = self.zkfp.AcquireFingerprint(self.device_handle, template_data, template_size)
                
                if capture_result == 0:
                    # Convert template to base64 for storage
                    template_bytes = bytearray()
                    for i in range(template_size[0]):
                        template_bytes.append(template_data[i])
                    
                    import base64
                    template_b64 = base64.b64encode(template_bytes).decode('utf-8')
                    
                    return True, {
                        'template': template_b64,
                        'size': template_size[0],
                        'message': 'Fingerprint captured successfully'
                    }
                
                time.sleep(0.1)
            
            return False, "Fingerprint capture timeout"
            
        except Exception as e:
            return False, str(e)
    
    def close(self):
        if hasattr(self, 'device_handle') and self.device_handle and self.device_handle != System.IntPtr.Zero:
            self.zkfp.CloseDevice(self.device_handle)
        if hasattr(self, 'zkfp') and self.zkfp:
            self.zkfp.Terminate()

# Global scanner instance
scanner = FingerprintScanner()

# ========== ROUTES ==========
@app.route('/')
def root():
    return jsonify({
        'message': 'Fingerprint Biometrics Service',
        'status': 'running',
        'endpoints': [
            'GET  /api/health',
            'GET  /api/devices', 
            'POST /api/initialize',
            'POST /api/capture',
            'POST /api/close'
        ]
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'running',
        'scanner_ready': ZKFinger_available,
        'service': 'fingerprint-biometrics',
        'message': 'Service is healthy and ready'
    })

@app.route('/api/initialize', methods=['POST'])
def initialize_scanner():
    success, message = scanner.initialize()
    return jsonify({
        'success': success,
        'message': message
    })

@app.route('/api/capture', methods=['POST'])
def capture_fingerprint():
    try:
        data = request.get_json()
        timeout = data.get('timeout', 30) if data else 30
        
        success, result = scanner.capture_fingerprint(timeout)
        
        if success:
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/devices', methods=['GET'])
def get_devices():
    try:
        if not ZKFinger_available:
            return jsonify({'success': False, 'error': 'SDK not loaded'})
            
        temp_scanner = zkfp2()
        temp_scanner.Init()
        device_count = temp_scanner.GetDeviceCount()
        temp_scanner.Terminate()
        
        return jsonify({
            'success': True,
            'device_count': device_count,
            'devices': [{'id': i, 'status': 'connected'} for i in range(device_count)]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/close', methods=['POST'])
def close_scanner():
    scanner.close()
    return jsonify({'success': True, 'message': 'Scanner closed'})

# ========== START SERVER ==========
if __name__ == '__main__':
    print("🚀 Fingerprint Biometrics Service Started!")
    print("📡 Available Endpoints:")
    print("   GET  http://localhost:5000/")
    print("   GET  http://localhost:5000/api/health")
    print("   GET  http://localhost:5000/api/devices")
    print("   POST http://localhost:5000/api/initialize")
    print("   POST http://localhost:5000/api/capture")
    print("   POST http://localhost:5000/api/close")
    print("\n📍 Ready for real fingerprint scanning!")
    
    # Test if routes are registered
    with app.app_context():
        print("\n📋 Registered Routes:")
        for rule in app.url_map.iter_rules():
            print(f"   {rule.methods} {rule}")
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=False)  # debug=False for cleaner output
    except Exception as e:
        print(f"❌ Server error: {e}")
        print("💡 Trying port 5001...")
        app.run(host='0.0.0.0', port=5001, debug=False)