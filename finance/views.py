from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiExample, inline_serializer, OpenApiParameter
from rest_framework import serializers
from django.contrib.auth import get_user_model 
from accounts.permissions import IsSergeant

from .models import Reward, ReleaseRequest, Transaction
from .serializers import (
    CitizenRewardSubmitSerializer, OfficerTipReviewSerializer, DetectiveTipApprovalSerializer,
    ReleaseRequestCreateSerializer, SergeantReleaseReviewSerializer, TransactionSerializer
)
from accounts.permissions import IsPolicePersonnel

from django.conf import settings

ZARINPAL_MERCHANT_ID = getattr(settings, 'ZARINPAL_MERCHANT_ID', '12345678-1234-1234-1234-1234567890ab')
CALLBACK_URL = getattr(settings, 'PAYMENT_CALLBACK_URL', 'http://127.0.0.1:8000/api/finance/payments/callback/')

ZARINPAL_REQUEST_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
ZARINPAL_STARTPAY_URL = 'https://sandbox.zarinpal.com/pg/StartPay/'
ZARINPAL_VERIFY_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'

# ═══════════════════════════════════════════════════════════════
# TIPS (REWARDS)
# ═══════════════════════════════════════════════════════════════
@extend_schema(
        tags=['Tips'],
        summary="Submit a New Tip (Citizen)",
        description="Allows a citizen to submit a new tip. The citizen is automatically linked via the request user.",
        examples=[
            OpenApiExample(
                name="Valid Tip Submission",
                description="Example of a citizen submitting a tip for a specific case.",
                value={
                    "description": "I saw the suspect hiding in the abandoned warehouse on 5th street.",
                    "case": 12,
                    "suspect": 5
                },
                request_only=True,
            )
        ]
    )
class TipListCreateView(generics.CreateAPIView):
    """POST /tips/ - Citizen submits a new tip."""
    queryset = Reward.objects.all()
    serializer_class = CitizenRewardSubmitSerializer
    
    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)

@extend_schema(
        tags=['Tips'],
        summary="Review or Approve Tip",
        description="Dynamically routes the update based on the user's role. Officers use `OfficerTipReviewSerializer`, Detectives use `DetectiveTipApprovalSerializer`.",
        request=inline_serializer(
            name="TipReviewUpdateRequest",
            fields={
                "status": serializers.CharField(help_text="FORWARDED, APPROVED, or REJECTED"),
                "case": serializers.IntegerField(required=False, help_text="Required if Officer is forwarding"),
                "suspect": serializers.IntegerField(required=False, help_text="Required if Detective is approving")
            }
        ),
        examples=[
            OpenApiExample(
                name="Officer Review",
                description="What an Officer submits to forward a tip.",
                value={"status": "FORWARDED", "case": 12},
                request_only=True,
            ),
            OpenApiExample(
                name="Detective Approval",
                description="What a Detective submits to approve a tip.",
                value={"status": "APPROVED"},
                request_only=True,
            )
        ]
    )
class TipDetailView(generics.UpdateAPIView):
    """
    PATCH /tips/<id>/
    Dynamically routes the update based on the user's role.
    """
    queryset = Reward.objects.all()

    def get_serializer_class(self):
        role_code = self.request.user.role.codename
        
        if role_code == 'OFFICER':
            return OfficerTipReviewSerializer
        elif role_code == 'DETECTIVE':
            return DetectiveTipApprovalSerializer
        else:
            raise PermissionDenied("You do not have permission to review tips.")

    def perform_update(self, serializer):
        # Save the specific user who made the update based on their role
        role_code = self.request.user.role.codename
        if role_code == 'OFFICER':
            serializer.save(officer_reviewer=self.request.user)
        elif role_code == 'DETECTIVE':
            serializer.save(detective_approver=self.request.user)


