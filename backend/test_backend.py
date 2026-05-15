import requests

BASE_URL = "http://localhost:8000"

# Test 1: Health Check
print("Testing /api/health...")
response = requests.get(f"{BASE_URL}/api/health")
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test 2: Get Documents (empty list)
print("Testing /api/documents...")
response = requests.get(f"{BASE_URL}/api/documents")
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
print()

print("✅ All tests completed!")