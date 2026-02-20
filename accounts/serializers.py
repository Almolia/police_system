from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from .models import Role

User = get_user_model()

# ═══════════════════════════════════════════════════════════════
# 1. PUBLIC REGISTRATION (Citizens)
# ═══════════════════════════════════════════════════════════════
class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Used for public sign-ups. 
    Automatically assigns the 'CITIZEN' role and securely hashes the password.
    """
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = (
            'national_id', 'phone_number', 'email', 
            'first_name', 'last_name', 'username', 
            'password', 'password_confirm'
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_national_id(self, value):
        """Ensure Iranian National ID is exactly 10 digits."""
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("National ID must be exactly 10 digits.")
        return value

    def validate_phone_number(self, value):
        """Basic validation for Iranian phone numbers."""
        if not value.startswith('09') or len(value) != 11:
            raise serializers.ValidationError("Phone number must start with '09' and be 11 digits long.")
        return value

    def create(self, validated_data):
        # Remove password_confirm before saving
        validated_data.pop('password_confirm')
        
        # 1. Fetch the Citizen Role
        try:
            citizen_role = Role.objects.get(codename='CITIZEN')
        except ObjectDoesNotExist:
            raise serializers.ValidationError("System Error: CITIZEN role is not configured in the database.")

        # 2. Create the user using the CustomUserManager we wrote earlier
        user = User.objects.create_user(
            username=validated_data['username'],
            national_id=validated_data['national_id'],
            phone_number=validated_data['phone_number'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        
        # 3. Force the role to Citizen
        user.role = citizen_role
        user.save()
        
        return user


# ═══════════════════════════════════════════════════════════════
# 2. PROFILE VIEWING & EDITING
# ═══════════════════════════════════════════════════════════════
class UserProfileSerializer(serializers.ModelSerializer):
    """
    Used for users to view and update their own profile.
    Notice that sensitive fields like 'national_id' and 'role' are read-only!
    """
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 
            'email', 'phone_number', 'national_id', 'role_name'
        )
        read_only_fields = ('id', 'username', 'national_id', 'role_name')


# ═══════════════════════════════════════════════════════════════
# 3. STAFF CREATION (For Chief / Admin)
# ═══════════════════════════════════════════════════════════════
class StaffCreationSerializer(serializers.ModelSerializer):
    """
    Used strictly by the Chief of Police or System Admins to create internal staff 
    (Cadets, Officers, Detectives, etc.). Allows setting the Role directly.
    """
    class Meta:
        model = User
        fields = (
            'national_id', 'phone_number', 'email', 
            'first_name', 'last_name', 'username', 
            'password', 'role'
        )
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # We extract the role first
        role = validated_data.pop('role', None)
        
        user = User.objects.create_user(**validated_data)
        
        if role:
            user.role = role
            user.save()
            
        return user