from django.urls import path

from .views import (
    AdminReportCaseDetailView,
    AdminReportListView,
    AdminReportResolveView,
    AdminReportReopenView,
    ReportCreateView,
)

urlpatterns = [
    path('reports/', ReportCreateView.as_view(), name='report-create'),
    path('reports/admin/', AdminReportListView.as_view(), name='admin-report-list'),
    path('reports/admin/<str:target_type>/<int:target_id>/', AdminReportCaseDetailView.as_view(), name='admin-report-detail'),
    path('reports/admin/<str:target_type>/<int:target_id>/resolve/', AdminReportResolveView.as_view(), name='admin-report-resolve'),
    path('reports/admin/<str:target_type>/<int:target_id>/reopen/', AdminReportReopenView.as_view(), name='admin-report-reopen'),
]
