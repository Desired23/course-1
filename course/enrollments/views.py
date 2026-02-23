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

    def get(self, request):
        user = request.user.id
        print(f"Fetching enrollments for user: {user}")
        enrollments = get_enrollment_by_user(user)
        return paginate_queryset(enrollments, request, EnrollmentSerializer)
    def post(self, request):
        try:
            enrollment = create_enrollment(request.data)
            return Response(enrollment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
class EnrollmentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request, enrollment_id):
        try:
            enrollment = find_enrollment_by_id(enrollment_id)
            return Response(enrollment, status=status.HTTP_200_OK)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)