#!/usr/bin/env python3
"""
Test script for the HTTP server functionality
"""
import json
import requests
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

class TestDeletionRequestHandler(BaseHTTPRequestHandler):
    """Test HTTP request handler for deletion requests"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def do_POST(self):
        """Handle POST requests for deletion"""
        if self.path == '/delete-employee':
            try:
                # Read the request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                employee_id = data.get('employeeId')
                if not employee_id:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'employeeId is required'}).encode())
                    return

                print(f"✅ Test server received deletion request for employee: {employee_id}")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': f'Deletion request received for employee {employee_id}'}).encode())

            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Override to reduce noise"""
        pass

def start_test_server():
    """Start test HTTP server"""
    def run_server():
        try:
            server_address = ('', 8080)
            httpd = HTTPServer(server_address, TestDeletionRequestHandler)
            print("🧪 Test HTTP server started on port 8080")
            httpd.serve_forever()
        except Exception as e:
            print(f"❌ Test server error: {str(e)}")

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return server_thread

def test_deletion_endpoint():
    """Test the deletion endpoint"""
    print("🧪 Testing deletion endpoint...")

    # Wait a moment for server to start
    time.sleep(1)

    test_employee_id = "TEST123"

    try:
        response = requests.post(
            'http://localhost:8080/delete-employee',
            json={'employeeId': test_employee_id},
            timeout=5
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Test successful: {result}")
            return True
        else:
            print(f"❌ Test failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Test request error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Starting HTTP server test...")

    # Start the test server
    server_thread = start_test_server()

    # Test the endpoint
    success = test_deletion_endpoint()

    if success:
        print("✅ HTTP server test completed successfully!")
    else:
        print("❌ HTTP server test failed!")

    # Keep server running for a moment
    time.sleep(2)
