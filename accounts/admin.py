from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import Role

User = get_user_model()

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'national_id', 'phone_number', 'role')

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'codename')
    search_fields = ('name', 'codename')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # 2. Attach our custom forms
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    
    list_display = ('username', 'email', 'national_id', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'national_id')
    
    # 3. Fields to show when EDITING an existing user
    fieldsets = UserAdmin.fieldsets + (
        ('Police System Details', {'fields': ('national_id', 'phone_number', 'role')}),
    )
    
    # 4. Fields to show when CREATING a new user
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Mandatory Details', {
            'fields': ('email', 'first_name', 'last_name', 'national_id', 'phone_number', 'role')
        }),
    )