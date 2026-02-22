from django.urls import path
from .views import (
    TipListCreateView, TipDetailView, TipVerificationView,
    ReleaseRequestListCreateView, ReleaseRequestDetailView,
    InitiatePaymentView, PaymentCallbackView
)

app_name = 'finance'

urlpatterns = [
    path('tips/', TipListCreateView.as_view(), name='tip-list-create'),
    path('tips/<int:pk>/', TipDetailView.as_view(), name='tip-detail'),
    path('tip-verification/', TipVerificationView.as_view(), name='tip-verification'),
    path('release-requests/', ReleaseRequestListCreateView.as_view(), name='release-request-list-create'),
    path('release-requests/<int:pk>/', ReleaseRequestDetailView.as_view(), name='release-request-detail'),
    path('payments/initiate/', InitiatePaymentView.as_view(), name='payment-initiate'),
    path('payments/callback/', PaymentCallbackView.as_view(), name='payment-callback'),
]