from django.urls import path
from .views import (
    CertificateIssueView,
    CertificateGenerateView,
    CertificateVerifyView,
    CertificateUserView,
    CertificateSyncView,
    CertificateAdminView,
    CertificateAdminCoursePreviewView,
    CertificateDownloadView,
    CertificatePublicDownloadView,
)

urlpatterns = [
    path('certificates/issue/', CertificateIssueView.as_view(), name='certificate-issue'),
    path('certificates/<int:certificate_id>/generate/', CertificateGenerateView.as_view(), name='certificate-generate'),
    path('certificates/<int:certificate_id>/download/', CertificateDownloadView.as_view(), name='certificate-download'),
    path('certificates/public/<str:verification_code>/download/', CertificatePublicDownloadView.as_view(), name='certificate-public-download'),
    path('certificates/verify/<str:verification_code>/', CertificateVerifyView.as_view(), name='certificate-verify'),
    path('certificates/me/', CertificateUserView.as_view(), name='certificate-user'),
    path('certificates/sync/', CertificateSyncView.as_view(), name='certificate-sync'),
    path('certificates/admin/', CertificateAdminView.as_view(), name='certificate-admin'),
    path('certificates/admin/courses/<int:course_id>/preview/', CertificateAdminCoursePreviewView.as_view(), name='certificate-admin-course-preview'),
    path('certificates/admin/<int:certificate_id>/', CertificateAdminView.as_view(), name='certificate-admin-detail'),
]

