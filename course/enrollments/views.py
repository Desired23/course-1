from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.pagination import paginate_queryset
from .serializers import EnrollmentSerializer
from .services import (
    create_enrollment,
    get_enrollment_by_user,
    find_enrollment_by_id,
    find_by_user_and_course,
    count_enrollments_by_course,
    has_access
)

from .models import Enrollment
from utils.permissions import RolePermissionFactory

class EnrollmentManageByUserView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user.id
        enrollments = get_enrollment_by_user(user)
        return paginate_queryset(enrollments, request, EnrollmentSerializer)
    def post(self, request):
        try:
            data = request.data.copy()
            data['user_id'] = request.user.id  # enforce from token
            enrollment = create_enrollment(data)
            return Response(enrollment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
class EnrollmentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, enrollment_id):
        try:
            enrollment = find_enrollment_by_id(enrollment_id)
            # Ownership check: students can only view their own enrollments
            if not hasattr(request.user, 'admin') and not hasattr(request.user, 'instructor'):
                if enrollment.get('user_id') != request.user.id:
                    return Response({"error": "Bạn không có quyền xem thông tin đăng ký này."}, status=status.HTTP_403_FORBIDDEN)
            return Response(enrollment, status=status.HTTP_200_OK)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)