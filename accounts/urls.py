from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    CitizenRegistrationView,
    UserProfileView,
    StaffRegistrationView
)

app_name = 'accounts'

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', CitizenRegistrationView.as_view(), name='citizen_register'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('staff/register/', StaffRegistrationView.as_view(), name='staff_register'),
]