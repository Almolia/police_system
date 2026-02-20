from rest_framework import serializers
from .models import CourtVerdict

class CourtVerdictSerializer(serializers.ModelSerializer):
    """
    Serializer for Court Verdicts.
    Enforces logical rules between the Verdict (Guilty/Innocent) and the Sentence.
    """
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)

    class Meta:
        model = CourtVerdict
        fields = (
            'id', 'interrogation', 'judge', 'judge_name', 'verdict', 
            'sentence_type', 'prison_months', 'fine_amount', 
            'title', 'description', 'issued_at'
        )
        # The Judge is automatically assigned based on the logged-in user
        read_only_fields = ('id', 'judge', 'issued_at')

    def validate(self, attrs):
        verdict = attrs.get('verdict')
        sentence_type = attrs.get('sentence_type')

        # Rule 1: Innocent people cannot be sentenced
        if verdict == CourtVerdict.VerdictType.INNOCENT:
            if sentence_type != CourtVerdict.SentenceType.NONE:
                raise serializers.ValidationError({
                    "sentence_type": "An innocent verdict must have a sentence type of 'NONE'."
                })
            # Auto-zero the punishments just in case the frontend sent them
            attrs['prison_months'] = 0
            attrs['fine_amount'] = 0

        # Rule 2: Guilty people MUST be sentenced
        elif verdict == CourtVerdict.VerdictType.GUILTY:
            if sentence_type == CourtVerdict.SentenceType.NONE:
                raise serializers.ValidationError({
                    "sentence_type": "A guilty verdict requires a specific punishment (e.g., PRISON, FINE)."
                })

        return attrs