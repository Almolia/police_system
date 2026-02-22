from rest_framework import generics
from drf_spectacular.utils import extend_schema, OpenApiExample
from .models import CourtVerdict
from .serializers import CourtVerdictSerializer
from accounts.permissions import IsJudge, IsPolicePersonnel

class CourtVerdictListCreateView(generics.ListCreateAPIView):
    """
    GET: List all verdicts (Accessible by any Police Personnel).
    POST: Issue a new verdict (Strictly limited to Judges).
    """
    queryset = CourtVerdict.objects.select_related('interrogation', 'judge').all()
    serializer_class = CourtVerdictSerializer

    def get_permissions(self):
        # Dynamically assign permissions based on the request method
        if self.request.method == 'POST':
            return [IsJudge()]
        return [IsPolicePersonnel()]

    @extend_schema(
        summary="Issue a Court Verdict",
        description="Allows a Judge to issue a final verdict for a suspect in a case. The Judge is automatically assigned from the JWT token.",
        examples=[
            OpenApiExample(
                "Guilty Verdict Example",
                value={
                    "interrogation": 1,
                    "verdict": "GUILTY",
                    "sentence_type": "PRISON_AND_FINE",
                    "prison_months": 120,
                    "fine_amount": 500000000,
                    "title": "Conviction for Armed Robbery",
                    "description": "The suspect was found guilty on all charges..."
                },
                request_only=True
            )
        ]
    )
    def perform_create(self, serializer):
        # Auto-assign the logged-in Judge to this verdict
        serializer.save(judge=self.request.user)

class CourtVerdictDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific verdict by its ID.
    """
    queryset = CourtVerdict.objects.all()
    serializer_class = CourtVerdictSerializer
    permission_classes = [IsPolicePersonnel]

    @extend_schema(summary="Get Verdict Details")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)