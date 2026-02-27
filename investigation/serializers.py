from rest_framework import serializers
from .models import Suspect, Interrogation, BoardNode, BoardConnection
from .models import Notification


class SuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspect
        fields = '__all__'
        read_only_fields = ('cached_ranking_score', 'status')

class InterrogationSerializer(serializers.ModelSerializer):
    captain_name = serializers.CharField(source='captain_reviewer.get_full_name', read_only=True)
    chief_name = serializers.CharField(source='chief_reviewer.get_full_name', read_only=True)
    class Meta:
        model = Interrogation
        fields = '__all__'

class InterrogationScoreSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=1, max_value=10)

class VerdictSerializer(serializers.Serializer):
    approved = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)

class BoardNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardNode
        fields = '__all__'

class BoardConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardConnection
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'