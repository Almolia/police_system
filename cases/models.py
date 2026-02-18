from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

# ═══════════════════════════════════════════════════════════════
# ENUMERATIONS
# ═══════════════════════════════════════════════════════════════
class CrimeLevel(models.IntegerChoices):
    """
    Integer values are used directly in the ranking formula:
        score = max(Lj) * max(Di)
    Values must stay 1-4.
    """
    LEVEL_3  = 1, "Level 3 – Minor (e.g. petty theft)"
    LEVEL_2  = 2, "Level 2 – Major (e.g. car theft)"
    LEVEL_1  = 3, "Level 1 – Serious (e.g. murder)"
    CRITICAL = 4, "Critical (e.g. serial murder / assassination)"

class FormationType(models.TextChoices):
    COMPLAINT   = "COMPLAINT",   "Formed via Complaint"
    CRIME_SCENE = "CRIME_SCENE", "Formed via Crime Scene Report"


class CaseStatus(models.TextChoices):
    """
    Full state-machine for a case.

    ┌─ COMPLAINT path ──────────────────────────────────────────────────────────┐
    │                                                                           │
    │  Complainant submits                                                      │
    │       │                                                                   │
    │       ▼                                                                   │
    │  PENDING_CADET_REVIEW ──(cadet rejects)──► RETURNED_TO_COMPLAINANT        │
    │       │                                          │  (3rd rejection)       │
    │       │ (cadet approves)                         ▼                        │
    │       │                                        VOIDED                     │
    │       ▼                                                                   │
    │  PENDING_OFFICER_REVIEW ──(officer rejects)──► RETURNED_TO_CADET          │
    │       │                                          │                        │
    │       │ (officer approves)                       ▼                        │
    │       │                               PENDING_CADET_REVIEW                │
    │       ▼                                                                   │
    │      OPEN                                                                 │
    └───────────────────────────────────────────────────────────────────────────┘

    ┌─ CRIME_SCENE path ─────────────────────────────────────────────────────────┐
    │                                                                            │
    │  Police files report                                                       │
    │       │                                                                    │
    │       ├─(reporter is Chief)──────────────────────────────────────► OPEN    │
    │       │                                                                    │
    │       ▼                                                                    │
    │  PENDING_SUPERIOR_APPROVAL ──(superior approves)──► OPEN                   │
    │                              (superior rejects) ──► VOIDED                 │
    └────────────────────────────────────────────────────────────────────────────┘

    ┌─ Shared investigation path (both types enter here) ────────────────────────┐
    │                                                                            │
    │  OPEN                                                                      │
    │   └─► INVESTIGATION              Detective actively works the board        │
    │         └─► WAITING_FOR_SERGEANT  Detective proposes suspects to Sergeant  │
    │               ├─► CLOSED_REJECTED  Sergeant disagreed                      │
    │               └─► INTERROGATION    Sergeant approved; arrests begin        │
    │                     └─► WAITING_FOR_CAPTAIN  Scores submitted              │
    │                           ├─► CLOSED_REJECTED  Captain rejected            │
    │                           └─► WAITING_FOR_CHIEF  (CRITICAL only)           │
    │                                 ├─► CLOSED_REJECTED  Chief rejected        │
    │                                 └─► IN_COURT                               │
    │                           └─► IN_COURT  (non-critical, captain approved)   │
    │                                 └─► CLOSED_VERDICT                         │
    └────────────────────────────────────────────────────────────────────────────┘
    """

    # ── Pre-open: complaint path ───────────────────────────────────────────
    PENDING_CADET_REVIEW      = "PENDING_CADET_REVIEW",      "Pending Cadet Review"
    RETURNED_TO_COMPLAINANT   = "RETURNED_TO_COMPLAINANT",   "Returned to Complainant"
    RETURNED_TO_CADET         = "RETURNED_TO_CADET",         "Returned to Cadet (by Officer)"
    PENDING_OFFICER_REVIEW    = "PENDING_OFFICER_REVIEW",    "Pending Officer Review"

    # ── Pre-open: crime-scene path ─────────────────────────────────────────
    PENDING_SUPERIOR_APPROVAL = "PENDING_SUPERIOR_APPROVAL", "Pending Superior Approval"

    # ── Terminal dead-end ──────────────────────────────────────────────────
    VOIDED                    = "VOIDED",                    "Voided (Complainant 3× rejected)"

    # ── Active ────────────────────────────────────────────────────────────
    OPEN                      = "OPEN",                      "Open"

    # ── Phase 1: Investigation ────────────────────────────────────────────
    INVESTIGATION             = "INVESTIGATION",             "Under Investigation (Detective Board)"
    WAITING_FOR_SERGEANT      = "WAITING_FOR_SERGEANT",      "Waiting for Sergeant Approval"

    # ── Phase 2: Arrest & Interrogation ───────────────────────────────────
    INTERROGATION             = "INTERROGATION",             "Suspects Arrested & Interrogating"
    WAITING_FOR_CAPTAIN       = "WAITING_FOR_CAPTAIN",       "Waiting for Captain Verdict"
    WAITING_FOR_CHIEF         = "WAITING_FOR_CHIEF",         "Waiting for Chief of Police (Critical)"

    # ── Phase 3: Judiciary ────────────────────────────────────────────────
    IN_COURT                  = "IN_COURT",                  "Sent to Court (Judge Review)"

    # ── Phase 4: Closed ───────────────────────────────────────────────────
    CLOSED_VERDICT            = "CLOSED_VERDICT",            "Closed – Verdict Given"
    CLOSED_REJECTED           = "CLOSED_REJECTED",           "Closed – Rejected by Police Hierarchy"

