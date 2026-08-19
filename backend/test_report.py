import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000/api"

# Login as citizen
print("1. Logging in as citizen...")
login_data = urllib.parse.urlencode({
    "username": "citizen@roadwatch.in",
    "password": "Citizen@123"
}).encode("utf-8")

req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data)
try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        token = res["access_token"]
        print("Login successful.")
except urllib.error.HTTPError as e:
    print(f"Login failed! {e.code} {e.read().decode()}")
    exit(1)

# Submit sample report
print("\n2. Submitting sample illegal parking report...")
report_data = json.dumps({
    "type": "ILLEGAL_PARKING",
    "location_lat": 28.6139,
    "location_lng": 77.2090,
    "location_desc": "Sector 21 Market - Front of Pharmacy",
    "description": "White car parked on the sidewalk blocking pedestrian access.",
    "vehicle_number": "HR-26-XX-1234",
    "media_url": "https://example.com/sample_image.jpg"
}).encode("utf-8")

req2 = urllib.request.Request(
    f"{BASE_URL}/reports",
    data=report_data,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req2) as response2:
        report = json.loads(response2.read().decode())
        print("\n✅ Success! Report submitted successfully.")
        print(f"Report ID: {report['id']}")
        print(f"Tracking Number: {report['tracking_number']}")
        print(f"Status: {report['status']}")
except urllib.error.HTTPError as e:
    print(f"Failed to submit report! {e.code} {e.read().decode()}")
