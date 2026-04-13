from django.urls import path
from .views import (NotificationView , NotificationByAdminView, InstructorAnnouncementView)

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notification-list'),
    path('notifications/create/', NotificationView.as_view(), name='create-notification'),
    path('notifications/<int:notification_id>/', NotificationView.as_view(), name='notification-detail'),
    path('notifications/mark_as_read/', NotificationView.as_view(), name='mark-notification-as-read'),
    path('notifications/admin/delete/<str:notification_code>/', NotificationByAdminView.as_view(), name='delete-all-notifications'),
    path('notifications/admin/create/', NotificationByAdminView.as_view(), name='create-notification-to-all-users'),
    path('instructor/announcements/', InstructorAnnouncementView.as_view(), name='instructor-announcements'),
]
