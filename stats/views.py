from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from drf_spectacular.utils import extend_schema

from .models import DailySystemStat
from investigation.models import Suspect, Interrogation
from cases.models import Case
from accounts.permissions import IsDetective, IsChief

from .serializers import (
    DailySystemStatSerializer, 
    PublicSuspectSerializer, 
    PublicCaseSerializer
)
from django.contrib.auth import get_user_model


User = get_user_model()

class PublicDashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Public Home Dashboard", tags=["Dashboards"])
    def get(self, request):
        # 1. Get Top Suspects (Grabs the highest threat scores that aren't already arrested)
        wanted_suspects = Suspect.objects.exclude(
            status__in=['ARRESTED', 'CONVICTED', 'ACQUITTED']
        ).order_by('-cached_ranking_score')[:6]

        # 2. REAL-TIME SYSTEM STATS (No fake data)
        solved_cases = Case.objects.filter(status__in=['CLOSED_SOLVED', 'CLOSED_REJECTED']).count()
        active_investigations = Case.objects.exclude(status__in=['CLOSED_SOLVED', 'CLOSED_REJECTED']).count()
        active_personnel = User.objects.exclude(role__name='CITIZEN').count()

        return Response({
            "most_wanted": PublicSuspectSerializer(wanted_suspects, many=True).data,
            "system_stats": {
                "solved_cases": solved_cases,
                "active_investigations": active_investigations,
                "active_personnel": active_personnel
            }
        })

# ═══════════════════════════════════════════════════════════════
# 2. DETECTIVE DASHBOARD
# ═══════════════════════════════════════════════════════════════
class DetectiveDashboardView(APIView):
    """
    Provides all the data needed to render the Detective Board UI.
    """
    permission_classes = [IsDetective]

    @extend_schema(summary="Detective Board Dashboard", tags=["Dashboards"])
    def get(self, request):
        # Find all open cases assigned to this specific detective
        my_cases = Case.objects.filter(detective=request.user, status='OPEN')
        
        # Find all pending interrogations they need to review
        pending_interrogations = Interrogation.objects.filter(
            case__in=my_cases, 
            detective_score=0 # Assuming 0 means unreviewed
        )

        return Response({
            "active_cases_count": my_cases.count(),
            "pending_interrogations_count": pending_interrogations.count(),
            "cases": my_cases.values('id', 'title', 'crime_level') 
        })


# ═══════════════════════════════════════════════════════════════
# 3. CHIEF DASHBOARD
# ═══════════════════════════════════════════════════════════════
class ChiefDashboardView(APIView):
    """
    System-wide metrics, financial data, and historical trends.
    """
    permission_classes = [IsChief]

    @extend_schema(summary="Chief Executive Dashboard", tags=["Dashboards"])
    def get(self, request):
        # Return the last 30 days of stats for charting
        monthly_stats = DailySystemStat.objects.order_by('-date')[:30]
        
        return Response({
            "monthly_trends": DailySystemStatSerializer(monthly_stats, many=True).data,
        })