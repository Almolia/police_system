from django.db import models
from django.conf import settings

class DailySystemStat(models.Model):
    """
    Stores a daily snapshot of the system's performance.
    Used to generate charts (e.g., "Crime Trends 2026") without crashing the database.
    
    This record should be created automatically every night at 23:59 via a background task (Celery).
    """
    # The date of this snapshot
    date = models.DateField(unique=True, db_index=True)

    # ─── Case Statistics ───
    # How many new cases were opened today?
    new_cases_count = models.PositiveIntegerField(default=0)
    
    # How many cases were closed (Solved/Rejected) today?
    closed_cases_count = models.PositiveIntegerField(default=0)
    
    # Total active cases in the system right now
    total_active_cases = models.PositiveIntegerField(default=0)

    # ─── Financial Statistics ───
    # Total rewards paid out today
    total_rewards_paid = models.BigIntegerField(default=0, help_text="in Rials")
    
    # Total bail/fines collected today
    total_payments_received = models.BigIntegerField(default=0, help_text="in Rials")

    # ─── Performance Metrics ───
    # Optional: Average time to solve a case (in hours)
    avg_resolution_time_hours = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Daily System Statistic"

    def __str__(self):
        return f"Stats for {self.date}: +{self.new_cases_count} Cases"