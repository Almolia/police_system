from rest_framework import serializers
from .models import CourtVerdict

class CourtVerdictSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourtVerdict
        fields = '__all__'
        read_only_fields = ('issued_at', 'judge')

    def validate(self, data):
        # Validate that the sentence matches the required details
        sentence_type = data.get('sentence_type')
        if sentence_type in ['PRISON', 'PRISON_AND_FINE'] and data.get('prison_months', 0) <= 0:
            raise serializers.ValidationError("Prison sentence requires prison_months > 0.")
        if sentence_type in ['FINE', 'PRISON_AND_FINE'] and data.get('fine_amount', 0) <= 0:
            raise serializers.ValidationError("Fine penalty requires fine_amount > 0.")
        return data
