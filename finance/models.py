from django.db import models
from django.conf import settings
import uuid

# ═══════════════════════════════════════════════════════════════
# 1. REWARD (TIP) MODEL
# ═══════════════════════════════════════════════════════════════
class Reward(models.Model):
    """
    Handles Citizen tips. 
    Flow: Citizen (PENDING) -> Officer (FORWARDED/REJECTED) -> Detective (APPROVED/REJECTED) -> Paid.
    """
    class TipStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Officer Review'
        FORWARDED = 'FORWARDED', 'Forwarded to Detective'
        APPROVED = 'APPROVED', 'Approved by Detective'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Reward Paid'

    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_tips')
    
    suspect = models.ForeignKey('investigation.Suspect', on_delete=models.SET_NULL, null=True, blank=True)
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.TextField()
    status = models.CharField(max_length=20, choices=TipStatus.choices, default=TipStatus.PENDING)
    
    unique_tracking_id = models.UUIDField(null=True, blank=True, unique=True)
    amount = models.BigIntegerField(default=0)
    
    officer_reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_tips')
    detective_approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_tips')

    created_at = models.DateTimeField(auto_now_add=True)

    def calculate_reward_amount(self):
        """
        Calculates and saves the reward amount based on the Suspect's value.
        Formula: (Suspect Ranking Score) * 20,000,000
        """
        # Safety check: ensure a suspect was actually linked by the police
        if self.suspect and self.suspect.cached_ranking_score:
            base_score = self.suspect.cached_ranking_score
            self.amount = base_score * 20_000_000
        else:
            self.amount = 0
            
        self.save()


# ═══════════════════════════════════════════════════════════════
# 2. RELEASE REQUEST (BAIL / FINE) MODEL
# ═══════════════════════════════════════════════════════════════
class ReleaseRequest(models.Model):
    """
    Suspect/Lawyer requests release. Sergeant reviews and sets the amount.
    """
    class RequestStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Sergeant Review'
        APPROVED = 'APPROVED', 'Approved (Amounts Set)'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Paid and Released'

    interrogation = models.ForeignKey('investigation.Interrogation', on_delete=models.CASCADE, related_name='release_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    status = models.CharField(max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    
    # Sergeant sets these
    bail_amount = models.BigIntegerField(null=True, blank=True, help_text="Set by Sergeant for Suspects (Level 2/3)")
    fine_amount = models.BigIntegerField(null=True, blank=True, help_text="Set by Sergeant for Criminals (Level 3)")
    
    sergeant_reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_releases')

    created_at = models.DateTimeField(auto_now_add=True)

# ═══════════════════════════════════════════════════════════════
# 2. PAYMENTS (Bail & Fines)
# ═══════════════════════════════════════════════════════════════
class Transaction(models.Model):
    """
    Handles online payments (Bail or Fine) via the Payment Gateway.
    
    NOTE: This stays linked to 'Interrogation' because Bail is 
    specific to ONE case. A suspect might be bailed out of Case A 
    but still held for Case B.
    """
    class Type(models.TextChoices):
        BAIL = 'BAIL', 'Bail Payment'
        FINE = 'FINE', 'Fine Payment'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending (Sent to Gateway)'
        SUCCESS = 'SUCCESS', 'Successful'
        FAILED  = 'FAILED',  'Failed / Cancelled'

    # Link to the specific legal process (Case + Suspect)
    interrogation = models.ForeignKey(
        'investigation.Interrogation',
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transactions'
    )

    amount = models.BigIntegerField(help_text="Amount in Rials")
    transaction_type = models.CharField(max_length=10, choices=Type.choices)
    
    # ── Gateway Fields ──
    authority = models.CharField(max_length=255, unique=True, help_text="Gateway Authority Code")
    ref_id = models.CharField(max_length=255, blank=True, null=True, help_text="Bank Reference ID")
    
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} Rials ({self.status})"