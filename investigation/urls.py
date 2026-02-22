from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SuspectViewSet, InterrogationViewSet

router = DefaultRouter()
router.register(r'suspects', SuspectViewSet, basename='suspect')
router.register(r'interrogations', InterrogationViewSet, basename='interrogation')

urlpatterns = [
    path('', include(router.urls)),
]
