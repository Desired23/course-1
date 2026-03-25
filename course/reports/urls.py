from django.urls import path

from .views import AdminReportListView, AdminReportResolveView


urlpatterns = [
    path('reports/admin/', AdminReportListView.as_view(), name='admin-report-list'),
    path('reports/admin/<str:reported_type>/<int:reported_id>/resolve/', AdminReportResolveView.as_view(), name='admin-report-resolve'),
]
