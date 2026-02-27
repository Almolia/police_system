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

from .models import BoardNode, BoardConnection
from .serializers import BoardNodeSerializer, BoardConnectionSerializer
from .models import Notification
from .serializers import NotificationSerializer
import rest_framework.permissions as permissions

class BoardNodeViewSet(viewsets.ModelViewSet):
    queryset = BoardNode.objects.all()
    serializer_class = BoardNodeSerializer
    permission_classes = [IsDetective | IsSergeant]

    def get_queryset(self):
            case_id = self.request.query_params.get('case_id')
            if case_id:
                # Clean the ID: remove trailing slashes or non-digit chars
                clean_id = ''.join(filter(str.isdigit, case_id))
                if clean_id:
                    return self.queryset.filter(case_id=clean_id)
            return self.queryset

class BoardConnectionViewSet(viewsets.ModelViewSet):
    queryset = BoardConnection.objects.all()
    serializer_class = BoardConnectionSerializer
    permission_classes = [IsDetective | IsSergeant]

    def get_queryset(self):
            case_id = self.request.query_params.get('case_id')
            if case_id:
                # Clean the ID here as well to prevent the ValueError
                clean_id = ''.join(filter(str.isdigit, case_id))
                if clean_id:
                    return self.queryset.filter(case_id=clean_id)
            return self.queryset

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
    @action(detail=True, methods=['post'], permission_classes=[IsSergeant])
    def sergeant_verdict(self, request, pk=None):
        interrogation = self.get_object()
        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_approved = serializer.validated_data['approved']
        notes = serializer.validated_data.get('notes', 'No specific notes provided.')
        
        interrogation.sergeant_approval = is_approved
        interrogation.sergeant_notes = notes
        interrogation.save()

        case = interrogation.case
        detective = case.assigned_detective

        if detective:
            if is_approved:
                # Suspect Approved -> Tell detective arrests can start
                Notification.objects.create(
                    recipient=detective,
                    notification_type=Notification.NotificationType.SERGEANT_APPROVED,
                    case=case,
                    message=f"Sergeant authorized arrest for suspect '{interrogation.suspect.alias}' on Case #{case.id}."
                )
            else:
                # Suspect Rejected -> Send the rejection notes back to the Detective
                Notification.objects.create(
                    recipient=detective,
                    notification_type=Notification.NotificationType.SERGEANT_REJECTED,
                    case=case,
                    message=f"Sergeant REJECTED suspect '{interrogation.suspect.alias}'. Reason: {notes}"
                )

        return Response({"message": "Sergeant verdict and notifications recorded."})

    @action(detail=True, methods=['post'], permission_classes=[IsCaptain])
    def captain_verdict(self, request, pk=None):
        """Section 4.5: Captain reviews scores and gives verdict."""
        interrogation = self.get_object()
        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interrogation.captain_verdict = serializer.validated_data['approved']
        interrogation.captain_reviewer = request.user
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
        interrogation.chief_reviewer = request.user
        interrogation.save()

        if interrogation.chief_verdict:
            case.status = CaseStatus.IN_COURT
        else:
            case.status = CaseStatus.CLOSED_REJECTED
        case.save()

        return Response({"message": "Chief verdict recorded."})

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Allows a user to fetch their own notifications.
    Includes a custom action to mark them as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can ONLY see their own notifications
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "Notification marked as read."})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"status": "All notifications marked as read."})
