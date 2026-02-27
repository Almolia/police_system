from rest_framework import serializers
from django.db.models import Sum
from drf_spectacular.utils import extend_schema_field
from .models import Reward, Transaction, ReleaseRequest
import uuid


# ═══════════════════════════════════════════════════════════════
# 1. REWARDS
# ═══════════════════════════════════════════════════════════════
# ─── TIPS / REWARDS ───
class CitizenRewardSubmitSerializer(serializers.ModelSerializer):
    """
    Used by Citizens to submit a tip.
    Strictly locks down all financial and status fields so they cannot be tampered with.
    """
    class Meta:
        model = Reward
        fields = (
            'id', 
            'description', 
            'case',       # Optional: If the citizen knows which case it is
            'suspect',    # Optional: If the citizen knows who the suspect is
            'status', 
            'amount', 
            'created_at',
            'unique_tracking_id'
        )
        
        # The citizen can ONLY write to 'description', 'case', and 'suspect'.
        # The system and the police control everything else.
        read_only_fields = (
            'id', 
            'status', 
            'amount', 
            'created_at',
            'unique_tracking_id'
        )

class OfficerTipReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ('id', 'status', 'unique_tracking_id', 'amount') 
        read_only_fields = ('unique_tracking_id', 'amount')
        
    def validate_status(self, value):
        if value not in ['FORWARDED', 'REJECTED']:
            raise serializers.ValidationError("Officer can only FORWARD or REJECT.")
        return value

class DetectiveTipApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ('id', 'status', 'unique_tracking_id', 'amount') 
        read_only_fields = ('unique_tracking_id', 'amount')
        
    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Detective can only APPROVE or REJECT.")
        return value

    def update(self, instance, validated_data):
        new_status = validated_data.get('status')
        is_newly_approved = (new_status == 'APPROVED' and instance.status != 'APPROVED')
        
        if is_newly_approved:
            instance.unique_tracking_id = uuid.uuid4()
            
        instance = super().update(instance, validated_data)

        if is_newly_approved:
            instance.calculate_reward_amount()
            instance.save()

        return instance
    
# ─── BAIL / FINES ───from django.db.models import Sum
class ReleaseRequestCreateSerializer(serializers.ModelSerializer):
    bail_paid = serializers.SerializerMethodField()
    fine_paid = serializers.SerializerMethodField()

    class Meta:
        model = ReleaseRequest
        fields = ('id', 'interrogation', 'status', 'bail_amount', 'fine_amount', 'created_at', 'bail_paid', 'fine_paid')
        read_only_fields = ('id', 'status', 'created_at', 'bail_amount', 'fine_amount', 'bail_paid', 'fine_paid') 

    @extend_schema_field(serializers.IntegerField())
    def get_bail_paid(self, obj):
        """
        Sums up all 'SUCCESS' transactions of type 'BAIL' 
        for this specific interrogation.
        """
        return Transaction.objects.filter(
            interrogation=obj.interrogation, 
            transaction_type=Transaction.Type.BAIL, 
            status=Transaction.Status.SUCCESS
        ).aggregate(total=Sum('amount'))['total'] or 0

    @extend_schema_field(serializers.IntegerField())
    def get_fine_paid(self, obj):
        """
        Sums up all 'SUCCESS' transactions of type 'FINE' 
        for this specific interrogation.
        """
        return Transaction.objects.filter(
            interrogation=obj.interrogation, 
            transaction_type=Transaction.Type.FINE, 
            status=Transaction.Status.SUCCESS
        ).aggregate(total=Sum('amount'))['total'] or 0

class SergeantReleaseReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReleaseRequest
        fields = ('status', 'bail_amount', 'fine_amount')

    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Sergeant can only APPROVE or REJECT.")
        return value

# ═══════════════════════════════════════════════════════════════
# 2. TRANSACTIONS
# ═══════════════════════════════════════════════════════════════
class TransactionSerializer(serializers.ModelSerializer):
    """
    Handles Bail and Fine payments.
    """
    class Meta:
        model = Transaction
        fields = ('id', 'interrogation', 'transaction_type', 'amount', 'status', 'authority', 'ref_id')
        # Security: The user shouldn't be able to manually set their status to SUCCESS
        read_only_fields = ('id', 'status', 'authority', 'ref_id', 'amount')