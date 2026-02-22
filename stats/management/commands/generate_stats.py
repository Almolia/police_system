from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum

from stats.models import DailySystemStat
from cases.models import Case
from finance.models import Reward, Transaction

class Command(BaseCommand):
    help = 'Generates the daily system statistics snapshot.'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        self.stdout.write(f"Starting daily stat generation for {today}...")

        # 1. Case Statistics
        new_cases = Case.objects.filter(created_at__date=today).count()
        closed_cases = Case.objects.filter(
            updated_at__date=today, 
            status__in=['SOLVED', 'REJECTED']
        ).count()
        active_cases = Case.objects.filter(status='OPEN').count()

        # 2. Financial Statistics
        rewards_agg = Reward.objects.filter(updated_at__date=today, status='PAID').aggregate(total=Sum('amount'))
        total_rewards = rewards_agg['total'] or 0

        payments_agg = Transaction.objects.filter(updated_at__date=today, status='SUCCESS').aggregate(total=Sum('amount'))
        total_payments = payments_agg['total'] or 0

        # 3. Save to Database
        stat_record, created = DailySystemStat.objects.update_or_create(
            date=today,
            defaults={
                'new_cases_count': new_cases,
                'closed_cases_count': closed_cases,
                'total_active_cases': active_cases,
                'total_rewards_paid': total_rewards,
                'total_payments_received': total_payments,
            }
        )

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"Successfully {action.lower()} stats for {today}. New Cases: {new_cases}"))