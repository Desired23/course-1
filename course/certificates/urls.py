from django.urls import path
from .views import (
    CertificateIssueView,
    CertificateGenerateView,
    CertificateVerifyView,
    CertificateUserView,
    CertificateAdminView,
    CertificateDownloadView,
)

urlpatterns = [
    path('certificates/issue/', CertificateIssueView.as_view(), name='certificate-issue'),
    path('certificates/<int:certificate_id>/generate/', CertificateGenerateView.as_view(), name='certificate-generate'),
    path('certificates/<int:certificate_id>/download/', CertificateDownloadView.as_view(), name='certificate-download'),
    path('certificates/verify/<str:verification_code>/', CertificateVerifyView.as_view(), name='certificate-verify'),
    path('certificates/me/', CertificateUserView.as_view(), name='certificate-user'),
    path('certificates/admin/', CertificateAdminView.as_view(), name='certificate-admin'),
    path('certificates/admin/<int:certificate_id>/', CertificateAdminView.as_view(), name='certificate-admin-detail'),
]

