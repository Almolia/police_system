from django.contrib.auth.models import BaseUserManager

class CustomUserManager(BaseUserManager):
    def create_user(self, username, national_id, phone_number, email, first_name, last_name, password=None, **extra_fields):
        # 1. Validate Mandatory Fields
        if not national_id:
            raise ValueError('The National ID must be set')
        if not phone_number:
            raise ValueError('The Phone Number must be set')
        if not email:
            raise ValueError('The Email must be set')
        if not first_name:
            raise ValueError('First Name is required')
        if not last_name:
            raise ValueError('Last Name (Surname) is required')

        email = self.normalize_email(email)
        
        # 2. Create Model
        user = self.model(
            username=username,
            national_id=national_id,
            phone_number=phone_number,
            email=email,
            first_name=first_name,
            last_name=last_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, national_id, phone_number, email, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(username, national_id, phone_number, email, first_name, last_name, password, **extra_fields)