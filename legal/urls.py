from django.urls import path
from .views import CourtVerdictListCreateView, CourtVerdictDetailView

app_name = 'legal'

urlpatterns = [
    path('verdicts/', CourtVerdictListCreateView.as_view(), name='verdict-list-create'),
    path('verdicts/<int:pk>/', CourtVerdictDetailView.as_view(), name='verdict-detail'),
]