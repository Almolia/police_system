from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from cases.models import Case, CrimeLevel, FormationType, CaseStatus
from .models import Suspect, Interrogation

class InvestigationModelTests(TestCase):
    def setUp(self):
        # ساخت یک پرونده سطح 1 (Serious) که ارزش عددی (max_di) آن 3 است
        self.case = Case.objects.create(
            title="Bank Robbery",
            description="Armed robbery at central bank",
            crime_level=CrimeLevel.LEVEL_1, # ارزش عددی: 3
            formation_type=FormationType.CRIME_SCENE,
            status=CaseStatus.OPEN
        )
        
        # ساخت یک مظنون
        self.suspect = Suspect.objects.create(
            alias="Joker",
            status=Suspect.SuspectStatus.UNDER_SURVEILLANCE
        )

    def test_interrogation_save_triggers_score_calculation(self):
        """تست اینکه با ذخیره بازجویی، امتیاز مظنون خودکار محاسبه می‌شود"""
        
        # با ساخت Interrogation، متد save صدا زده می‌شود و calculate_metrics اجرا می‌گردد
        Interrogation.objects.create(
            case=self.case,
            suspect=self.suspect
        )
        
        self.suspect.refresh_from_db()
        
        # فرمول: max(Lj) * max(Di)
        # پرونده همین الان ساخته شده پس روزهای باز بودن (Lj) برابر 1 است (حداقل 1 روز)
        # سطح جرم LEVEL_1 است پس max(Di) برابر 3 است
        # امتیاز باید بشود: 1 * 3 = 3
        self.assertEqual(self.suspect.cached_ranking_score, 3)
        
        # محاسبه پاداش: 3 * 20,000,000 = 60,000,000
        self.assertEqual(self.suspect.reward_amount, 60_000_000)

    def test_auto_update_to_most_wanted(self):
        """تست تغییر وضعیت خودکار به MOST_WANTED وقتی پرونده بیشتر از 30 روز باز باشد"""
        
        Interrogation.objects.create(case=self.case, suspect=self.suspect)
        
        # تاریخ ساخت پرونده را به صورت مصنوعی به 32 روز پیش می‌بریم
        old_date = timezone.now() - timedelta(days=32)
        Case.objects.filter(id=self.case.id).update(created_at=old_date)
        
        # دوباره متد محاسبه را صدا می‌زنیم (انگار یک پرونده جدید به مظنون وصل شده یا آپدیت شده)
        self.suspect.calculate_metrics()
        self.suspect.refresh_from_db()
        
        # فرمول: Lj (32 روز) * Di (3) = 96
        self.assertEqual(self.suspect.cached_ranking_score, 96)
        
        # چون Lj > 30 است، وضعیت باید اتوماتیک Most Wanted شده باشد
        self.assertEqual(self.suspect.status, Suspect.SuspectStatus.MOST_WANTED)

    def test_closed_cases_do_not_affect_lj(self):
        """تست اینکه پرونده‌های بسته در محاسبه روزهای باز (Lj) لحاظ نمی‌شوند"""
        
        Interrogation.objects.create(case=self.case, suspect=self.suspect)
        
        # پرونده را می‌بندیم
        self.case.status = CaseStatus.CLOSED_VERDICT
        self.case.save()
        
        # با بستن پرونده، وقتی محاسبه مجدد انجام شود، نباید در فرمول شرکت کند
        self.suspect.calculate_metrics()
        self.suspect.refresh_from_db()
        
        # چون هیچ پرونده بازی ندارد، Lj صفر می‌شود و در نتیجه امتیاز 0 می‌شود
        self.assertEqual(self.suspect.cached_ranking_score, 0)
