from rest_framework import serializers
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
            'created_at'
        )
        
        # The citizen can ONLY write to 'description', 'case', and 'suspect'.
        # The system and the police control everything else.
        read_only_fields = (
            'id', 
            'status', 
            'amount', 
            'created_at'
        )

class OfficerTipReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ('id', 'status', 'case')
        
    def validate_status(self, value):
        if value not in ['FORWARDED', 'REJECTED']:
            raise serializers.ValidationError("Officer can only FORWARD or REJECT.")
        return value

class DetectiveTipApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ('id', 'status') 
        
    def validate_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Detective can only APPROVE or REJECT.")
        return value

    def update(self, instance, validated_data):
        new_status = validated_data.get('status')
        
        # Check if the Detective is approving it right now
        is_newly_approved = (new_status == 'APPROVED' and instance.status != 'APPROVED')
        
        if is_newly_approved:
            # 1. Generate the unique code for the citizen
            instance.unique_tracking_id = uuid.uuid4()
            
        # 2. Let DRF save the new status and the UUID to the database
        instance = super().update(instance, validated_data)

        if is_newly_approved:
            instance.calculate_reward_amount()

        return instance

# ─── BAIL / FINES ───
class ReleaseRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReleaseRequest
        fields = ('interrogation',)

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
        read_only_fields = ('id', 'status', 'authority', 'ref_id')