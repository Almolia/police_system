from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Suspect, Interrogation
from .serializers import (
    SuspectSerializer, InterrogationSerializer, 
    InterrogationScoreSerializer, VerdictSerializer
)
from .permissions import IsDetective, IsSergeant, IsCaptain, IsChief
from cases.models import CaseStatus

class SuspectViewSet(viewsets.ModelViewSet):
    queryset = Suspect.objects.all()
    serializer_class = SuspectSerializer

class InterrogationViewSet(viewsets.ModelViewSet):
    """
    Handles Section 4.5: Identification of Suspects and Interrogation
    """
    queryset = Interrogation.objects.all()
    serializer_class = InterrogationSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsDetective | IsSergeant])
    def submit_score(self, request, pk=None):
        """Section 4.5: Detective & Sergeant submit 1-10 probability score."""
        interrogation = self.get_object()
        serializer = InterrogationScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_role = request.user.role.codename
        
        if user_role == 'DETECTIVE':
            interrogation.detective_score = serializer.validated_data['score']
        elif user_role == 'SERGEANT':
            interrogation.sergeant_score = serializer.validated_data['score']
            
        interrogation.save()
        return Response({"message": "Score submitted successfully."})

    @action(detail=True, methods=['post'], permission_classes=[IsSergeant])
    def sergeant_verdict(self, request, pk=None):
        """Section 4.4 / 4.5: Sergeant approves/rejects detective's suspect."""
        interrogation = self.get_object()
        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interrogation.sergeant_approval = serializer.validated_data['approved']
        interrogation.sergeant_notes = serializer.validated_data.get('notes', '')
        interrogation.save()

        case = interrogation.case
        if interrogation.sergeant_approval:
            case.status = CaseStatus.INTERROGATION
        else:
            # Rejects -> Case stays open, notification back to detective
            case.status = CaseStatus.INVESTIGATION 
        case.save()

        return Response({"message": "Sergeant verdict recorded."})

    @action(detail=True, methods=['post'], permission_classes=[IsCaptain])
    def captain_verdict(self, request, pk=None):
        """Section 4.5: Captain reviews scores and gives verdict."""
        interrogation = self.get_object()
        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interrogation.captain_verdict = serializer.validated_data['approved']
        interrogation.save()

        case = interrogation.case
        if not interrogation.captain_verdict:
            case.status = CaseStatus.CLOSED_REJECTED
        else:
            if case.is_critical:
                case.status = CaseStatus.WAITING_FOR_CHIEF
            else:
                case.status = CaseStatus.IN_COURT
        case.save()

        return Response({"message": "Captain verdict recorded."})

    @action(detail=True, methods=['post'], permission_classes=[IsChief])
    def chief_verdict(self, request, pk=None):
        """Section 4.5: Chief reviews critical cases."""
        interrogation = self.get_object()
        case = interrogation.case
        
        if not case.is_critical:
            return Response({"error": "Only critical cases require Chief's verdict."}, status=400)

        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interrogation.chief_verdict = serializer.validated_data['approved']
        interrogation.save()

        if interrogation.chief_verdict:
            case.status = CaseStatus.IN_COURT
        else:
            case.status = CaseStatus.CLOSED_REJECTED
        case.save()

        return Response({"message": "Chief verdict recorded."})
