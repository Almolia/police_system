from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class MultiFieldBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL.
    Recognizes username, email, phone_number, or national_id.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        try:
            # Look for a user where ANY of these fields match the input 'username'
            user = User.objects.get(
                Q(username=username) | 
                Q(email=username) | 
                Q(phone_number=username) | 
                Q(national_id=username)
            )
        except User.DoesNotExist:
            return None

        # Check the password and if the user is active
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None