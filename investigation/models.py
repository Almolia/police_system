from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.db.models import Max, Q

# ═══════════════════════════════════════════════════════════════
# 1. SUSPECTS (The Criminals)
# ═══════════════════════════════════════════════════════════════
class Suspect(models.Model):
    """
    A person suspected of a crime.
    Includes the 'Most Wanted' calculation logic.
    """
    class SuspectStatus(models.TextChoices):
        UNDER_SURVEILLANCE = "UNDER_SURVEILLANCE", "Under Surveillance"
        MOST_WANTED        = "MOST_WANTED",        "Most Wanted (>30 days open)"
        ARRESTED           = "ARRESTED",           "Arrested"
        RELEASED_ON_BAIL   = "RELEASED_ON_BAIL",   "Released on Bail"
        CONVICTED          = "CONVICTED",          "Convicted"
        ACQUITTED          = "ACQUITTED",          "Acquitted"

    # Link to a registered user (if they exist in system)
    profile = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="criminal_record"
    )
    
    # Text alias for unregistered people
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

    def __str__(self):
        return self.profile.get_full_name() if self.profile else self.alias

    # ─── MATH & LOGIC ────────────────────────────────────────────────

    def max_crime_level(self) -> int:
        """
        max(Di): Highest crime level integer (1-4) across ALL cases ever associated.
        """
        # We look at the 'interrogations' link to find related cases
        result = self.interrogations.aggregate(
            max_level=models.Max("case__crime_level")
        )
        return result["max_level"] or 0

    def max_days_in_open_case(self) -> int:
        """
        max(Lj): The longest number of days this suspect has been in an ACTIVE case.
        """
        # 1. Find all interrogations where the case is NOT closed/voided
        active_interrogations = self.interrogations.exclude(
            case__status__in=['CLOSED_VERDICT', 'CLOSED_REJECTED', 'VOIDED']
        )
        
        if not active_interrogations.exists():
            return 0

        # 2. Find the oldest 'created_at' among these active cases
        oldest_case_date = active_interrogations.aggregate(
            oldest=models.Min('case__created_at')
        )['oldest']

        if not oldest_case_date:
            return 0

        # 3. Calculate difference from NOW
        delta = timezone.now() - oldest_case_date
        return delta.days

    def ranking_score(self) -> int:
        """
        Formula: max(Lj) * max(Di)
        Used for sorting the 'Most Wanted' leaderboard.
        """
        return self.max_days_in_open_case() * self.max_crime_level()

    def reward_amount(self) -> int:
        """
        Formula: Score * 20,000,000 Rials
        """
        return self.ranking_score() * 20_000_000


# ═══════════════════════════════════════════════════════════════
# 2. INTERROGATION (The Link / Process)
# ═══════════════════════════════════════════════════════════════
class Interrogation(models.Model):
    """
    Links a Suspect to a specific Case.
    Holds the process data: Scores, Verdicts, Bail.
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

    # ── Phase 1: Scoring ──
    detective_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Guilt probability (1-10)"
    )
    sergeant_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    # ── Phase 2: Verdicts ──
    # Sergeant approves suspect for arrest?
    sergeant_approval = models.BooleanField(null=True, blank=True)
    sergeant_notes = models.TextField(blank=True)

    # Captain Final Verdict
    captain_verdict = models.BooleanField(null=True, blank=True)
    
    # Chief (Only for Critical Cases)
    chief_verdict = models.BooleanField(null=True, blank=True)

    # ── Phase 3: Bail ──
    bail_amount = models.DecimalField(
        max_digits=15, decimal_places=0, 
        null=True, blank=True,
        help_text="Set by Sergeant"
    )
    is_released_on_bail = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("case", "suspect")
    
    def __str__(self):
        return f"{self.suspect} in Case #{self.case.id}"


# ═══════════════════════════════════════════════════════════════
# 3. DETECTIVE BOARD
# ═══════════════════════════════════════════════════════════════
class BoardNode(models.Model):
    """
    Items on the drag-and-drop board (Evidence or Notes).
    """
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="board_nodes")
    
    # Can link to real evidence OR just be text
    linked_evidence = models.ForeignKey(
        "evidence.Evidence",
        on_delete=models.CASCADE,
        null=True, blank=True
    )
    note_text = models.TextField(blank=True, null=True)
    
    # Coordinates
    x_position = models.FloatField(default=0.0)
    y_position = models.FloatField(default=0.0)
    color = models.CharField(max_length=20, default="#ffeb3b")


class BoardConnection(models.Model):
    """
    Red lines connecting nodes.
    """
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE)
    from_node = models.ForeignKey(BoardNode, related_name="outgoing", on_delete=models.CASCADE)
    to_node = models.ForeignKey(BoardNode, related_name="incoming", on_delete=models.CASCADE)
    color = models.CharField(max_length=20, default="red")