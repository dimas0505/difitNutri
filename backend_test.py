import requests
import sys
import json
from datetime import datetime

class DiNutriAPITester:
    def __init__(self, base_url="https://diet-connect-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.nutritionist_token = None
        self.patient_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.patient_id = None
        self.prescription_id = None
        self.invite_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if 'auth/login' in endpoint:
                    # Special handling for login endpoint (form data)
                    headers['Content-Type'] = 'application/x-www-form-urlencoded'
                    form_data = f"username={data['username']}&password={data['password']}"
                    response = requests.post(url, data=form_data, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_1_nutritionist_login(self):
        """Test 1: Nutritionist login"""
        print("\n" + "="*50)
        print("TEST 1: NUTRITIONIST LOGIN")
        print("="*50)
        
        success, response = self.run_test(
            "Nutritionist Login",
            "POST",
            "auth/login",
            200,
            data={"username": "pro@dinutri.app", "password": "password123"}
        )
        if success and 'access_token' in response:
            self.nutritionist_token = response['access_token']
            print(f"✅ Token obtained: {self.nutritionist_token[:20]}...")
            return True
        return False

    def test_2_get_me(self):
        """Test 2: Get user info"""
        print("\n" + "="*50)
        print("TEST 2: GET USER INFO")
        print("="*50)
        
        success, response = self.run_test(
            "Get User Info",
            "GET",
            "me",
            200,
            token=self.nutritionist_token
        )
        if success and response.get('role') == 'nutritionist':
            print(f"✅ User role verified: {response.get('role')}")
            return True
        return False

    def test_3_create_patient(self):
        """Test 3: Create patient (Alice Doe)"""
        print("\n" + "="*50)
        print("TEST 3: CREATE PATIENT")
        print("="*50)
        
        success, response = self.run_test(
            "Create Patient Alice Doe",
            "POST",
            "patients",
            200,
            data={
                "name": "Alice Doe",
                "email": "alice@example.com"
            },
            token=self.nutritionist_token
        )
        if success and 'id' in response:
            self.patient_id = response['id']
            print(f"✅ Patient created with ID: {self.patient_id}")
            return True
        return False

    def test_4_create_prescription(self):
        """Test 4: Create and publish prescription"""
        print("\n" + "="*50)
        print("TEST 4: CREATE AND PUBLISH PRESCRIPTION")
        print("="*50)
        
        prescription_data = {
            "patientId": self.patient_id,
            "title": "Plano Semanal",
            "status": "published",
            "meals": [
                {
                    "id": "meal-1",
                    "name": "Café da Manhã",
                    "items": [
                        {
                            "id": "item-1",
                            "description": "Ovos mexidos",
                            "amount": "2 unidades",
                            "substitutions": ["Queijo branco", "Iogurte grego"]
                        }
                    ],
                    "notes": ""
                }
            ],
            "generalNotes": ""
        }
        
        success, response = self.run_test(
            "Create Published Prescription",
            "POST",
            "prescriptions",
            200,
            data=prescription_data,
            token=self.nutritionist_token
        )
        if success and 'id' in response:
            self.prescription_id = response['id']
            print(f"✅ Prescription created with ID: {self.prescription_id}")
            print(f"✅ Status: {response.get('status')}")
            return True
        return False

    def test_5_get_latest_prescription(self):
        """Test 5: Get latest prescription for patient"""
        print("\n" + "="*50)
        print("TEST 5: GET LATEST PRESCRIPTION")
        print("="*50)
        
        success, response = self.run_test(
            "Get Latest Prescription",
            "GET",
            f"patients/{self.patient_id}/latest",
            200,
            token=self.nutritionist_token
        )
        if success and response and response.get('id') == self.prescription_id:
            print(f"✅ Latest prescription retrieved: {response.get('title')}")
            print(f"✅ Meals count: {len(response.get('meals', []))}")
            meals = response.get('meals', [])
            if meals and len(meals) > 0:
                first_meal = meals[0]
                print(f"✅ First meal name: {first_meal.get('name')}")
                items = first_meal.get('items', [])
                if items and len(items) > 0:
                    first_item = items[0]
                    print(f"✅ First item: {first_item.get('description')} - {first_item.get('amount')}")
                    print(f"✅ Substitutions: {first_item.get('substitutions')}")
            return True
        return False

    def test_6_invite_flow(self):
        """Test 6: Complete invite flow"""
        print("\n" + "="*50)
        print("TEST 6: INVITE FLOW")
        print("="*50)
        
        # Create invite
        success, response = self.run_test(
            "Create Invite",
            "POST",
            "invites",
            200,
            data={"email": "bob@example.com", "expiresInHours": 1},
            token=self.nutritionist_token
        )
        if not success or 'token' not in response:
            return False
        
        self.invite_token = response['token']
        print(f"✅ Invite created with token: {self.invite_token[:20]}...")
        
        # Get invite details
        success, response = self.run_test(
            "Get Invite Details",
            "GET",
            f"invites/{self.invite_token}",
            200
        )
        if not success or response.get('status') != 'active' or response.get('email') != 'bob@example.com':
            return False
        
        print(f"✅ Invite status: {response.get('status')}")
        print(f"✅ Invite email: {response.get('email')}")
        
        # Accept invite
        success, response = self.run_test(
            "Accept Invite",
            "POST",
            f"invites/{self.invite_token}/accept",
            201,
            data={"name": "Bob", "password": "bobpass"}
        )
        if not success or response.get('role') != 'patient':
            return False
        
        print(f"✅ Invite accepted, patient created: {response.get('name')}")
        patient_id = response.get('patientId')
        
        # Login as Bob
        success, response = self.run_test(
            "Bob Login",
            "POST",
            "auth/login",
            200,
            data={"username": "bob@example.com", "password": "bobpass"}
        )
        if not success or 'access_token' not in response:
            return False
        
        self.patient_token = response['access_token']
        print(f"✅ Bob logged in successfully")
        
        # Verify Bob's profile
        success, response = self.run_test(
            "Bob Profile Check",
            "GET",
            "me",
            200,
            token=self.patient_token
        )
        if success and response.get('role') == 'patient' and response.get('patientId'):
            print(f"✅ Bob's role: {response.get('role')}")
            print(f"✅ Bob's patient ID: {response.get('patientId')}")
            
            # Test patient access to their own record
            success, response = self.run_test(
                "Bob Access Own Patient Record",
                "GET",
                f"patients/{response.get('patientId')}",
                200,
                token=self.patient_token
            )
            if success:
                print(f"✅ Bob can access own patient record")
                
                # Test patient access to latest prescription (should be null initially)
                success, response = self.run_test(
                    "Bob Get Latest Prescription",
                    "GET",
                    f"patients/{response.get('patientId')}/latest",
                    200,
                    token=self.patient_token
                )
                if success:
                    print(f"✅ Bob can access latest prescription endpoint")
                    print(f"   Latest prescription: {response}")
                    return True
        
        return False

    def test_7_security_checks(self):
        """Test 7: Basic security checks"""
        print("\n" + "="*50)
        print("TEST 7: SECURITY CHECKS")
        print("="*50)
        
        # Test accessing patients without token
        success, response = self.run_test(
            "Access Patients Without Token",
            "GET",
            "patients",
            401
        )
        if success:
            print("✅ Unauthorized access properly blocked")
        
        # Test patient trying to access nutritionist endpoints
        if self.patient_token:
            success, response = self.run_test(
                "Patient Access Nutritionist Endpoints",
                "GET",
                "patients",
                403,
                token=self.patient_token
            )
            if success:
                print("✅ Patient properly blocked from nutritionist endpoints")
                return True
        
        return False

def main():
    print("🧪 DiNutri API Testing Suite")
    print("="*60)
    
    tester = DiNutriAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_1_nutritionist_login,
        tester.test_2_get_me,
        tester.test_3_create_patient,
        tester.test_4_create_prescription,
        tester.test_5_get_latest_prescription,
        tester.test_6_invite_flow,
        tester.test_7_security_checks
    ]
    
    for test in tests:
        try:
            if not test():
                print(f"\n❌ Test {test.__name__} failed, stopping execution")
                break
        except Exception as e:
            print(f"\n❌ Test {test.__name__} crashed: {str(e)}")
            break
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())