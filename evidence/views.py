from rest_framework import generics
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from .models import Case, Evidence, VehicleEvidence
from accounts.permissions import IsPolicePersonnel
from .serializers import (
    EvidenceListSerializer, VehicleEvidenceSerializer, 
    WitnessEvidenceSerializer, BioEvidenceSerializer, 
    IDEvidenceSerializer, MiscEvidenceSerializer
)

@extend_schema(summary="List all evidence for a Case", tags=["Evidence"])
class CaseEvidenceListView(generics.ListAPIView):
    """
    GET: List all evidence attached to a specific case.
    """
    serializer_class = EvidenceListSerializer
    permission_classes = [IsPolicePersonnel]

    def get_queryset(self):
        case_id = self.kwargs.get('case_id')
        return Evidence.objects.filter(case_id=case_id).order_by('-created_at')

# --- Base Class to keep our code DRY ---
class BaseEvidenceCreateView(generics.CreateAPIView):
    """
    A custom base view that automatically assigns the 'case' from the URL
    and the 'recorder' from the logged-in user.
    """
    permission_classes = [IsPolicePersonnel]

    def perform_create(self, serializer):
        case_id = self.kwargs.get('case_id')
        case = get_object_or_404(Case, id=case_id)
        # Auto-assign the required relationships
        serializer.save(recorder=self.request.user, case=case)

# --- The Specific Creation Endpoints ---
@extend_schema(summary="Add Vehicle Evidence", tags=["Evidence"])
class VehicleEvidenceCreateView(BaseEvidenceCreateView):
    queryset = VehicleEvidence.objects.all()
    serializer_class = VehicleEvidenceSerializer

@extend_schema(summary="Add Witness Evidence", tags=["Evidence"])
class WitnessEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = WitnessEvidenceSerializer

@extend_schema(summary="Add Biological Evidence", tags=["Evidence"])
class BioEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = BioEvidenceSerializer

@extend_schema(summary="Add ID Document Evidence", tags=["Evidence"])
class IDEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = IDEvidenceSerializer

@extend_schema(summary="Add Misc Evidence", tags=["Evidence"])
class MiscEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = MiscEvidenceSerializer