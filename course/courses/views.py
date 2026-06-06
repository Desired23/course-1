from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_course,
    update_course,
    delete_course,
    get_all_courses,
    get_course_by_id,
    get_public_stats,
    get_course_students,
)
from utils.permissions import RolePermissionFactory
from utils.roles import is_active_instructor
from .serializers import CourseSerializer
from utils.pagination import paginate_queryset, StandardPagination
from django.conf import settings
import jwt
from users.models import User
from utils.list_params import get_search_param


class CourseStatsView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        return Response(get_public_stats(), status=status.HTTP_200_OK)


class CourseListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        try:
            params = request.query_params
            instructor_id = params.get('instructor_id')
            category_id = params.get('category_id') or params.get('category')
            subcategory_id = params.get('subcategory_id') or params.get('subcategory')
            status_filter = params.get('status')
            is_featured = params.get('is_featured')
            level = params.get('level')
            search = get_search_param(request)
            ordering = params.get('ordering')
            rating_min = params.get('rating_min')
            language = params.get('language')
            price_min = params.get('price_min')
            price_max = params.get('price_max')
            subcategory_ids = params.get('subcategory_ids')
            levels = params.get('levels')
            languages = params.get('languages')
            duration_buckets = params.get('duration_buckets')
            certificate = params.get('certificate')

            try:
                kwargs = {}
                if instructor_id:
                    kwargs['instructor_id'] = int(instructor_id)
                if category_id:
                    kwargs['category_id'] = int(category_id)
                if subcategory_id:
                    kwargs['subcategory_id'] = int(subcategory_id)
                if status_filter:
                    kwargs['status'] = status_filter
                if is_featured is not None:
                    kwargs['is_featured'] = is_featured.lower() in ('true', '1', 'yes')
                if level:
                    kwargs['level'] = level
                if search:
                    kwargs['search'] = search
                if ordering:
                    kwargs['ordering'] = ordering
                if rating_min:
                    kwargs['rating_min'] = float(rating_min)
                if language:
                    kwargs['language'] = language
                if price_min:
                    kwargs['price_min'] = float(price_min)
                if price_max:
                    kwargs['price_max'] = float(price_max)
                if subcategory_ids:
                    kwargs['subcategory_ids'] = [int(v.strip()) for v in subcategory_ids.split(',') if v.strip().isdigit()]
                if levels:
                    kwargs['levels'] = [v.strip() for v in levels.split(',') if v.strip()]
                if languages:
                    kwargs['languages'] = [v.strip() for v in languages.split(',') if v.strip()]
                if duration_buckets:
                    kwargs['duration_buckets'] = [v.strip() for v in duration_buckets.split(',') if v.strip()]
                if certificate is not None and certificate != '':
                    kwargs['certificate'] = str(certificate).lower() in ('true', '1', 'yes')
            except (ValueError, TypeError) as e:
                return Response({"message": f"Tham số không hợp lệ: {e}"}, status=status.HTTP_400_BAD_REQUEST)

            courses = get_all_courses(**kwargs)
            return paginate_queryset(courses, request, CourseSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        payload = request.data.copy()
        if is_active_instructor(request.user):
            payload['instructor'] = request.user.instructor.id
        course = create_course(payload)
        return Response(course, status=status.HTTP_201_CREATED)

    def patch(self, request, course_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        course = update_course(course_id, request.data, requesting_user=request.user)
        return Response(course, status=status.HTTP_200_OK)

    def delete(self, request, course_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        result = delete_course(course_id, requesting_user=request.user)
        return Response(result, status=status.HTTP_200_OK)

class CourseDetailView(APIView):
    throttle_scope = 'search'
    def get(self, request, course_id):
        user = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user = User.objects.select_related('instructor', 'admin').get(id=payload["user_id"])
            except Exception:
                user = None
        course = get_course_by_id(course_id, user=user)
        return Response(course, status=status.HTTP_200_OK)


class CourseStudentsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'search'

    def get(self, request, course_id):
        students = get_course_students(course_id)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(students, request)
        return paginator.get_paginated_response(page)


class CourseStudentsExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, course_id):
        from utils.export_helpers import export_to_csv, export_to_excel
        try:
            rows_data = get_course_students(course_id)
            headers = ['Student ID', 'Full Name', 'Email', 'Status', 'Enrolled At', 'Last Access', 'Progress %', 'Study Minutes', 'Rating']
            rows = [
                [
                    r['student_id'],
                    r['full_name'],
                    r['email'],
                    r['status'],
                    r['enrolled_at'].isoformat() if r['enrolled_at'] else '',
                    r['last_access_date'].isoformat() if r['last_access_date'] else '',
                    r['average_progress'],
                    r['study_time_minutes'],
                    r.get('rating', ''),
                ]
                for r in rows_data
            ]
            fmt = request.query_params.get('format', 'csv')
            if fmt == 'excel':
                return export_to_excel(headers, rows, f'course_{course_id}_students', 'Students')
            return export_to_csv(headers, rows, f'course_{course_id}_students')
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
