from django.urls import path

from .cron_view import process_overdue_view
from .views import (
    AdminCopyrightActionView,
    AdminCopyrightCaseDetailView,
    AdminCopyrightCaseListView,
    AdminReportCaseDetailView,
    AdminReportListView,
    AdminReportResolveView,
    AdminReportReopenView,
    InstructorCopyrightCaseDetailView,
    InstructorCopyrightCaseListView,
    InstructorCopyrightResponseView,
    InstructorCopyrightSubmitFixView,
    ReportCreateView,
    ReporterCopyrightCaseDetailView,
    ReporterCopyrightEvidenceView,
)

urlpatterns = [
    path('reports/cron/process-overdue/', process_overdue_view, name='reports-cron-process-overdue'),
    path('reports/', ReportCreateView.as_view(), name='report-create'),
    path('reports/my/<int:case_id>/', ReporterCopyrightCaseDetailView.as_view(), name='copyright-reporter-detail'),
    path('reports/my/<int:case_id>/evidence/', ReporterCopyrightEvidenceView.as_view(), name='copyright-reporter-evidence'),
    path('reports/instructor/cases/', InstructorCopyrightCaseListView.as_view(), name='copyright-instructor-list'),
    path('reports/instructor/cases/<int:case_id>/', InstructorCopyrightCaseDetailView.as_view(), name='copyright-instructor-detail'),
    path('reports/instructor/cases/<int:case_id>/responses/', InstructorCopyrightResponseView.as_view(), name='copyright-instructor-response'),
    path('reports/instructor/cases/<int:case_id>/submit-fix/', InstructorCopyrightSubmitFixView.as_view(), name='copyright-instructor-submit-fix'),
    path('reports/admin/copyright-cases/', AdminCopyrightCaseListView.as_view(), name='admin-copyright-list'),
    path('reports/admin/copyright-cases/<int:case_id>/', AdminCopyrightCaseDetailView.as_view(), name='admin-copyright-detail'),
    path('reports/admin/copyright-cases/<int:case_id>/action/', AdminCopyrightActionView.as_view(), name='admin-copyright-action'),
    path('reports/admin/', AdminReportListView.as_view(), name='admin-report-list'),
    path('reports/admin/<str:target_type>/<int:target_id>/', AdminReportCaseDetailView.as_view(), name='admin-report-detail'),
    path('reports/admin/<str:target_type>/<int:target_id>/resolve/', AdminReportResolveView.as_view(), name='admin-report-resolve'),
    path('reports/admin/<str:target_type>/<int:target_id>/reopen/', AdminReportReopenView.as_view(), name='admin-report-reopen'),
]
