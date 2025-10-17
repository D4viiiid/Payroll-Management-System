# test_server.py
import requests
import time

def test_server():
    base_url = "http://localhost:5000"
    endpoints = ["/", "/api/health", "/api/devices"]
    
    print("Testing server accessibility...")
    
    for endpoint in endpoints:
        try:
            print(f"Testing {endpoint}...")
            response = requests.get(base_url + endpoint, timeout=5)
            print(f"✅ {endpoint}: Status {response.status_code}")
            print(f"   Response: {response.text[:100]}...")
        except requests.exceptions.ConnectionError:
            print(f"❌ {endpoint}: Connection refused")
        except requests.exceptions.Timeout:
            print(f"❌ {endpoint}: Timeout")
        except Exception as e:
            print(f"❌ {endpoint}: {e}")
        
        time.sleep(1)

if __name__ == "__main__":
    test_server()