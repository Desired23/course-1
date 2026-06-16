from django.urls import path

from .views import (
    AdminCopyrightActionView,
    AdminCopyrightCaseDetailView,
    AdminCopyrightCaseExportView,
    AdminCopyrightCaseListView,
    AdminReportStatsView,
    AdminReportExportView,
    AdminReportCaseDetailView,
    AdminReportListView,
    AdminReportResolveView,
    AdminReportReopenView,
    ReportCreateView,
)

urlpatterns = [
    path('reports/', ReportCreateView.as_view(), name='report-create'),
    path('reports/admin/stats/', AdminReportStatsView.as_view(), name='admin-report-stats'),
    path('reports/admin/export/', AdminReportExportView.as_view(), name='admin-report-export'),
    path('reports/admin/copyright-cases/export/', AdminCopyrightCaseExportView.as_view(), name='admin-copyright-export'),
    path('reports/admin/copyright-cases/', AdminCopyrightCaseListView.as_view(), name='admin-copyright-list'),
    path('reports/admin/copyright-cases/<int:case_id>/', AdminCopyrightCaseDetailView.as_view(), name='admin-copyright-detail'),
    path('reports/admin/copyright-cases/<int:case_id>/action/', AdminCopyrightActionView.as_view(), name='admin-copyright-action'),
    path('reports/admin/', AdminReportListView.as_view(), name='admin-report-list'),
    path('reports/admin/<str:target_type>/<int:target_id>/', AdminReportCaseDetailView.as_view(), name='admin-report-detail'),
    path('reports/admin/<str:target_type>/<int:target_id>/resolve/', AdminReportResolveView.as_view(), name='admin-report-resolve'),
    path('reports/admin/<str:target_type>/<int:target_id>/reopen/', AdminReportReopenView.as_view(), name='admin-report-reopen'),
]
