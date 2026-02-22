from django.contrib import admin
from .models import Case

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'primary_complainant', 'crime_level', 'created_at')
    list_filter = ('status', 'crime_level')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at')
