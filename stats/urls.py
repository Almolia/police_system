from django.urls import path
from .views import PublicDashboardView, DetectiveDashboardView, ChiefDashboardView

app_name = 'stats'

urlpatterns = [
    path('dashboard/public/', PublicDashboardView.as_view(), name='dashboard_public'),
    path('dashboard/detective/', DetectiveDashboardView.as_view(), name='dashboard_detective'),
    path('dashboard/chief/', ChiefDashboardView.as_view(), name='dashboard_chief'),
]