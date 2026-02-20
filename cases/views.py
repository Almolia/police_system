from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Case, CaseStatus, CaseStatusLog
from .serializers import CaseSerializer, CaseReviewSerializer
from .permissions import IsCadet, IsOfficer, IsSuperior

class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer

    def perform_create(self, serializer):
        formation_type = serializer.validated_data.get('formation_type')
        user = self.request.user
        
        if formation_type == 'COMPLAINT':
            # Citizen filing a complaint (Section 4.2.1)
            serializer.save(primary_complainant=user, status=CaseStatus.PENDING_CADET_REVIEW)
        else:
            # Police filing a crime scene (Section 4.2.2)
            # If Chief files it, auto-open. Otherwise, requires superior approval.
            is_chief = user.role and user.role.codename == 'CHIEF'
            initial_status = CaseStatus.OPEN if is_chief else CaseStatus.PENDING_SUPERIOR_APPROVAL
            serializer.save(reported_by=user, status=initial_status)

    def _log_status(self, case, from_status, to_status, message=""):
        CaseStatusLog.objects.create(
            case=case,
            from_status=from_status,
            to_status=to_status,
            changed_by=self.request.user,
            message=message
        )

    @action(detail=True, methods=['post'], permission_classes=[IsCadet])
    def cadet_review(self, request, pk=None):
        """Section 4.2.1: Cadet reviews complaint"""
        case = self.get_object()
        serializer = CaseReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if case.status != CaseStatus.PENDING_CADET_REVIEW:
            return Response({"error": "Case not pending cadet review."}, status=400)

        old_status = case.status
        if serializer.validated_data['action'] == 'APPROVE':
            case.status = CaseStatus.PENDING_OFFICER_REVIEW
            case.save()
            self._log_status(case, old_status, case.status, "Cadet approved. Sent to Officer.")
        else:
            # Rejection logic - increments counter, voids if >= 3
            case.increment_complainant_rejection()
            self._log_status(case, old_status, case.status, serializer.validated_data['message'])

        return Response({"status": case.status})

    @action(detail=True, methods=['post'], permission_classes=[IsOfficer])
    def officer_review(self, request, pk=None):
        """Section 4.2.1: Officer finalizes complaint"""
        case = self.get_object()
        serializer = CaseReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if case.status != CaseStatus.PENDING_OFFICER_REVIEW:
            return Response({"error": "Case not pending officer review."}, status=400)

        old_status = case.status
        if serializer.validated_data['action'] == 'APPROVE':
            case.status = CaseStatus.OPEN
            case.save()
            self._log_status(case, old_status, case.status, "Officer approved. Case OPEN.")
        else:
            # Officer rejection sends it back to CADET, not complainant
            case.status = CaseStatus.RETURNED_TO_CADET
            case.save()
            self._log_status(case, old_status, case.status, serializer.validated_data['message'])

        return Response({"status": case.status})
