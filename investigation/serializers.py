from rest_framework import serializers
from .models import Suspect, Interrogation, BoardNode, BoardConnection

class SuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspect
        fields = '__all__'
        read_only_fields = ('cached_ranking_score', 'status')

class InterrogationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interrogation
        fields = '__all__'

class InterrogationScoreSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=1, max_value=10)

class VerdictSerializer(serializers.Serializer):
    approved = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)
