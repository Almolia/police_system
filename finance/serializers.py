from rest_framework import serializers
from .models import Reward, Transaction

# ═══════════════════════════════════════════════════════════════
# 1. REWARDS
# ═══════════════════════════════════════════════════════════════
class CitizenRewardSubmitSerializer(serializers.ModelSerializer):
    """
    Used by public citizens to submit a tip about a Most Wanted suspect.
    """
    class Meta:
        model = Reward
        fields = ('id', 'suspect', 'description', 'unique_tracking_id', 'status', 'amount')
        # The user can ONLY write to 'suspect' and 'description'
        read_only_fields = ('id', 'unique_tracking_id', 'status', 'amount')

class PoliceRewardReviewSerializer(serializers.ModelSerializer):
    """
    Used by Officers/Detectives to update the status of a tip.
    """
    class Meta:
        model = Reward
        fields = '__all__'
        
        # ── SECURITY: The Bouncer ──
        # The officer can ONLY edit the 'status'. 
        # Everything else is locked down so the original tip cannot be tampered with.
        read_only_fields = (
            'id', 
            'citizen', 
            'suspect', 
            'description', 
            'unique_tracking_id', 
            'amount', 
            'officer_reviewer',
            'detective_approver', 
            'created_at', 
            'updated_at'
        )


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