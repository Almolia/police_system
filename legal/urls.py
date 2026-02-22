from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourtVerdictViewSet

router = DefaultRouter()
router.register(r'verdicts', CourtVerdictViewSet, basename='verdict')

urlpatterns = [
    path('', include(router.urls)),
]
