from django.http import HttpResponse
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
from .student_services import get_instructor_students, export_instructor_students_csv, get_instructor_student_detail
from utils.pagination import StandardPagination
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
class InstructorListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        instructors = get_instructors()
        return paginate_queryset(instructors, request, InstructorSerializers)

class InstructorDetailView(APIView):
    throttle_scope = 'burst'

    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [RolePermissionFactory(['admin', 'instructor'])()]

    def get(self, request, instructor_id):
        try:
            print(f"Fetching instructor with ID")
            instructor = get_instructor_by_id(instructor_id)
            return Response(instructor, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, instructor_id):

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


class InstructorStudentsView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = getattr(user, 'admin', None)
        instructor_id = request.query_params.get('instructor_id')
        course_id = request.query_params.get('course_id')
        search = request.query_params.get('search')
        status_filter = request.query_params.get('status')
        sort_by = request.query_params.get('sort_by')

        if admin and instructor_id:
            try:
                instructor = Instructor.objects.get(id=instructor_id, is_deleted=False)
            except Instructor.DoesNotExist:
                return Response({"error": "Instructor not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            instructor = getattr(user, 'instructor', None)
            if not instructor:
                return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)

        data = get_instructor_students(
            instructor,
            course_id=course_id,
            search=search,
            status=status_filter,
            sort_by=sort_by,
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(data, request)
        return paginator.get_paginated_response(page)


class InstructorStudentsExportView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = getattr(user, 'admin', None)
        instructor_id = request.query_params.get('instructor_id')
        course_id = request.query_params.get('course_id')

        if admin and instructor_id:
            try:
                instructor = Instructor.objects.get(id=instructor_id, is_deleted=False)
            except Instructor.DoesNotExist:
                return Response({"error": "Instructor not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            instructor = getattr(user, 'instructor', None)
            if not instructor:
                return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)

        csv_content = export_instructor_students_csv(instructor, course_id=course_id)
        response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="instructor-students.csv"'
        return response


class InstructorStudentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request, student_id):
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
            data = get_instructor_student_detail(instructor, student_id)
            return Response(data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