class TipVerificationView(APIView):
    """POST /tip-verifications/ - Noun-based endpoint to verify a reward code."""
    permission_classes = [IsPolicePersonnel]

    @extend_schema(
        tags=['Tips'],
        summary="Verify a Tip Tracking Code",
        description="Allows police personnel to verify a citizen's unique tracking ID and National ID against an approved tip.",
        request=inline_serializer(
            name="TipVerificationRequest",
            fields={
                "national_id": serializers.CharField(),
                "tracking_id": serializers.UUIDField()
            }
        ),
        responses={
            200: inline_serializer(
                name="TipVerificationResponse",
                fields={
                    "citizen_name": serializers.CharField(),
                    "national_id": serializers.CharField(),
                    "reward_amount": serializers.DecimalField(max_digits=10, decimal_places=2),
                    "description": serializers.CharField()
                }
            ),
            404: inline_serializer(
                name="TipVerificationError",
                fields={"error": serializers.CharField()}
            )
        },
        examples=[
            OpenApiExample(
                name="Valid Verification Request",
                value={
                    "national_id": "1234567890",
                    "tracking_id": "123e4567-e89b-12d3-a456-426614174000"
                },
                request_only=True
            )
        ]
    )
    def post(self, request):
        national_id = request.data.get('national_id')
        tracking_id = request.data.get('tracking_id')

        try:
            tip = Reward.objects.get(
                unique_tracking_id=tracking_id, 
                citizen__national_id=national_id,
                status='APPROVED'
            )
            return Response({
                "citizen_name": f"{tip.citizen.first_name} {tip.citizen.last_name}",
                "national_id": tip.citizen.national_id,
                "reward_amount": tip.amount,
                "description": tip.description
            })
        except Reward.DoesNotExist:
            return Response({"error": "Invalid Code or National ID"}, status=status.HTTP_404_NOT_FOUND)

# ═══════════════════════════════════════════════════════════════
# RELEASE REQUESTS (BAIL/FINES)
# ═══════════════════════════════════════════════════════════════
@extend_schema(
        tags=['Bail & Fines'],
        summary="Request Release",
        description="Suspect or Lawyer requests release.",
        examples=[
            OpenApiExample(
                name="Submit Release Request",
                description="Requesting release for a specific interrogation.",
                value={
                    "interrogation": 42
                },
                request_only=True,
            )
        ]
    )
class ReleaseRequestListCreateView(generics.CreateAPIView):
    """POST /release-requests/ - Suspect/Lawyer requests release."""
    queryset = ReleaseRequest.objects.all()
    serializer_class = ReleaseRequestCreateSerializer
    
    def perform_create(self, serializer):
        # We assume validation logic is inside the serializer as discussed earlier
        serializer.save(requested_by=self.request.user)

@extend_schema(
        tags=['Bail & Fines'],
        summary="Review Release Request (Sergeant)",
        description="Sergeant updates the request with bail or fine amounts.",
        examples=[
            OpenApiExample(
                name="Approve and Set Amounts",
                description="Sergeant approving release and setting the required bail and fine.",
                value={
                    "status": "APPROVED",
                    "bail_amount": "5000.00",
                    "fine_amount": "250.00"
                },
                request_only=True,
            ),
            OpenApiExample(
                name="Reject Request",
                description="Sergeant denying the release request.",
                value={
                    "status": "REJECTED"
                },
                request_only=True,
            )
        ]
    )
class ReleaseRequestDetailView(generics.UpdateAPIView):
    """
    PATCH /release-requests/<id>/ - Sergeant updates the request with amounts.
    """
    queryset = ReleaseRequest.objects.all()
    serializer_class = SergeantReleaseReviewSerializer
    permission_classes = [IsSergeant]

    def perform_update(self, serializer):
        serializer.save(sergeant_reviewer=self.request.user)

# ═══════════════════════════════════════════════════════════════
# 2. TRANSACTIONS (Mock Gateway)
# ═══════════════════════════════════════════════════════════════
@extend_schema(
    tags=['Transactions'],
    summary="Initiate a Payment (Bail/Fine)",
    description="Creates a PENDING transaction and returns a bank authority code to redirect the user.",
    responses={
        201: inline_serializer(
            name="InitiatePaymentResponse",
            fields={
                "message": serializers.CharField(),
                "authority": serializers.CharField(),
                "amount": serializers.DecimalField(max_digits=12, decimal_places=2)
            }
        )
    },
    examples=[
        OpenApiExample(
            name="Pay Bail",
            value={
                "interrogation": 42,
                "transaction_type": "BAIL",
                "amount": "5000.00"
            },
            request_only=True
        )
    ]
)
class InitiatePaymentView(generics.CreateAPIView):
    """
    Step 1 of Payment: User requests to pay bail/fine.
    We create the transaction as PENDING and mock an 'authority' code.
    """
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amount_in_rials = int(serializer.validated_data['amount']) * 10 
        
        # 1. Request an Authority Code from ZarinPal
        payload = {
            "merchant_id": ZARINPAL_MERCHANT_ID,
            "amount": amount_in_rials,
            "description": f"Payment for Interrogation {serializer.validated_data.get('interrogation')}",
            "callback_url": CALLBACK_URL,
        }
        
        response = requests.post(ZARINPAL_REQUEST_URL, json=payload)
        res_data = response.json()
        
        # Check if ZarinPal accepted the request (Code 100 means success)
        if 'data' in res_data and res_data['data']['code'] == 100:
            authority = res_data['data']['authority']
            
            # Save the PENDING transaction with the real Authority code
            transaction = serializer.save(
                payer=request.user,
                authority=authority,
                status=Transaction.Status.PENDING # Assuming you have this defined in your model
            )
            
            # Return the exact URL the frontend needs to redirect the user to
            payment_url = f"{ZARINPAL_STARTPAY_URL}{authority}"
            
            return Response({
                "message": "Redirect user to this URL.",
                "payment_url": payment_url,
                "authority": transaction.authority,
                "amount": transaction.amount
            }, status=status.HTTP_201_CREATED)
            
        else:
            # ZarinPal rejected our request (e.g., bad merchant ID, invalid amount)
            return Response({
                "error": "Failed to initiate payment gateway.",
                "details": res_data.get('errors')
            }, status=status.HTTP_400_BAD_REQUEST)