# ═══════════════════════════════════════════════════════════════
# CORE CASE
# ═══════════════════════════════════════════════════════════════
class Case(models.Model):
    """
    Central entity of the system.

    Formation types
    ───────────────
    COMPLAINT:
        • Created by a complainant (primary_complainant is set).
        • Goes through cadet → officer review before becoming OPEN.
        • Additional complainants can join; each verified by cadet.
        • Cadet returns case to complainant WITH an error message.
        • Officer returns case back to CADET (never directly to complainant).
        • 3 complainant rejections → VOIDED permanently.

    CRIME_SCENE:
        • Created by any police rank except Cadet (reported_by is set).
        • crime_occurred_at (timestamp) and crime_scene_location stored.
        • Witnesses stored in CaseWitness (phone + national_id only).
        • One superior approval needed; Chief filing → auto-OPEN.
        • primary_complainant starts NULL; grows via CaseComplainant.
    """

    # ── Identity ──────────────────────────────────────────────────────────
    title       = models.CharField(max_length=255)
    description = models.TextField()
    crime_level = models.IntegerField(choices=CrimeLevel.choices)

    # ── Formation ─────────────────────────────────────────────────────────
    formation_type = models.CharField(
        max_length=20,
        choices=FormationType.choices,
    )

    # ── Status machine ────────────────────────────────────────────────────
    status = models.CharField(
        max_length=40,
        choices=CaseStatus.choices,
        default=CaseStatus.PENDING_CADET_REVIEW,
        db_index=True,
    )

    # ── Complaint-path: rejection counter ────────────────────────────────
    # Incremented each time cadet sends the case BACK to the complainant.
    # Reaching 3 permanently voids the case.
    complainant_rejection_count = models.PositiveSmallIntegerField(default=0)

    # ── Crime scene metadata ──────────────────────────────────────────────
    # Mandatory for CRIME_SCENE cases (enforced at serializer level).
    crime_occurred_at    = models.DateTimeField(null=True, blank=True)
    crime_scene_location = models.TextField(null=True, blank=True)

    # ── People ────────────────────────────────────────────────────────────
    # Citizen who filed a complaint; NULL for crime-scene cases initially.
    primary_complainant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="primary_cases",
    )

    # Police officer who filed the crime-scene report.
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reported_cases",
    )

    # Assigned after case becomes OPEN.
    assigned_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="detective_cases",
    )
    assigned_sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sergeant_cases",
    )

    # ── Timestamps ────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Case #{self.pk} — {self.title} [{self.get_status_display()}]"

    # ── Convenience properties ────────────────────────────────────────────

    @property
    def is_critical(self) -> bool:
        return self.crime_level == CrimeLevel.CRITICAL

    @property
    def is_voided(self) -> bool:
        return self.status == CaseStatus.VOIDED

    def increment_complainant_rejection(self) -> None:
        """
        Called every time the cadet sends the case back to the complainant.
        Automatically voids on the 3rd rejection.
        """
        self.complainant_rejection_count += 1
        if self.complainant_rejection_count >= 3:
            self.status = CaseStatus.VOIDED
        else:
            self.status = CaseStatus.RETURNED_TO_COMPLAINANT
        self.save(update_fields=["complainant_rejection_count", "status"])


