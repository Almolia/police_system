from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Case, CrimeLevel, FormationType, CaseStatus

User = get_user_model()

class CaseModelTests(TestCase):
    def setUp(self):
        # ساخت یک کاربر تستی به عنوان شاکی با تمام فیلدهای اجباری
        self.citizen = User.objects.create_user(
            username="citizen1", 
            password="password123",
            national_id="1234567890",      # فیلد اضافه شده
            phone_number="09120000000",    # فیلد اضافه شده
            email="citizen@test.com",      # فیلد اضافه شده
            first_name="Ali",              # فیلد اضافه شده
            last_name="Alavi"              # فیلد اضافه شده
        )
        
        # ساخت یک پرونده اولیه از نوع شکایت
        self.case = Case.objects.create(
            title="Stolen Bicycle",
            description="My bicycle was stolen from the yard.",
            crime_level=CrimeLevel.LEVEL_3, # ارزش عددی: 1
            formation_type=FormationType.COMPLAINT,
            primary_complainant=self.citizen
        )

    def test_case_initial_state(self):
        """تست اینکه پرونده در ابتدا وضعیت درست و تعداد رد شدن صفر دارد"""
        self.assertEqual(self.case.status, CaseStatus.PENDING_CADET_REVIEW)
        self.assertEqual(self.case.complainant_rejection_count, 0)
        self.assertFalse(self.case.is_critical)
        self.assertFalse(self.case.is_voided)

    def test_increment_complainant_rejection_logic(self):
        """تست منطق رد شدن توسط کادت (۱ بار، ۲ بار و در نهایت ۳ بار برای Void شدن)"""
        
        # رد شدن بار اول
        self.case.increment_complainant_rejection()
        self.assertEqual(self.case.complainant_rejection_count, 1)
        self.assertEqual(self.case.status, CaseStatus.RETURNED_TO_COMPLAINANT)
        
        # رد شدن بار دوم
        self.case.increment_complainant_rejection()
        self.assertEqual(self.case.complainant_rejection_count, 2)
        self.assertEqual(self.case.status, CaseStatus.RETURNED_TO_COMPLAINANT)
        
        # رد شدن بار سوم (باید وضعیت به VOIDED تغییر کند)
        self.case.increment_complainant_rejection()
        self.assertEqual(self.case.complainant_rejection_count, 3)
        self.assertEqual(self.case.status, CaseStatus.VOIDED)
        self.assertTrue(self.case.is_voided)

    def test_is_critical_property(self):
        """تست بررسی متد is_critical برای پرونده‌های حساس"""
        critical_case = Case.objects.create(
            title="Serial Killer on the loose",
            description="...",
            crime_level=CrimeLevel.CRITICAL, # ارزش عددی: 4
            formation_type=FormationType.CRIME_SCENE
        )
        self.assertTrue(critical_case.is_critical)
