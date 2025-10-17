from flask import Flask, jsonify
import time

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'running',
        'service': 'fingerprint-biometrics',
        'message': 'Service is healthy and ready'
    })

@app.route('/api/initialize', methods=['POST'])
def initialize_scanner():
    return jsonify({
        'success': True,
        'message': 'Scanner initialized successfully'
    })

@app.route('/api/capture', methods=['POST'])
def capture_fingerprint():
    time.sleep(2)
    return jsonify({
        'success': True,
        'data': {
            'template': 'mock_fingerprint_template_data_12345',
            'size': 1024,
            'message': 'Fingerprint captured successfully'
        }
    })

@app.route('/api/devices', methods=['GET'])
def get_devices():
    return jsonify({
        'success': True,
        'device_count': 1,
        'devices': [{'id': 0, 'status': 'connected'}]
    })

if __name__ == '__main__':
    print("🚀 SIMPLE Fingerprint Service Started!")
    print("📡 Endpoints:")
    print("  GET  http://localhost:5001/api/health")
    print("  POST http://localhost:5001/api/initialize") 
    print("  POST http://localhost:5001/api/capture")
    print("  GET  http://localhost:5001/api/devices")
    app.run(host='0.0.0.0', port=5001, debug=True)
