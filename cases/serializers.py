from rest_framework import serializers
from .models import Case, CaseComplainant, CaseWitness, CaseStatus

class CaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = '__all__'
        read_only_fields = ('status', 'complainant_rejection_count', 'primary_complainant', 'reported_by', 'assigned_detective', 'assigned_sergeant')

    def validate(self, data):
        """
        Validation based on Section 4.2: Formation of Case
        """
        formation_type = data.get('formation_type')
        
        # Section 4.2.2: Crime Scene constraints
        if formation_type == 'CRIME_SCENE':
            if not data.get('crime_occurred_at') or not data.get('crime_scene_location'):
                raise serializers.ValidationError("Crime scene cases require time and location.")
        
        return data

class CaseReviewSerializer(serializers.Serializer):
    """Used for Cadet/Officer approving or rejecting a case"""
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT'])
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        # Section 4.2.1: Rejection must have an error message
        if data['action'] == 'REJECT' and not data.get('message'):
            raise serializers.ValidationError("A message is required when rejecting a case.")
        return data
