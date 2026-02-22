from rest_framework import serializers
from .models import (
    Evidence, WitnessEvidence, BioEvidence, BioEvidenceImage, 
    VehicleEvidence, IDEvidence, MiscEvidence
)

# ─── NESTED IMAGES FOR BIO EVIDENCE ──────────────────────────────
class BioEvidenceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BioEvidenceImage
        fields = ('id', 'image_url', 'caption', 'uploaded_at')

# ─── SPECIFIC EVIDENCE SERIALIZERS ───────────────────────────────
class WitnessEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WitnessEvidence
        fields = '__all__'
        read_only_fields = ('recorder', 'evidence_type', 'case')

class BioEvidenceSerializer(serializers.ModelSerializer):
    images = BioEvidenceImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = BioEvidence
        fields = '__all__'
        # The Coroner verification fields shouldn't be set during creation!
        read_only_fields = ('recorder', 'evidence_type', 'case', 'coroner_verification', 'verified_by')

class VehicleEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleEvidence
        fields = '__all__'
        read_only_fields = ('recorder', 'evidence_type', 'case')

    def validate(self, attrs):
        # We must enforce the Plate vs. Serial rule here for the API!
        has_plate = bool(attrs.get('plate_number'))
        has_serial = bool(attrs.get('serial_number'))

        if has_plate and has_serial:
            raise serializers.ValidationError("A vehicle cannot have BOTH a Plate Number and a Serial Number.")
        if not has_plate and not has_serial:
            raise serializers.ValidationError("You must provide either a Plate Number OR a Serial Number.")
        
        return attrs

class IDEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IDEvidence
        fields = '__all__'
        read_only_fields = ('recorder', 'evidence_type', 'case')

class MiscEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiscEvidence
        fields = '__all__'
        read_only_fields = ('recorder', 'evidence_type', 'case')

# ─── UNIFIED READ-ONLY LIST SERIALIZER ───────────────────────────
class EvidenceListSerializer(serializers.ModelSerializer):
    """
    Used to return a lightweight list of ALL evidence for a specific case,
    regardless of what child type it is.
    """
    recorder_name = serializers.CharField(source='recorder.get_full_name', read_only=True)
    type_display = serializers.CharField(source='get_evidence_type_display', read_only=True)

    class Meta:
        model = Evidence
        fields = ('id', 'title', 'type_display', 'recorder_name', 'created_at')