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

# ═══════════════════════════════════════════════════════════════
# 1. PUBLIC / CITIZEN DASHBOARD
# ═══════════════════════════════════════════════════════════════
class PublicDashboardView(APIView):
    """
    Open to everyone. Shows Most Wanted criminals, active cases, 
    and a high-level summary of police success.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Public Home Dashboard", tags=["Dashboards"])
    def get(self, request):
        # 1. Get Wanted Suspects (Top 5 highest score)
        wanted_suspects = Suspect.objects.filter(
            status='WANTED'
        ).order_by('-cached_ranking_score')[:5]

        # 2. Get Open Cases (Latest 5)
        recent_cases = Case.objects.filter(
            status='OPEN'
        ).order_by('-created_at')[:5]

        # 3. Get the latest Daily Stat (for the "Total Cases Solved" banner)
        latest_stat = DailySystemStat.objects.order_by('-date').first()
        stats_data = DailySystemStatSerializer(latest_stat).data if latest_stat else None

        return Response({
            "most_wanted": PublicSuspectSerializer(wanted_suspects, many=True).data,
            "recent_cases": PublicCaseSerializer(recent_cases, many=True).data,
            "system_stats": stats_data
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