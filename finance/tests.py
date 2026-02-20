from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

# Import models from our other apps
from accounts.models import Role
from investigation.models import Suspect, Interrogation
from cases.models import Case
from finance.models import Reward, Transaction

User = get_user_model()

class FinanceAppTests(APITestCase):
    
    def setUp(self):
        # 1. Setup Roles
        self.role_citizen = Role.objects.create(name="Citizen", codename="CITIZEN")
        self.role_officer = Role.objects.create(name="Officer", codename="OFFICER")

        # 2. Setup Users
        self.citizen_user = User.objects.create_user(
            username="citizen_tester",
            national_id="1111111111",
            phone_number="09121111111",
            email="citizen@test.com",
            first_name="Test",
            last_name="Citizen",
            password="password123"
        )
        self.citizen_user.role = self.role_citizen
        self.citizen_user.save()

        self.officer_user = User.objects.create_user(
            username="officer_tester",
            national_id="2222222222",
            phone_number="09122222222",
            email="officer@test.com",
            first_name="Test",
            last_name="Officer",
            password="password123"
        )
        self.officer_user.role = self.role_officer
        self.officer_user.save()

        # 3. Setup Mock Investigation Data
        self.suspect = Suspect.objects.create(alias="The Phantom")
        
        self.case = Case.objects.create(title="Grand Theft", crime_level=3)
        
        # Creating this triggers the auto-calc
        self.interrogation = Interrogation.objects.create(
            case=self.case, 
            suspect=self.suspect, 
            bail_amount=500_000_000
        )

        # bypassing the Django save() signals
        Suspect.objects.filter(id=self.suspect.id).update(cached_ranking_score=15)
        self.suspect.refresh_from_db()

        # 5. URLs
        self.submit_tip_url = reverse('finance:submit_tip')
        self.initiate_payment_url = reverse('finance:initiate_payment')

    # ═══════════════════════════════════════════════════════════════
    # 1. REWARD SUBMISSION TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_citizen_can_submit_tip_and_math_is_correct(self):
        """
        A citizen should be able to submit a tip.
        The amount MUST be calculated automatically: 15 (score) * 20m = 300,000,000.
        """
        self.client.force_authenticate(user=self.citizen_user)
        
        data = {
            "suspect": self.suspect.id,
            "description": "I saw him near the central bank!"
        }
        
        response = self.client.post(self.submit_tip_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the math in the database
        reward = Reward.objects.get(id=response.data['id'])
        self.assertEqual(reward.amount, 300_000_000) # 15 * 20m
        self.assertEqual(reward.citizen, self.citizen_user)

    def test_officer_cannot_submit_tip(self):
        """Police officers cannot claim rewards."""
        self.client.force_authenticate(user=self.officer_user)
        
        data = {
            "suspect": self.suspect.id,
            "description": "I found him."
        }
        
        response = self.client.post(self.submit_tip_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hacker_cannot_forge_reward_amount(self):
        """
        If a user manipulates the JSON payload to include a massive 'amount',
        the Serializer MUST ignore it and overwrite it with the real calculation.
        """
        self.client.force_authenticate(user=self.citizen_user)
        
        data = {
            "suspect": self.suspect.id,
            "description": "Here is a tip.",
            "amount": 999_999_999_999_999,  # Malicious injection
            "status": "PAID"                # Trying to mark it as already paid
        }
        
        response = self.client.post(self.submit_tip_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        reward = Reward.objects.get(id=response.data['id'])
        
        # Security checks!
        self.assertEqual(reward.amount, 300_000_000) # Must be the formula, NOT the fake amount
        self.assertEqual(reward.status, 'PENDING')   # Status must stay PENDING

    # ═══════════════════════════════════════════════════════════════
    # 2. TRANSACTION / PAYMENT TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_initiate_payment_creates_authority_code(self):
        """
        When a user initiates a payment, the system should save it as PENDING
        and generate an authority code for the gateway redirect.
        """
        self.client.force_authenticate(user=self.citizen_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "transaction_type": "BAIL",
            "amount": 500_000_000
        }
        
        response = self.client.post(self.initiate_payment_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the gateway response looks correct
        self.assertIn('authority', response.data)
        self.assertTrue(response.data['authority'].startswith('A'))
        
        # Verify it saved in DB correctly
        transaction = Transaction.objects.get(authority=response.data['authority'])
        self.assertEqual(transaction.status, 'PENDING')
        self.assertEqual(transaction.payer, self.citizen_user)

    def test_unauthenticated_user_cannot_pay(self):
        """Guests cannot hit the payment endpoint."""
        data = {
            "interrogation": self.interrogation.id,
            "transaction_type": "BAIL",
            "amount": 500_000_000
        }
        response = self.client.post(self.initiate_payment_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)