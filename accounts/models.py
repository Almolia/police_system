from django.db import models
from django.contrib.auth.models import AbstractUser
from .managers import CustomUserManager

class User(AbstractUser):
    national_id = models.CharField(
        max_length=10, 
        unique=True, 
        help_text="10-digit National ID"
    )
    phone_number = models.CharField(
        max_length=15, 
        unique=True, 
        help_text="Mobile number"
    )
    email = models.EmailField(unique=True)

    # Django's default first_name/last_name are optional (blank=True).
    # We override them here to make them mandatory as per project docs.
    first_name = models.CharField(max_length=150, blank=False, null=False)
    last_name = models.CharField(max_length=150, blank=False, null=False)

    objects = CustomUserManager()

    # These fields are prompted when creating a superuser via CLI
    REQUIRED_FIELDS = ['national_id', 'phone_number', 'email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.national_id})"