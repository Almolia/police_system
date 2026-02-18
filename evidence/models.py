from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

# ═══════════════════════════════════════════════════════════════
# BASE EVIDENCE MODEL
# ═══════════════════════════════════════════════════════════════
class Evidence(models.Model):
    """
    The parent class for all evidence types. 
    Allows querying all evidence for a case via case.evidence_list.all()
    """
    class EvidenceType(models.TextChoices):
        WITNESS = 'WITNESS', 'Witness Testimony/Media'
        BIO     = 'BIO',     'Biological/Medical'
        VEHICLE = 'VEHICLE', 'Vehicle'
        ID_DOC  = 'ID',      'Identification Document'
        MISC    = 'MISC',    'Miscellaneous'

    # Link to the Case File
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='evidence_list'
    )
    
    # "All evidence must have a recorder" [cite: 174]
    recorder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='recorded_evidence'
    )
    
    # "All evidence includes title and description" [cite: 173]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # "All evidence must have a date of registration" [cite: 174]
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Type identifier to help frontend know which child model to query
    evidence_type = models.CharField(max_length=20, choices=EvidenceType.choices)

    def __str__(self):
        return f"{self.title} ({self.get_evidence_type_display()})"


# ═══════════════════════════════════════════════════════════════
# 1. WITNESS EVIDENCE [cite: 177-178]
# ═══════════════════════════════════════════════════════════════
class WitnessEvidence(Evidence):
    """
    "Transcript of witness statements... image, video, or audio related to the incident."
    """
    # Text transcript of what they said
    transcript = models.TextField(blank=True, help_text="Written transcript of the testimony")
    
    # Media files (Audio/Video/Photo)
    # Using URLField assuming storage on S3/MinIO, or FileField if local
    media_url = models.URLField(blank=True, null=True, help_text="Link to audio/video/image file")
    
    # Optional: Link to the specific witness from the crime scene report if applicable
    linked_witness = models.ForeignKey(
        'cases.CaseWitness',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='formal_statements'
    )

    def save(self, *args, **kwargs):
        self.evidence_type = Evidence.EvidenceType.WITNESS
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 2. BIOLOGICAL / MEDICAL EVIDENCE [cite: 180-182]
# ═══════════════════════════════════════════════════════════════
class BioEvidence(Evidence):
    """
    "Blood stain, hair strand, fingerprint... requires Coroner verification."
    """
    class BioType(models.TextChoices):
        BLOOD = 'BLOOD', 'Blood Sample'
        DNA   = 'DNA',   'DNA / Hair'
        FINGERPRINT = 'FINGERPRINT', 'Fingerprint'
        OTHER = 'OTHER', 'Other Biological'

    bio_type = models.CharField(max_length=20, choices=BioType.choices)
    
    # "Result of follow-up... is initially empty but can be filled later" 
    coroner_verification = models.TextField(
        blank=True, 
        null=True, 
        help_text="Results from the Coroner or Identity Database"
    )
    
    # Who verified it? (Must be a Coroner user)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='verified_bio_evidence'
    )
    
    @property
    def main_image(self):
        """Helper to get the first image for thumbnails"""
        first_img = self.images.first()
        return first_img.image_url if first_img else None

    def save(self, *args, **kwargs):
        self.evidence_type = Evidence.EvidenceType.BIO
        super().save(*args, **kwargs)

class BioEvidenceImage(models.Model):
    """
    Stores the actual images for BioEvidence.
    Allows us to have 1 required image + N optional images.
    """
    evidence = models.ForeignKey(
        BioEvidence,
        on_delete=models.CASCADE,
        related_name='images' # Access via: bio_evidence.images.all()
    )
    
    # Assuming you are storing files on a cloud/server and saving the URL.
    # If storing locally, use models.ImageField(upload_to='evidence/bio/')
    image_url = models.URLField(help_text="URL to the image file")
    
    caption = models.CharField(max_length=100, blank=True, help_text="e.g. 'Close up of the stain'")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.evidence.title} ({self.id})"

# ═══════════════════════════════════════════════════════════════
# 3. VEHICLE EVIDENCE [cite: 184-187]
# ═══════════════════════════════════════════════════════════════
class VehicleEvidence(Evidence):
    """
    "Model, Plate, and Color must be recorded."
    Constraint: Plate AND Serial cannot both have values simultaneously.
    """
    model_name = models.CharField(max_length=100)
    color = models.CharField(max_length=50)
    
    plate_number = models.CharField(max_length=20, blank=True, null=True)
    serial_number = models.CharField(max_length=50, blank=True, null=True, help_text="VIN / Chassis Number")

    def clean(self):
        """
        Validates the specific constraint from Section 3.4.3:
        "Plate number and serial number cannot have values simultaneously." 
        """
        has_plate = bool(self.plate_number)
        has_serial = bool(self.serial_number)

        if has_plate and has_serial:
            raise ValidationError("A vehicle cannot have BOTH a Plate Number and a Serial Number. Choose one.")
        
        if not has_plate and not has_serial:
            raise ValidationError("You must provide either a Plate Number OR a Serial Number.")

    def save(self, *args, **kwargs):
        self.evidence_type = Evidence.EvidenceType.VEHICLE
        # Run validation before saving
        self.clean() 
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 4. ID DOCUMENT EVIDENCE [cite: 189-192]
# ═══════════════════════════════════════════════════════════════
class IDEvidence(Evidence):
    """
    "Name of owner... plus Key-Value pairs... which may not even exist."
    """
    owner_name = models.CharField(max_length=200, help_text="Name on the document")
    
    # "Store as Key-Value... these have no fixed number" 
    # Example: {"Father Name": "Ali", "National ID": "1234567890", "City": "Tehran"}
    document_data = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        self.evidence_type = Evidence.EvidenceType.ID_DOC
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 5. MISCELLANEOUS EVIDENCE [cite: 194-195]
# ═══════════════════════════════════════════════════════════════
class MiscEvidence(Evidence):
    """
    "Other evidence must be recorded with Title and Description."
    """
    # No extra fields needed, inherits title/desc from base Evidence
    
    def save(self, *args, **kwargs):
        self.evidence_type = Evidence.EvidenceType.MISC
        super().save(*args, **kwargs)