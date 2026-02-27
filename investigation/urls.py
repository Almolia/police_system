from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SuspectViewSet, InterrogationViewSet
from .views import BoardNodeViewSet, BoardConnectionViewSet
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r'suspects', SuspectViewSet, basename='suspect')
router.register(r'interrogations', InterrogationViewSet, basename='interrogation')
router.register(r'board-nodes', BoardNodeViewSet, basename='board-node')
router.register(r'board-connections', BoardConnectionViewSet, basename='board-connection')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
