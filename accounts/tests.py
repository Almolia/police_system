from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Role

User = get_user_model()

class AccountsTests(APITestCase):
    
    def setUp(self):
        # 1. Setup Base Roles
        self.role_citizen = Role.objects.create(name="Citizen", codename="CITIZEN")
        self.role_chief = Role.objects.create(name="Chief of Police", codename="CHIEF")
        self.role_officer = Role.objects.create(name="Police Officer", codename="OFFICER")

        # 2. Setup Test Users
        self.chief_user = User.objects.create_user(
            username="chief_admin",
            national_id="0000000001",
            phone_number="09120000001",
            email="chief@police.ir",
            first_name="Chief",
            last_name="Commander",
            password="chiefpassword123"
        )
        self.chief_user.role = self.role_chief
        self.chief_user.save()

        self.officer_user = User.objects.create_user(
            username="officer_john",
            national_id="0000000002",
            phone_number="09120000002",
            email="officer@police.ir",
            first_name="John",
            last_name="Doe",
            password="officerpassword123"
        )
        self.officer_user.role = self.role_officer
        self.officer_user.save()

        # 3. URLs
        self.register_url = reverse('accounts:citizen_register')
        self.profile_url = reverse('accounts:user_profile')
        self.staff_register_url = reverse('accounts:staff_register')

    # ═══════════════════════════════════════════════════════════════
    # 1. MODEL & MANAGER TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_create_user_hashes_password(self):
        """Ensure the custom manager hashes the password properly."""
        user = User.objects.get(username="chief_admin")
        self.assertFalse(user.password == "chiefpassword123") # Should be hashed
        self.assertTrue(user.check_password("chiefpassword123"))

    def test_create_user_missing_national_id(self):
        """Ensure creating a user without a national ID raises an error."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                username="test", national_id="", phone_number="09121234567", 
                email="a@a.com", first_name="A", last_name="B", password="123"
            )

    # ═══════════════════════════════════════════════════════════════
    # 2. CITIZEN REGISTRATION TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_citizen_registration_success(self):
        """A normal user should be able to register and get the CITIZEN role."""
        data = {
            "national_id": "1234567890",
            "phone_number": "09123456789",
            "email": "newcitizen@example.com",
            "first_name": "Ali",
            "last_name": "Rezaei",
            "username": "alirezaei",
            "password": "strongpassword123",
            "password_confirm": "strongpassword123"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify they were actually saved to DB with the correct role
        new_user = User.objects.get(username="alirezaei")
        self.assertEqual(new_user.role.codename, "CITIZEN")

    def test_citizen_registration_password_mismatch(self):
        """If passwords don't match, the API must reject the request."""
        data = {
            "national_id": "1234567890",
            "phone_number": "09123456789",
            "email": "bad@example.com",
            "first_name": "Bad",
            "last_name": "User",
            "username": "baduser",
            "password": "password123",
            "password_confirm": "password456"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_citizen_registration_invalid_phone(self):
        """Phone number must start with 09 and be 11 digits."""
        data = {
            "national_id": "1234567890",
            "phone_number": "08123456789",
            "email": "phone@example.com",
            "first_name": "Phone",
            "last_name": "User",
            "username": "phoneuser",
            "password": "password123",
            "password_confirm": "password123"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ═══════════════════════════════════════════════════════════════
    # 3. PROFILE VIEW TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_profile_requires_authentication(self):
        """Unauthenticated users cannot view the profile endpoint."""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update_readonly_fields(self):
        """Users cannot change their national_id via the profile endpoint."""
        self.client.force_authenticate(user=self.officer_user)
        
        # Try to maliciously update the national ID
        data = {"national_id": "9999999999", "first_name": "Johnny"}
        response = self.client.patch(self.profile_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from DB to see what actually changed
        self.officer_user.refresh_from_db()
        self.assertEqual(self.officer_user.first_name, "Johnny")
        self.assertEqual(self.officer_user.national_id, "0000000002")

    # ═══════════════════════════════════════════════════════════════
    # 4. STAFF CREATION (PERMISSIONS) TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_officer_cannot_create_staff(self):
        """A regular police officer should get a 403 Forbidden when trying to hire staff."""
        self.client.force_authenticate(user=self.officer_user)
        data = {
            "national_id": "5555555555", "phone_number": "09125555555",
            "email": "new_cadet@police.ir", "first_name": "New", "last_name": "Cadet",
            "username": "newcadet", "password": "password123", "role": self.role_officer.id
        }
        response = self.client.post(self.staff_register_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_chief_can_create_staff(self):
        """The Chief of Police CAN create new staff."""
        self.client.force_authenticate(user=self.chief_user)
        data = {
            "national_id": "5555555555", "phone_number": "09125555555",
            "email": "new_cadet@police.ir", "first_name": "New", "last_name": "Cadet",
            "username": "newcadet", "password": "password123", "role": self.role_officer.id
        }
        response = self.client.post(self.staff_register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)