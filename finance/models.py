from django.db import models
from django.conf import settings
import uuid

# ═══════════════════════════════════════════════════════════════
# 1. REWARDS (Suspect-Centric)
# ═══════════════════════════════════════════════════════════════
class Reward(models.Model):
    """
    Manages rewards for citizens who provide tips about a specific SUSPECT.
    
    The user selects a "Most Wanted" criminal and submits a tip.
    Reward Amount = Suspect's Value * 20,000,000 Rials.
    """
    class Status(models.TextChoices):
        PENDING   = 'PENDING',   'Pending Officer Review'
        VERIFIED  = 'VERIFIED',  'Verified by Officer'
        APPROVED  = 'APPROVED',  'Approved by Detective (Ready for Payment)'
        PAID      = 'PAID',      'Paid'
        REJECTED  = 'REJECTED',  'Rejected'

    # The citizen claiming the reward
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rewards'
    )
    
    suspect = models.ForeignKey(
        'investigation.Suspect',
        on_delete=models.CASCADE,
        related_name='tips'
    )
    
    description = models.TextField(help_text="Details of the tip (e.g. location, sighting)")
    
    # "A unique ID is given to them to go to the police station"
    unique_tracking_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # The calculated amount in Rials
    amount = models.BigIntegerField(default=0, help_text="Calculated via Suspect Value * 20m")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Audit trail
    officer_reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_rewards'
    )
    detective_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_rewards'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_reward_amount(self):
        """
        Calculates and saves the reward amount based on the Suspect's value.
        Formula: (Suspect Ranking Score) * 20,000,000
        """
        # 1. Get the pre-calculated score from the Suspect model
        # This score is max(Lj) * max(Di)
        base_score = self.suspect.cached_ranking_score
        
        # 2. Apply the money multiplier
        # Example: Score 120 (Critical * 30 days) * 20m = 2,400,000,000 Rials
        self.amount = base_score * 20_000_000
        self.save()

    def __str__(self):
        return f"Reward for {self.suspect} - {self.amount:,} Rials"


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