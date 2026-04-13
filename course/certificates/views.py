from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.http import HttpResponseRedirect
from utils.permissions import RolePermissionFactory
from .services import (
    issue_certificate,
    generate_certificate_image,
    verify_certificate,
    get_user_certificates,
    get_certificate_detail,
    revoke_certificate,
    get_course_certificates,
)
from .serializers import CertificateListSerializer
from utils.pagination import paginate_queryset


class CertificateIssueView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            course_id = request.data.get('course_id')
            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = issue_certificate(request.user, course_id)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class CertificateGenerateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, certificate_id):
        try:
            result = generate_certificate_image(certificate_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class CertificateVerifyView(APIView):
    throttle_scope = 'search'

    def get(self, request, verification_code):
        try:
            result = verify_certificate(verification_code)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class CertificateUserView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            certificate_id = request.query_params.get('certificate_id')
            if certificate_id:
                result = get_certificate_detail(int(certificate_id), user=request.user)
                return Response(result, status=status.HTTP_200_OK)
            results = get_user_certificates(request.user)
            return paginate_queryset(results, request, CertificateListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class CertificateAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, certificate_id=None):
        try:
            course_id = request.query_params.get('course_id')
            if not course_id:
                return Response(
                    {"error": "course_id query parameter is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            results = get_course_certificates(int(course_id))
            return paginate_queryset(results, request, CertificateListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, certificate_id):
        try:
            result = revoke_certificate(certificate_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class CertificateDownloadView(APIView):
    """
    GET /api/certificates/<certificate_id>/download/
    Redirects to the Cloudinary PDF URL for the certificate.
    Ownership enforced: only the owner or admin can download.
    """
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, certificate_id):
        from .models import Certificate
        try:
            cert = Certificate.objects.get(id=certificate_id, is_deleted=False)
        except Certificate.DoesNotExist:
            return Response({"error": "Certificate not found."}, status=status.HTTP_404_NOT_FOUND)


        is_admin = getattr(request.user, 'admin', None)
        if cert.user_id != request.user.id and not is_admin:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        if not cert.certificate_url:
            return Response(
                {"error": "Certificate PDF not yet generated. Call POST /certificates/<id>/generate/ first."},
                status=status.HTTP_400_BAD_REQUEST,
            )


        return Response({
            "certificate_id": cert.id,
            "download_url": cert.certificate_url,
            "verification_code": cert.verification_code,
        })

