from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.db.models import Max, Min
from django.db.models.signals import post_save
from django.dispatch import receiver
from evidence.models import Evidence

# ═══════════════════════════════════════════════════════════════
# 4. NOTIFICATIONS (The Alert System)
# ═══════════════════════════════════════════════════════════════
class Notification(models.Model):
    class NotificationType(models.TextChoices):
        EVIDENCE_ADDED    = 'EVIDENCE_ADDED', 'New Evidence Added'
        SERGEANT_REJECTED = 'SERGEANT_REJECTED', 'Suspect Rejected'
        SERGEANT_APPROVED = 'SERGEANT_APPROVED', 'Suspect Approved'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    case = models.ForeignKey('cases.Case', on_delete=models.CASCADE, related_name='case_notifications', null=True, blank=True)
    
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"To {self.recipient.username}: {self.message[:20]}"

# ─── AUTOMATIC SIGNAL FOR NEW EVIDENCE ───
@receiver(post_save, sender=Evidence)
def notify_detective_of_new_evidence(sender, instance, created, **kwargs):
    """
    Automatically triggers whenever ANY type of Evidence is created.
    If the case has a Detective, and the Detective didn't upload it themselves, send an alert.
    """
    if created and instance.case and getattr(instance.case, 'assigned_detective', None):
        detective = instance.case.assigned_detective
        
        # Don't notify the detective if they uploaded the evidence themselves
        if instance.recorder != detective:
            Notification.objects.create(
                recipient=detective,
                notification_type=Notification.NotificationType.EVIDENCE_ADDED,
                case=instance.case,
                message=f"New {instance.get_evidence_type_display()} evidence was added to Case #{instance.case.id} by {instance.recorder.get_full_name()}."
            )

# ═══════════════════════════════════════════════════════════════
# 1. SUSPECTS (The Criminals)
# ═══════════════════════════════════════════════════════════════
class Suspect(models.Model):
    """
    A person suspected of a crime.
    """
    class SuspectStatus(models.TextChoices):
        UNDER_SURVEILLANCE = "UNDER_SURVEILLANCE", "Under Surveillance"
        MOST_WANTED        = "MOST_WANTED",        "Most Wanted (>30 days open)"
        ARRESTED           = "ARRESTED",           "Arrested"
        RELEASED_ON_BAIL   = "RELEASED_ON_BAIL",   "Released on Bail"
        CONVICTED          = "CONVICTED",          "Convicted"
        ACQUITTED          = "ACQUITTED",          "Acquitted"

    # Identity
    profile = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="criminal_record"
    )
    alias = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Name or description if not a registered user"
    )

    status = models.CharField(
        max_length=20,
        choices=SuspectStatus.choices,
        default=SuspectStatus.UNDER_SURVEILLANCE,
        db_index=True,
    )

    cached_ranking_score = models.BigIntegerField(default=0, db_index=True)

    def __str__(self):
        return self.profile.get_full_name() if self.profile else self.alias

    # ─── MATH & LOGIC ────────────────────────────────────────────────
    
    def calculate_metrics(self):
        """
        Runs the heavy math and updates the cached_ranking_score.
        Call this method whenever a Case is added or closed.
        """
        # 1. Calculate Max Crime Level (Di)
        # Note: We must handle cases where crime_level might be None or 0
        agg_level = self.interrogations.aggregate(
            max_val=Max("case__crime_level")
        )
        max_di = agg_level["max_val"] or 0

        # 2. Calculate Max Days Open (Lj)
        active_interrogations = self.interrogations.exclude(
            case__status__in=['CLOSED_VERDICT', 'CLOSED_REJECTED', 'VOIDED']
        )
        
        agg_date = active_interrogations.aggregate(
            oldest=Min('case__created_at')
        )
        oldest_date = agg_date['oldest']

        if oldest_date:
            max_lj = max(1, (timezone.now() - oldest_date).days) 
        else:
            max_lj = 0

        # 3. Update the Cached Field
        self.cached_ranking_score = max_lj * max_di
        
        # 4. Auto-update Status to "Most Wanted" if Lj > 30 days
        if max_lj > 30 and self.status == self.SuspectStatus.UNDER_SURVEILLANCE:
            self.status = self.SuspectStatus.MOST_WANTED
            
        self.save(update_fields=['cached_ranking_score', 'status'])
        return self.cached_ranking_score

    @property
    def reward_amount(self) -> int:
        """
        Formula: Score * 20,000,000 Rials
        Uses the cached score for instant results.
        """
        return self.cached_ranking_score * 20_000_000


# ═══════════════════════════════════════════════════════════════
# 2. INTERROGATION (The Link / Process)
# ═══════════════════════════════════════════════════════════════
class Interrogation(models.Model):
    """
    Links a Suspect to a specific Case.
    """
    case = models.ForeignKey(
        "cases.Case", 
        on_delete=models.CASCADE, 
        related_name="interrogations"
    )
    suspect = models.ForeignKey(
        Suspect, 
        on_delete=models.CASCADE, 
        related_name="interrogations"
    )

    # Phase 1: Scoring
    detective_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Guilt probability (1-10)"
    )
    sergeant_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    # Phase 2: Verdicts
    sergeant_approval = models.BooleanField(null=True, blank=True)
    sergeant_notes = models.TextField(blank=True)
    captain_verdict = models.BooleanField(null=True, blank=True)
    chief_verdict = models.BooleanField(null=True, blank=True)

    # Phase 3: Bail
    bail_amount = models.DecimalField(
        max_digits=15, decimal_places=0, 
        null=True, blank=True,
        help_text="Set by Sergeant"
    )
    is_released_on_bail = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    captain_reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='captain_reviews'
    )
    chief_reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='chief_reviews'
    )

    class Meta:
        unique_together = ("case", "suspect")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Trigger an update on the suspect whenever an interrogation is changed
        self.suspect.calculate_metrics()

    def __str__(self):
        return f"{self.suspect} in Case #{self.case.id}"


# ═══════════════════════════════════════════════════════════════
# 3. DETECTIVE BOARD (Unchanged - Your code was good)
# ═══════════════════════════════════════════════════════════════
class BoardNode(models.Model):
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="board_nodes")
    linked_evidence = models.ForeignKey(
        "evidence.Evidence",
        on_delete=models.CASCADE,
        null=True, blank=True
    )
    note_text = models.TextField(blank=True, null=True)
    x_position = models.FloatField(default=0.0)
    y_position = models.FloatField(default=0.0)
    color = models.CharField(max_length=20, default="#ffeb3b")
    content = models.TextField(blank=True, null=True)

class BoardConnection(models.Model):
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE)
    from_node = models.ForeignKey(BoardNode, related_name="outgoing", on_delete=models.CASCADE)
    to_node = models.ForeignKey(BoardNode, related_name="incoming", on_delete=models.CASCADE)
    color = models.CharField(max_length=20, default="red")