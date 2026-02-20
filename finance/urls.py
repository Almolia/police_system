from django.urls import path
from .views import SubmitTipView, InitiatePaymentView

app_name = 'finance'

urlpatterns = [
    path('rewards/submit/', SubmitTipView.as_view(), name='submit_tip'),
    path('payments/initiate/', InitiatePaymentView.as_view(), name='initiate_payment'),
]