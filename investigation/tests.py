from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

# Import models
from accounts.models import Role
from cases.models import Case
from investigation.models import Suspect, Interrogation

User = get_user_model()

class InvestigationAppTests(APITestCase):
    
    def setUp(self):
        # 1. Setup Roles for Hierarchy
        self.role_detective = Role.objects.create(name="Detective", codename="DETECTIVE")
        self.role_sergeant = Role.objects.create(name="Sergeant", codename="SERGEANT")
        self.role_captain = Role.objects.create(name="Captain", codename="CAPTAIN")
        
        # 2. Setup Users
        self.detective = User.objects.create_user(username="det", password="pw", role=self.role_detective)
        self.sergeant = User.objects.create_user(username="serg", password="pw", role=self.role_sergeant)
        self.captain = User.objects.create_user(username="cap", password="pw", role=self.role_captain)

        # 3. Setup Base Models
        # Crime Level (Di) = 4
        self.case = Case.objects.create(title="Bank Robbery", crime_level=4, status="INVESTIGATION")
        self.suspect = Suspect.objects.create(alias="Joker")
        
        # 4. URLs (Endpoints)
        self.interrogation_url = reverse('interrogation-list')
        self.sergeant_verdict_url = reverse('interrogation-sergeant-verdict', kwargs={'pk': 1})
        self.captain_verdict_url = reverse('interrogation-captain-verdict', kwargs={'pk': 1})

    # ═══════════════════════════════════════════════════════════════
    # 1. MATH & ALGORITHM TESTS (Document Section 4.4)
    # ═══════════════════════════════════════════════════════════════
    def test_suspect_metric_calculation_and_zero_day_fix(self):
        """
        Verify the formula Score = max(Lj) * max(Di).
        Also verifies the 'Day 0' bug fix (max(1, days)).
        """
        # Create an interrogation today
        Interrogation.objects.create(case=self.case, suspect=self.suspect)
        
        # Trigger the method
        score = self.suspect.calculate_metrics()
        
        # Di = 4. Lj (days since first crime) = today - today = 0 days. 
        # BUT our fix ensures Lj is at least 1.
        # Score = 1 * 4 = 4.
        self.assertEqual(score, 4)
        self.assertEqual(self.suspect.cached_ranking_score, 4)

    def test_auto_most_wanted_status_trigger(self):
        """
        If days passed (Lj) > 30, the suspect MUST automatically become MOST_WANTED.
        """
        interrogation = Interrogation.objects.create(case=self.case, suspect=self.suspect)
        
        # Mocking the creation date to 35 days ago
        interrogation.created_at = timezone.now() - timedelta(days=35)
        interrogation.save()
        
        self.suspect.calculate_metrics()
        
        # Lj = 35. Di = 4. Score = 35 * 4 = 140.
        self.assertEqual(self.suspect.cached_ranking_score, 140)
        self.assertEqual(self.suspect.status, 'MOST_WANTED') # Automatic state change!

    def test_reward_property_calculation(self):
        """The reward must be EXACTLY score * 20,000,000 Tomans."""
        self.suspect.cached_ranking_score = 15
        self.suspect.save()
        
        # 15 * 20,000,000 = 300,000,000
        self.assertEqual(self.suspect.reward_amount, 300_000_000)

    # ═══════════════════════════════════════════════════════════════
    # 2. HIERARCHY & VERDICT TESTS (Document Section 4.5)
    # ═══════════════════════════════════════════════════════════════
    def test_detective_can_create_interrogation_and_score(self):
        """Detective submitting an interrogation sets it to WAITING_FOR_SERGEANT."""
        self.client.force_authenticate(user=self.detective)
        data = {
            "case": self.case.id,
            "suspect": self.suspect.id,
            "detective_score": 8,
            "detective_report": "Suspect lied about alibi."
        }
        response = self.client.post(self.interrogation_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        interrogation = Interrogation.objects.get(id=response.data['id'])
        self.assertEqual(interrogation.status, 'WAITING_FOR_SERGEANT')

    def test_sergeant_verdict_approves_to_captain(self):
        """Sergeant approval moves interrogation to WAITING_FOR_CAPTAIN and case to INTERROGATION."""
        interrogation = Interrogation.objects.create(
            case=self.case, suspect=self.suspect, status='WAITING_FOR_SERGEANT'
        )
        self.sergeant_verdict_url = reverse('interrogation-sergeant-verdict', kwargs={'pk': interrogation.id})
        
        self.client.force_authenticate(user=self.sergeant)
        response = self.client.post(self.sergeant_verdict_url, {"approved": True})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        interrogation.refresh_from_db()
        self.case.refresh_from_db()
        
        self.assertEqual(interrogation.status, 'WAITING_FOR_CAPTAIN')
        self.assertEqual(self.case.status, 'INTERROGATION') # State machine rule from PDF

    def test_captain_verdict_logic_based_on_crime_level(self):
        """
        Captain approving a normal case (level <= 4) sends it to IN_COURT.
        (If it were level > 4, it would go to WAITING_FOR_CHIEF).
        """
        # Case crime_level is 4 (see setUp)
        interrogation = Interrogation.objects.create(
            case=self.case, suspect=self.suspect, status='WAITING_FOR_CAPTAIN'
        )
        self.captain_verdict_url = reverse('interrogation-captain-verdict', kwargs={'pk': interrogation.id})
        
        self.client.force_authenticate(user=self.captain)
        response = self.client.post(self.captain_verdict_url, {"approved": True})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        interrogation.refresh_from_db()
        self.case.refresh_from_db()
        
        self.assertEqual(interrogation.status, 'IN_COURT')
        self.assertEqual(self.case.status, 'IN_COURT')
