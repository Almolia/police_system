from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
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
    recorder_name = serializers.CharField(source='recorder.get_full_name', read_only=True)
    type_display = serializers.CharField(source='get_evidence_type_display', read_only=True)
    
    # ─── TYPE-SPECIFIC FIELDS (Polymorphic Access) ───
    # We use source='childmodelname.fieldname' to pull data from sub-tables
    vehicle_details = serializers.SerializerMethodField()
    witness_details = serializers.SerializerMethodField()
    bio_details = serializers.SerializerMethodField()
    id_details = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = (
            'id', 'title', 'description', 'evidence_type', 'type_display', 
            'recorder_name', 'created_at',
            'vehicle_details', 'witness_details', 'bio_details', 'id_details'
        )
        
    def get_vehicle_details(self, obj):
        if obj.evidence_type == 'VEHICLE' and hasattr(obj, 'vehicleevidence'):
            v = obj.vehicleevidence
            return {"model": v.model_name, "color": v.color, "plate": v.plate_number, "serial": v.serial_number}
        return None

    def get_witness_details(self, obj):
        if obj.evidence_type == 'WITNESS' and hasattr(obj, 'witnessevidence'):
            w = obj.witnessevidence
            return {"transcript": w.transcript, "media": w.media_url}
        return None

    def get_bio_details(self, obj):
        if obj.evidence_type == 'BIO' and hasattr(obj, 'bioevidence'):
            b = obj.bioevidence
            return {
                "bio_type": b.bio_type, 
                "verification": b.coroner_verification,
                "image_url": b.main_image
            }
        return None

    def get_id_details(self, obj):
        if obj.evidence_type == 'ID' and hasattr(obj, 'idevidence'):
            i = obj.idevidence
            return {"owner": i.owner_name, "data": i.document_data}
        return None

class BioQueueSerializer(serializers.ModelSerializer):
    """Serializer for the Medical Examiner's global queue."""
    recorder_name = serializers.SerializerMethodField()
    images = BioEvidenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = BioEvidence
        # These fields match exactly what CoronerPanel.tsx expects
        fields = [
            'id', 'title', 'description', 'bio_type', 
            'case', 'created_at', 'recorder_name', 
            'coroner_verification', 'images'
        ]

    @extend_schema_field(serializers.CharField())
    def get_recorder_name(self, obj):
        return f"{obj.recorder.first_name} {obj.recorder.last_name}"