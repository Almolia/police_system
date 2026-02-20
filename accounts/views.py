from rest_framework import generics, permissions
from drf_spectacular.utils import extend_schema, OpenApiExample
from django.contrib.auth import get_user_model

from .serializers import (
    UserRegistrationSerializer, 
    UserProfileSerializer, 
    StaffCreationSerializer
)
from .permissions import IsChief

User = get_user_model()

# ═══════════════════════════════════════════════════════════════
# 1. PUBLIC REGISTRATION
# ═══════════════════════════════════════════════════════════════
class CitizenRegistrationView(generics.CreateAPIView):
    """
    Open endpoint for the public to register.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Register a new Citizen",
        description="""
        Allows a member of the public to create an account. 
        The system will **automatically** assign them the `CITIZEN` role.
        """,
        examples=[
            OpenApiExample(
                "Valid Citizen Registration",
                summary="Standard public signup",
                value={
                    "national_id": "1234567890",
                    "phone_number": "09123456789",
                    "email": "citizen@example.com",
                    "first_name": "Ali",
                    "last_name": "Rezaei",
                    "username": "alirezaei",
                    "password": "strongpassword123",
                    "password_confirm": "strongpassword123"
                },
                request_only=True,
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 2. USER PROFILE (Me)
# ═══════════════════════════════════════════════════════════════
class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Allows a logged-in user to view and update their own profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Overriding this ensures the user can ONLY fetch their own data
        return self.request.user

    @extend_schema(
        summary="Get/Update My Profile",
        description="""
        Fetches the profile of the currently authenticated user based on their JWT token.
        Note: `national_id` and `role_name` cannot be changed by the user.
        """
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(summary="Update Profile Info")
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(summary="Partially Update Profile Info")
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 3. STAFF CREATION (Chief Only)
# ═══════════════════════════════════════════════════════════════
class StaffRegistrationView(generics.CreateAPIView):
    """
    Restricted endpoint for the Chief of Police to hire new staff.
    """
    queryset = User.objects.all()
    serializer_class = StaffCreationSerializer
    permission_classes = [IsChief]  # Only the Chief can access this!

    @extend_schema(
        summary="Register Police Staff (Chief Only)",
        description="Allows the Chief of Police to create internal users (Detectives, Officers, etc.) and assign their roles directly.",
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)