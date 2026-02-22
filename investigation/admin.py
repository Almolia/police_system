from django.contrib import admin
from .models import Suspect, Interrogation

@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    list_display = ('id', 'alias', 'status', 'cached_ranking_score', 'reward_amount')
    list_filter = ('status',)
    search_fields = ('alias', 'first_name', 'last_name')

@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    list_display = ('id', 'case', 'suspect', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('case__title', 'suspect__alias')
