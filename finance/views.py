from rest_framework import generics, permissions, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Reward, Transaction
from .serializers import CitizenRewardSubmitSerializer, TransactionSerializer
from accounts.permissions import IsCitizen
import uuid

# ═══════════════════════════════════════════════════════════════
# 1. REWARDS (Citizen Facing)
# ═══════════════════════════════════════════════════════════════
class SubmitTipView(generics.CreateAPIView):
    """
    Allows a logged-in Citizen to submit a tip.
    """
    queryset = Reward.objects.all()
    serializer_class = CitizenRewardSubmitSerializer
    permission_classes = [IsCitizen]

    @extend_schema(
        summary="Submit a Tip for a Reward",
        description="Citizens can submit information regarding a specific Most Wanted suspect."
    )
    def perform_create(self, serializer):
        # 1. Auto-assign the logged-in citizen
        # 2. The amount will be calculated by the model method later, 
        # but we can call it immediately after saving.
        reward = serializer.save(citizen=self.request.user)
        reward.calculate_reward_amount()


# ═══════════════════════════════════════════════════════════════
# 2. TRANSACTIONS (Mock Gateway)
# ═══════════════════════════════════════════════════════════════
class InitiatePaymentView(generics.CreateAPIView):
    """
    Step 1 of Payment: User requests to pay bail/fine.
    We create the transaction as PENDING and mock an 'authority' code.
    """
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Initiate a Payment (Bail/Fine)",
        description="Creates a PENDING transaction and returns a bank authority code to redirect the user."
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Mocking the bank's response (This is where we make an API call to ZarinPal)
        fake_authority_code = f"A{uuid.uuid4().hex[:30]}" 
        
        transaction = serializer.save(
            payer=request.user,
            authority=fake_authority_code,
            status=Transaction.Status.PENDING
        )
        
        return Response({
            "message": "Redirect user to bank using this authority code.",
            "authority": transaction.authority,
            "amount": transaction.amount
        }, status=status.HTTP_201_CREATED)