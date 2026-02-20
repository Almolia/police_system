from django.urls import path
from .views import SubmitTipView, InitiatePaymentView, ReviewTipView

app_name = 'finance'

urlpatterns = [
    path('rewards/submit/', SubmitTipView.as_view(), name='submit_tip'),
    path('payments/initiate/', InitiatePaymentView.as_view(), name='initiate_payment'),
    path('rewards/submit/', SubmitTipView.as_view(), name='submit_tip'),
    path('rewards/<int:pk>/review/', ReviewTipView.as_view(), name='review_tip'),
]