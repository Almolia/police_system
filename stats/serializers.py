from rest_framework import serializers
from .models import DailySystemStat
from investigation.models import Suspect
from cases.models import Case

class DailySystemStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySystemStat
        fields = '__all__'

class PublicSuspectSerializer(serializers.ModelSerializer):
    """Brief suspect data for the public to submit tips."""
    class Meta:
        model = Suspect
        fields = ('id', 'alias', 'status', 'cached_ranking_score')

class PublicCaseSerializer(serializers.ModelSerializer):
    """Brief case data so witnesses know where to send evidence."""
    class Meta:
        model = Case
        fields = ('id', 'title', 'crime_level', 'status', 'created_at')