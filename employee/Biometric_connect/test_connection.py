import requests

def test_backend_connection():
    try:
        # Test basic connection
        print("Testing backend connection...")
        response = requests.get("http://localhost:5000/api/fingerprint/test", timeout=5)
        print(f"Test response: {response.status_code} - {response.text}")
        
        # Test duplicate check with a real template
        print("\nTesting duplicate check...")
        duplicate_data = {
            "fingerprintTemplate": "test123",
            "excludeEmployeeId": None
        }
        
        response = requests.post(
            "http://localhost:5000/api/fingerprint/check-duplicate",
            json=duplicate_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Duplicate check response: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_backend_connection()
