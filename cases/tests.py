from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

# Import models
from accounts.models import Role
from cases.models import Case

User = get_user_model()

class CasesAppTests(APITestCase):
    
    def setUp(self):
        # 1. Setup Roles
        self.role_citizen = Role.objects.create(name="Citizen", codename="CITIZEN")
        self.role_cadet = Role.objects.create(name="Cadet", codename="CADET")
        self.role_officer = Role.objects.create(name="Officer", codename="OFFICER")

        # 2. Setup Users
        self.citizen = User.objects.create_user(username="citizen1", password="pw", role=self.role_citizen)
        self.cadet = User.objects.create_user(username="cadet1", password="pw", role=self.role_cadet)
        self.officer = User.objects.create_user(username="officer1", password="pw", role=self.role_officer)

        # 3. Setup Mock Data
        self.case = Case.objects.create(
            title="Stolen Laptop",
            description="Laptop stolen from car.",
            complainant=self.citizen,
            status="PENDING_CADET",
            complainant_rejection_count=0
        )

        # 4. Endpoints (با فرض اینکه از روترهای پیش‌فرض جنگو استفاده کرده‌اید)
        self.list_create_url = reverse('case-list')
        
        # برای اکشن‌های کاستوم، معمولاً آدرس‌ها به این شکل ساخته می‌شوند
        self.cadet_approve_url = reverse('case-cadet-approve', kwargs={'pk': self.case.id})
        self.cadet_reject_url = reverse('case-cadet-reject', kwargs={'pk': self.case.id})
        self.officer_approve_url = reverse('case-officer-approve', kwargs={'pk': self.case.id})

    # ═══════════════════════════════════════════════════════════════
    # 1. CASE CREATION TESTS
    # ═══════════════════════════════════════════════════════════════
    def test_citizen_creates_case_defaults_to_pending_cadet(self):
        """
        When a citizen creates a case, it MUST automatically get the PENDING_CADET status.
        """
        self.client.force_authenticate(user=self.citizen)
        data = {
            "title": "Robbery",
            "description": "My phone was stolen."
        }
        response = self.client.post(self.list_create_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        case = Case.objects.get(id=response.data['id'])
        self.assertEqual(case.status, 'PENDING_CADET')
        self.assertEqual(case.complainant, self.citizen)

    # ═══════════════════════════════════════════════════════════════
    # 2. CADET WORKFLOW TESTS (Document Section 4.2)
    # ═══════════════════════════════════════════════════════════════
    def test_cadet_can_approve_case(self):
        """Cadet approval moves status from PENDING_CADET to PENDING_OFFICER."""
        self.client.force_authenticate(user=self.cadet)
        
        response = self.client.post(self.cadet_approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'PENDING_OFFICER')

    def test_cadet_rejection_logic_and_void(self):
        """
        Cadet rejecting a case increments rejection count.
        On the 3rd rejection, the case MUST automatically become VOIDED.
        """
        self.client.force_authenticate(user=self.cadet)
        
        # Rejection 1
        self.client.post(self.cadet_reject_url, {"reason": "Not enough info"})
        self.case.refresh_from_db()
        self.assertEqual(self.case.complainant_rejection_count, 1)
        self.assertEqual(self.case.status, 'PENDING_CADET')
        
        # Rejection 2
        self.client.post(self.cadet_reject_url, {"reason": "Still bad"})
        self.case.refresh_from_db()
        self.assertEqual(self.case.complainant_rejection_count, 2)
        
        # Rejection 3 -> Should void the case!
        self.client.post(self.cadet_reject_url, {"reason": "Spam"})
        self.case.refresh_from_db()
        self.assertEqual(self.case.complainant_rejection_count, 3)
        self.assertEqual(self.case.status, 'VOIDED')

    # ═══════════════════════════════════════════════════════════════
    # 3. OFFICER WORKFLOW TESTS (Document Section 4.2)
    # ═══════════════════════════════════════════════════════════════
    def test_officer_approves_case(self):
        """Officer approval moves status to OPEN."""
        # Setup: move case to officer's desk first
        self.case.status = 'PENDING_OFFICER'
        self.case.save()

        self.client.force_authenticate(user=self.officer)
        response = self.client.post(self.officer_approve_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'OPEN')
