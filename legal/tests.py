from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from accounts.models import Role
from investigation.models import Suspect, Interrogation
from cases.models import Case
from legal.models import CourtVerdict

User = get_user_model()

class LegalAppTests(APITestCase):

    def setUp(self):
        # 1. Setup Roles
        self.role_judge = Role.objects.create(name="Judge", codename="JUDGE")
        self.role_detective = Role.objects.create(name="Detective", codename="DETECTIVE")

        # 2. Setup Users
        self.judge_user = User.objects.create_user(
            username="judge_dredd",
            national_id="3333333333",
            phone_number="09123333333",
            email="judge@court.ir",
            first_name="Joseph",
            last_name="Dredd",
            password="password123"
        )
        self.judge_user.role = self.role_judge
        self.judge_user.save()

        self.detective_user = User.objects.create_user(
            username="det_smith",
            national_id="4444444444",
            phone_number="09124444444",
            email="smith@police.ir",
            first_name="Will",
            last_name="Smith",
            password="password123"
        )
        self.detective_user.role = self.role_detective
        self.detective_user.save()

        # 3. Setup Investigation Data
        self.suspect = Suspect.objects.create(
            alias="The Joker", 
            status=Suspect.SuspectStatus.UNDER_SURVEILLANCE
        )
        self.case = Case.objects.create(title="Bank Heist", crime_level=4)
        
        # Link suspect to case
        self.interrogation = Interrogation.objects.create(
            case=self.case, 
            suspect=self.suspect
        )

        # 4. URLs
        self.verdict_url = reverse('legal:verdict-list-create')

    # ═══════════════════════════════════════════════════════════════
    # 1. PERMISSION TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_detective_cannot_issue_verdict(self):
        """Only Judges are allowed to POST to the verdict endpoint."""
        self.client.force_authenticate(user=self.detective_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "verdict": CourtVerdict.VerdictType.GUILTY,
            "sentence_type": CourtVerdict.SentenceType.PRISON,
            "prison_months": 120
        }
        response = self.client.post(self.verdict_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ═══════════════════════════════════════════════════════════════
    # 2. VALIDATION TESTS (Serializer Logic)
    # ═══════════════════════════════════════════════════════════════
    def test_innocent_verdict_cannot_have_prison_time(self):
        """If a suspect is innocent, the API must reject any punishment data."""
        self.client.force_authenticate(user=self.judge_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "verdict": CourtVerdict.VerdictType.INNOCENT,
            "sentence_type": CourtVerdict.SentenceType.PRISON,
            "prison_months": 50,
            "title": "Innocent Verdict",         
            "description": "Lack of evidence."   
        }
        response = self.client.post(self.verdict_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sentence_type', response.data)

    def test_guilty_verdict_must_have_punishment(self):
        """If a suspect is guilty, the Judge cannot select 'NONE' for the sentence."""
        self.client.force_authenticate(user=self.judge_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "verdict": CourtVerdict.VerdictType.GUILTY,
            "sentence_type": CourtVerdict.SentenceType.NONE,
            "title": "Guilty of theft",
            "description": "Caught on camera."
        }
        response = self.client.post(self.verdict_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sentence_type', response.data)

    # ═══════════════════════════════════════════════════════════════
    # 3. DATABASE TRIGGER TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_guilty_verdict_updates_suspect_status(self):
        """Issuing a guilty verdict must auto-update the suspect's global status."""
        self.client.force_authenticate(user=self.judge_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "verdict": CourtVerdict.VerdictType.GUILTY,
            "sentence_type": CourtVerdict.SentenceType.EXECUTION,
            "title": "Terrorism Conviction",
            "description": "Maximum penalty applied."
        }
        response = self.client.post(self.verdict_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Reload the suspect from the DB to check if the save() trigger worked
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, 'CONVICTED')

    def test_innocent_verdict_updates_suspect_status(self):
        """Issuing an innocent verdict must auto-update the suspect's global status."""
        self.client.force_authenticate(user=self.judge_user)
        
        data = {
            "interrogation": self.interrogation.id,
            "verdict": CourtVerdict.VerdictType.INNOCENT,
            "sentence_type": CourtVerdict.SentenceType.NONE,
            "title": "Cleared of all charges",
            "description": "Alibi verified."
        }
        response = self.client.post(self.verdict_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, 'ACQUITTED')