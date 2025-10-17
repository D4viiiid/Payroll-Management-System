import requests

def test_duplicate_flow():
    try:
        # Test the duplicate check endpoint
        duplicate_check_data = {
            "fingerprintTemplate": "test123",
            "excludeEmployeeId": "EMP123"
        }
        
        response = requests.post(
            "http://localhost:5000/api/fingerprint/check-duplicate",
            json=duplicate_check_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_duplicate_flow()