# ═══════════════════════════════════════════════════════════════
# COMPLAINANTS
# ═══════════════════════════════════════════════════════════════
class CaseComplainant(models.Model):
    """
    Links additional complainants to a case beyond the primary one.

    • For complaint-based cases: the system allows other citizens
      who are also affected to attach themselves.
    • For crime-scene cases: complainants are added after the fact
      as victims come forward.
    • In both cases the cadet must verify (VERIFIED) or reject (REJECTED)
      each entry; starts as PENDING.
    • rejection_note must be filled when cadet rejects.
    """

    class VerificationStatus(models.TextChoices):
        PENDING  = "PENDING",  "Pending Cadet Review"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="complainants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complainant_entries",
    )
    verification_status = models.CharField(
        max_length=10,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_complainants",
    )
    rejection_note = models.TextField(blank=True)
    added_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("case", "user")
        ordering = ["added_at"]

    def __str__(self):
        return f"{self.user} → Case #{self.case_id} ({self.verification_status})"
    
    
# ═══════════════════════════════════════════════════════════════
# WITNESSES  (crime-scene cases)
# ═══════════════════════════════════════════════════════════════
class CaseWitness(models.Model):
    """
    Bystander witnesses at a crime scene.

    Per doc §4.2.2 ONLY phone number and national ID are required at
    filing time (for future follow-up). Full name is stored when known
    but is intentionally optional since witnesses may be anonymous.

    NOT linked to the User table — witnesses are not necessarily
    registered users of the system.
    """

    case         = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="witnesses",
    )
    # Witnesses may be foreign nationals → max_length=20
    national_id  = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=15)
    # Optional at time of filing; can be filled in later
    full_name    = models.CharField(max_length=255, blank=True)
    notes        = models.TextField(blank=True)

    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="registered_witnesses",
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["registered_at"]

    def __str__(self):
        return f"Witness {self.national_id} on Case #{self.case_id}"
    
    
# ═══════════════════════════════════════════════════════════════
# STATUS AUDIT LOG  (append-only)
# ═══════════════════════════════════════════════════════════════
class CaseStatusLog(models.Model):
    """
    Immutable audit trail of every status transition.

    Never updated or deleted.
    Used by:
        • Judge — to see the complete case history
        • Captain / Chief — for the general report page
        • Frontend — to render a timeline
    """

    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="status_logs")
    from_status = models.CharField(max_length=40, blank=True)
    to_status   = models.CharField(max_length=40)
    changed_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="case_status_changes",
    )
    # Stores cadet error messages, rejection reasons, sergeant notes, etc.
    message    = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]

    def __str__(self):
        return (
            f"Case #{self.case_id}: {self.from_status} → {self.to_status}"
            f" @ {self.changed_at:%Y-%m-%d %H:%M}"
        )


# ═══════════════════════════════════════════════════════════════
# CASE ↔ SUSPECT LINK
# ═══════════════════════════════════════════════════════════════

class CaseSuspectLink(models.Model):
    """
    Many-to-many join between Case and Suspect, carrying the full
    interrogation and verdict chain for that specific (case, suspect) pair.

    Score chain:
        Detective sets detective_score  (1–10)
        Sergeant  sets sergeant_score   (1–10)
        Both scores go to Captain → captain_verdict
        If CRITICAL → also chief_verdict before IN_COURT

    Bail/fine amounts are set by the Sergeant (doc §4.9).
    """

    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="suspect_links",)
    suspect = models.ForeignKey("investigation.Suspect", on_delete=models.CASCADE, related_name="case_links",)

    flagged_at = models.DateTimeField(auto_now_add=True)
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="flagged_suspect_links",
    )

    # ── Interrogation scores ──────────────────────────────────────────────
    detective_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    sergeant_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )

    # ── Verdict chain ─────────────────────────────────────────────────────
    # None = not yet reviewed | True = approved | False = rejected
    captain_verdict = models.BooleanField(null=True, blank=True)
    captain_notes   = models.TextField(blank=True)

    # Only populated for CRITICAL crime level cases
    chief_verdict = models.BooleanField(null=True, blank=True)
    chief_notes   = models.TextField(blank=True)

    # ── Bail / fine ───────────────────────────────────────────────────────
    bail_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    fine_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    bail_set_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="set_bail_links",
    )

    class Meta:
        unique_together = ("case", "suspect")
        ordering = ["flagged_at"]

    def __str__(self):
        return f"Suspect '{self.suspect}' in Case #{self.case_id}"



