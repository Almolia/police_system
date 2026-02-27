from rest_framework import generics
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from .models import Case, Evidence, VehicleEvidence
from .models import BioEvidence
from .serializers import BioQueueSerializer
from accounts.permissions import IsPolicePersonnel, IsJudge, IsCitizen
from .serializers import (
    EvidenceListSerializer, VehicleEvidenceSerializer, 
    WitnessEvidenceSerializer, BioEvidenceSerializer, 
    IDEvidenceSerializer, MiscEvidenceSerializer
)
from rest_framework import permissions
from rest_framework.response import Response
from .models import BioEvidenceImage
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings

@extend_schema(summary="List all evidence for a Case", tags=["Evidence"])
class CaseEvidenceListView(generics.ListAPIView):
    """
    GET: List all evidence attached to a specific case.
    Citizens only see their own submissions. Police/Judges see everything.
    """
    serializer_class = EvidenceListSerializer
    # 1. Added IsCitizen so they are allowed to hit the endpoint
    permission_classes = [IsPolicePersonnel | IsJudge | IsCitizen]

    def get_queryset(self):
        case_id = self.kwargs.get('case_id')
        user = self.request.user
        
        # Base query: Get all evidence for this case
        queryset = Evidence.objects.filter(case_id=case_id).order_by('-created_at')

        # 2. Security Check: If it's a citizen, strictly filter by recorded_by
        if getattr(user, 'role', None) and user.role.codename == 'CITIZEN':
            return queryset.filter(recorded_by=user)

        # Police and Judges get the full unfiltered queryset
        return queryset

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
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        # 1. Save the bio evidence (linking the case and recorder)
        bio_item = serializer.save(
            recorder=self.request.user, 
            case_id=self.kwargs['case_id']
        )
        
        # 2. Extract the uploaded file from the React FormData
        image_file = self.request.FILES.get('image')
        
        if image_file:
            # 3. Define where to save it (e.g., media/evidence/bio/filename.jpg)
            file_name = f"evidence/bio/{image_file.name}"
            
            # 4. Save the file physically to the local disk using Django's storage
            saved_path = default_storage.save(file_name, image_file)
            
            # 5. Get the relative media URL (e.g., /media/evidence/bio/filename.jpg)
            relative_url = f"{settings.MEDIA_URL}{saved_path}"
            
            # 6. Convert it to a full absolute URL (http://127.0.0.1:8000/media/...) 
            # so the React frontend can load the image successfully!
            full_url = self.request.build_absolute_uri(relative_url)
            
            # 7. Create the database record linking the image to the evidence
            BioEvidenceImage.objects.create(
                evidence=bio_item,
                image_url=full_url,
                caption="Crime Scene Photo"
            )

@extend_schema(summary="Add ID Document Evidence", tags=["Evidence"])
class IDEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = IDEvidenceSerializer

@extend_schema(summary="Add Misc Evidence", tags=["Evidence"])
class MiscEvidenceCreateView(BaseEvidenceCreateView):
    serializer_class = MiscEvidenceSerializer

# ─── 1. GLOBAL CORONER QUEUE ───
class BioEvidenceQueueView(generics.ListAPIView):
    """
    GET: /api/evidence/bio/queue/
    Returns all BioEvidence across ALL cases that have not yet been verified.
    """
    serializer_class = BioQueueSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def get_queryset(self):
        return BioEvidence.objects.all().order_by('-created_at')


# ─── 2. CORONER VERIFICATION ACTION ───
class BioEvidenceReviewView(generics.UpdateAPIView):
    """PATCH: /api/evidence/bio/<id>/"""
    queryset = BioEvidence.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        bio_item = self.get_object()
        status = request.data.get('status')
        # Extract the custom notes written by the Coroner
        notes = request.data.get('coroner_verification', '')

        if status == 'APPROVED':
            bio_item.verified_by = request.user
            bio_item.coroner_verification = f"[APPROVED] {notes}"
        elif status == 'REJECTED':
            bio_item.verified_by = request.user
            bio_item.coroner_verification = f"[REJECTED] {notes}"
        
        bio_item.save() # This actually saves it to the network!
        return Response({"detail": "Saved", "id": bio_item.id})