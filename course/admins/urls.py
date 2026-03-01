from django.urls import path
from .views import (
    AdminManagementView,
    AdminDetailView,
    AdminListView,
    AdminDashboardStatsView,
    AdminRevenueAnalyticsView,
    AdminUserAnalyticsView,
    AdminCourseAnalyticsView,
)

urlpatterns = [
    path('admins/<int:admin_id>/update', AdminManagementView.as_view(), name='admin-update'),
    path('admins/<int:admin_id>/delete', AdminManagementView.as_view(), name='admin-delete'),
    path('admins/', AdminListView.as_view(), name='admin-list'),
    path('admins/create', AdminManagementView.as_view(), name='admin-create'),
    path('admins/<int:admin_id>', AdminDetailView.as_view(), name='admin-detail'),

    # Analytics
    path('admin/dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('admin/analytics/revenue/', AdminRevenueAnalyticsView.as_view(), name='admin-analytics-revenue'),
    path('admin/analytics/users/', AdminUserAnalyticsView.as_view(), name='admin-analytics-users'),
    path('admin/analytics/courses/', AdminCourseAnalyticsView.as_view(), name='admin-analytics-courses'),
]
