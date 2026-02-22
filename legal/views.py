from rest_framework import viewsets
from .models import CourtVerdict
from .serializers import CourtVerdictSerializer
from .permissions import IsJudge
from cases.models import CaseStatus

class CourtVerdictViewSet(viewsets.ModelViewSet):
    """
    Handles Final Judiciary process.
    Judges create verdicts which automatically update the case status.
    """
    queryset = CourtVerdict.objects.all()
    serializer_class = CourtVerdictSerializer
    permission_classes = [IsJudge]

    def perform_create(self, serializer):
        # 1. Save the verdict and attribute it to the Judge
        verdict = serializer.save(judge=self.request.user)
        
        # 2. Close the Case status globally
        # Note: A case might have multiple suspects, but for simplicity
        # we mark the case as CLOSED_VERDICT once a verdict is reached.
        case = verdict.interrogation.case
        if case.status != CaseStatus.CLOSED_VERDICT:
            case.status = CaseStatus.CLOSED_VERDICT
            case.save()
            
            # Log the closure in the audit trail
            from cases.models import CaseStatusLog
            CaseStatusLog.objects.create(
                case=case,
                from_status=case.status,
                to_status=CaseStatus.CLOSED_VERDICT,
                changed_by=self.request.user,
                message=f"Case closed by Judge {self.request.user.last_name}"
            )
