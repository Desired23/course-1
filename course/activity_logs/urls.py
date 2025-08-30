from django.urls import path
from .views import ActivityLogView

urlpatterns = [
    path('activity-logs/cleanup/', ActivityLogView.as_view(), name='delete_old_logs'),
    path('activity-logs/', ActivityLogView.as_view(), name='activity_logs'),
]