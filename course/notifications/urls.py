from django.urls import path
from .views import (NotificationView , NotificationByAdminView, InstructorAnnouncementView)

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notification-list'), #get by user_id or notification_id
    path('notifications/create/', NotificationView.as_view(), name='create-notification'),# taoj noti
    path('notifications/<int:notification_id>/', NotificationView.as_view(), name='notification-detail'), #get 1
    path('notifications/mark_as_read/', NotificationView.as_view(), name='mark-notification-as-read'), # truyen noti_id thi mark noti do la da doc neu không thì mark allall
    path('notifications/admin/delete/<str:notification_code>/', NotificationByAdminView.as_view(), name='delete-all-notifications'), # xoa tat ca noti
    path('notifications/admin/create/', NotificationByAdminView.as_view(), name='create-notification-to-all-users'), # tao noti cho tat ca user
    path('instructor/announcements/', InstructorAnnouncementView.as_view(), name='instructor-announcements'),
]
