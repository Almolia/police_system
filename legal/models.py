from django.db import models
from django.conf import settings

class CourtVerdict(models.Model):
    """
    The final legal judgment for a specific suspect in a specific case.
    
    Access Requirement [Section 4.6]:
    "The Judge must have the full file... including every report accepted or rejected."
    -> This is handled by the 'interrogation' link, which gives access to:
       interrogation.case.evidence_list
       interrogation.case.reports
       interrogation.detective_score (Police opinion)
    """

    class VerdictType(models.TextChoices):
        GUILTY   = 'GUILTY',   'Guilty (Convicted)'
        INNOCENT = 'INNOCENT', 'Innocent (Acquitted)'

    class SentenceType(models.TextChoices):
        NONE             = 'NONE',             'None (Innocent)'
        PRISON           = 'PRISON',           'Imprisonment'
        FINE             = 'FINE',             'Fine Penalty'
        PRISON_AND_FINE  = 'PRISON_AND_FINE',  'Prison & Fine'
        COMMUNITY_SERVICE= 'COMMUNITY',        'Community Service'
        EXECUTION        = 'EXECUTION',        'Death Penalty' # For Critical/Terror cases

    # 1. Link to the specific Suspect-Case pair
    # OneToOne because a suspect gets exactly ONE final verdict per case.
    interrogation = models.OneToOneField(
        'investigation.Interrogation',
        on_delete=models.CASCADE,
        related_name='court_verdict'
    )

    # 2. The Judge
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='issued_verdicts'
    )

    # 3. The Decision
    verdict = models.CharField(
        max_length=20, 
        choices=VerdictType.choices,
        default=VerdictType.INNOCENT
    )
    
    # 4. The Punishment
    sentence_type = models.CharField(
        max_length=20, 
        choices=SentenceType.choices, 
        default=SentenceType.NONE
    )
    
    # Details of the sentence
    prison_months = models.PositiveIntegerField(
        default=0, 
        help_text="Duration in months (if applicable)"
    )
    fine_amount = models.BigIntegerField(
        default=0, 
        help_text="Amount in Rials (if applicable)"
    )
    
    # "Judge registers the punishment with title and descriptions"
    title = models.CharField(max_length=255, help_text="e.g., '1st Degree Murder Conviction'")
    description = models.TextField(help_text="Full text of the sentencing")

    issued_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """
        Auto-updates the Suspect's global status based on the verdict.
        """
        super().save(*args, **kwargs)
        
        # Access the suspect via the interrogation link
        suspect = self.interrogation.suspect
        
        if self.verdict == self.VerdictType.GUILTY:
            suspect.status = 'CONVICTED' # Matches SuspectStatus enum
        else:
            suspect.status = 'ACQUITTED'
            
        suspect.save()

    def __str__(self):
        return f"Verdict for {self.interrogation.suspect}: {self.verdict}"