class PaymentCallbackView(APIView):
    """
    Step 2 of Payment: The bank redirects the user here after payment.
    We check the authority code, verify the payment, and update the transaction status.
    """
    # The bank's redirect doesn't carry our auth headers, so this must be open.
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Transactions'],
        summary="Payment Gateway Callback",
        description="The endpoint where the bank redirects the user after a payment attempt. Verifies the transaction and updates its status.",
        parameters=[
            OpenApiParameter(name="Authority", description="Bank authority code", required=True, type=str),
            OpenApiParameter(name="Status", description="Payment status from bank (OK or NOK)", required=True, type=str)
        ],
        responses={
            200: inline_serializer(
                name="PaymentSuccessResponse",
                fields={
                    "message": serializers.CharField(),
                    "ref_id": serializers.CharField(),
                    "status": serializers.CharField()
                }
            ),
            400: inline_serializer(
                name="PaymentFailureResponse",
                fields={
                    "error": serializers.CharField(),
                    "status": serializers.CharField()
                }
            )
        }
    )
    def get(self, request):
        authority = request.query_params.get('Authority')
        status_param = request.query_params.get('Status')

        if not authority or not status_param:
            return Response({"error": "Missing parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction = Transaction.objects.get(authority=authority)
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

        if transaction.status != 'PENDING':
            return Response({"error": "Transaction already processed."}, status=status.HTTP_400_BAD_REQUEST)

        # If user cancelled or card declined on ZarinPal's page
        if status_param != 'OK':
            transaction.status = 'FAILED' 
            transaction.save()
            return Response({"error": "Payment failed or was canceled."}, status=status.HTTP_400_BAD_REQUEST)

        # --- REAL ZARINPAL VERIFICATION ---
        amount_in_rials = int(transaction.amount) * 10
        
        verify_payload = {
            "merchant_id": ZARINPAL_MERCHANT_ID,
            "amount": amount_in_rials,
            "authority": authority
        }
        
        verify_res = requests.post(ZARINPAL_VERIFY_URL, json=verify_payload)
        verify_data = verify_res.json()
        
        # Code 100 = Success, Code 101 = Already Verified
        if 'data' in verify_data and verify_data['data']['code'] in [100, 101]:
            transaction.status = 'SUCCESS' 
            # ZarinPal gives us a real reference ID (e.g., for the receipt)
            transaction.ref_id = str(verify_data['data']['ref_id']) 
            transaction.save()

            # Trigger Release Request Update
            if transaction.transaction_type in ['BAIL', 'FINE']:
                try:
                    release_request = ReleaseRequest.objects.get(
                        interrogation=transaction.interrogation,
                        status='APPROVED'
                    )
                    release_request.status = 'PAID' 
                    release_request.save()
                except ReleaseRequest.DoesNotExist:
                    pass # Log this in production

            return Response({
                "message": "Payment verified successfully!",
                "ref_id": transaction.ref_id,
            }, status=status.HTTP_200_OK)
            
        else:
            # The bank says the payment is invalid, even though the URL said "OK"
            transaction.status = 'FAILED'
            transaction.save()
            return Response({
                "error": "Payment verification failed.",
                "details": verify_data.get('errors')
            }, status=status.HTTP_400_BAD_REQUEST)