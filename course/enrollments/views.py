from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q
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
import logging

logger = logging.getLogger(__name__)

from .models import Enrollment
from utils.permissions import RolePermissionFactory

class EnrollmentManageByUserView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        from django.db import DatabaseError
        user = request.user.id
        # diagnostic logging
        try:
            user_type = getattr(request.user, 'user_type', None)
            logger.info(f"Enrollment request for user_id={user} (caller id={request.user.id}, type={user_type})")
            if user_type != 'student':
                logger.warning(f"Non-student user_type {user_type} asked for enrollments")
        except Exception:
            pass
        try:
            enrollments = get_enrollment_by_user(user)

            status_filter = request.query_params.get('status')
            source_filter = request.query_params.get('source')
            search = (request.query_params.get('search') or '').strip()
            enrollment_date_from = request.query_params.get('enrollment_date_from')
            enrollment_date_to = request.query_params.get('enrollment_date_to')
            purchase_date_from = request.query_params.get('purchase_date_from')
            purchase_date_to = request.query_params.get('purchase_date_to')
            sort_by = request.query_params.get('sort_by')

            if status_filter:
                enrollments = enrollments.filter(status=status_filter)
            if source_filter:
                enrollments = enrollments.filter(source=source_filter)
            if search:
                enrollments = enrollments.filter(
                    Q(course__title__icontains=search)
                    | Q(course__instructor__user__full_name__icontains=search)
                )

            if enrollment_date_from:
                enrollments = enrollments.filter(enrollment_date__date__gte=enrollment_date_from)
            if enrollment_date_to:
                enrollments = enrollments.filter(enrollment_date__date__lte=enrollment_date_to)

            if purchase_date_from:
                enrollments = enrollments.filter(
                    source=Enrollment.Source.PURCHASE,
                    enrollment_date__date__gte=purchase_date_from
                )
            if purchase_date_to:
                enrollments = enrollments.filter(
                    source=Enrollment.Source.PURCHASE,
                    enrollment_date__date__lte=purchase_date_to
                )

            if sort_by == 'newest_enrollment':
                enrollments = enrollments.order_by('-enrollment_date')
            elif sort_by == 'oldest_enrollment':
                enrollments = enrollments.order_by('enrollment_date')
            elif sort_by == 'title_asc':
                enrollments = enrollments.order_by('course__title')
            elif sort_by == 'progress_desc':
                enrollments = enrollments.order_by('-progress')
            else:
                # recent_access default
                enrollments = enrollments.order_by('-last_access_date', '-enrollment_date')

            if not enrollments.exists():
                page_size = request.query_params.get('page_size', 20)
                try:
                    page_size = int(page_size)
                except (TypeError, ValueError):
                    page_size = 20
                return Response({
                    "message": "Người dùng hiện chưa đăng ký khóa học nào.",
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "page": 1,
                    "total_pages": 0,
                    "page_size": page_size,
                    "results": []
                }, status=status.HTTP_200_OK)

            return paginate_queryset(enrollments, request, EnrollmentSerializer)
        except ValidationError as e:
            user_type = getattr(request.user, 'user_type', None)
            logger.warning(
                f"Enrollment error for user_id={user} caller={request.user.id} type={user_type} -> {e.detail}"
            )
            return Response({
                "errors": e.detail,
                "caller": {"id": request.user.id, "type": user_type},
            }, status=status.HTTP_400_BAD_REQUEST)
        except DatabaseError as e:
            # Database issues (connection closed, timeouts) should return 503
            return Response({"error": "Database unavailable. Please try again later."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            # Unexpected errors -> 500 with safe message
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
