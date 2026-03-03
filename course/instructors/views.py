from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .models import Instructor
from .serializers import InstructorSerializers
from .services import (
    create_instructor,
    update_instructor,
    delete_instructor,
    get_instructors,
    get_instructor_by_id
)
from .dashboard_services import get_instructor_dashboard_stats, get_course_analytics, get_instructor_analytics_timeseries
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
class InstructorListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        instructors = get_instructors()
        return paginate_queryset(instructors, request, InstructorSerializers)

class InstructorDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request, instructor_id):
        try:
            instructor = get_instructor_by_id(instructor_id)
            return Response(instructor, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, instructor_id):
        # Ownership check: instructor can only update their own profile, admin can update any
        if not hasattr(request.user, 'admin'):
            user_instructor = getattr(request.user, 'instructor', None)
            if not user_instructor or user_instructor.id != instructor_id:
                return Response({"error": "Bạn không có quyền cập nhật hồ sơ giảng viên này."}, status=status.HTTP_403_FORBIDDEN)
        try:
            updated_instructor = update_instructor(instructor_id, request.data)
            return Response(InstructorSerializers(updated_instructor).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, instructor_id):
        # Only admin can delete instructor
        if not hasattr(request.user, 'admin'):
            return Response({"error": "Chỉ admin mới có quyền xóa giảng viên."}, status=status.HTTP_403_FORBIDDEN)
        try:
            result = delete_instructor(instructor_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class InstructorCreateView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            instructor = create_instructor(request.data)
            return Response(InstructorSerializers(instructor).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorDashboardStatsView(APIView):
    """
    GET /api/instructor/dashboard/stats/
    Returns overall stats for the authenticated instructor.
    Admin can pass ?instructor_id=<id> to view any instructor.
    """
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = getattr(user, 'admin', None)
        instructor_id = request.query_params.get('instructor_id')

        if admin and instructor_id:
            try:
                instructor = Instructor.objects.get(id=instructor_id, is_deleted=False)
            except Instructor.DoesNotExist:
                return Response({"error": "Instructor not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            instructor = getattr(user, 'instructor', None)
            if not instructor:
                return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = get_instructor_dashboard_stats(instructor)
            return Response(data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorCourseAnalyticsView(APIView):
    """
    GET /api/instructor/courses/<course_id>/analytics/
    Detailed analytics for a single course.
    """
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request, course_id):
        user = request.user
        admin = getattr(user, 'admin', None)

        if admin:
            # Admin: must provide instructor_id param or infer from course
            from courses.models import Course
            try:
                course = Course.objects.get(id=course_id, is_deleted=False)
                instructor = course.instructor
            except Course.DoesNotExist:
                return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            instructor = getattr(user, 'instructor', None)
            if not instructor:
                return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = get_course_analytics(instructor, course_id)
            return Response(data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorAnalyticsTimeseriesView(APIView):
    """
    GET /api/instructor/analytics/timeseries/?months=12
    Returns time-series analytics data for instructor charts.
    Admin can pass ?instructor_id=<id> to view any instructor.
    """
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = getattr(user, 'admin', None)
        instructor_id = request.query_params.get('instructor_id')
        months = int(request.query_params.get('months', 12))

        if admin and instructor_id:
            try:
                instructor = Instructor.objects.get(id=instructor_id, is_deleted=False)
            except Instructor.DoesNotExist:
                return Response({"error": "Instructor not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            instructor = getattr(user, 'instructor', None)
            if not instructor:
                return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = get_instructor_analytics_timeseries(instructor, months)
            return Response(data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)