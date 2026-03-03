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
    get_public_stats
)
from utils.permissions import RolePermissionFactory
from .serializers import CourseSerializer
from utils.pagination import paginate_queryset


class CourseStatsView(APIView):
    """GET /api/courses/stats/ — public platform stats for homepage."""
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
            search = params.get('search')
            ordering = params.get('ordering')
            rating_min = params.get('rating_min')
            language = params.get('language')
            price_min = params.get('price_min')
            price_max = params.get('price_max')

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

            courses = get_all_courses(**kwargs)
            return paginate_queryset(courses, request, CourseSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        try:
            course = create_course(request.data)
            return Response(course, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, course_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        try:
            course = update_course(course_id, request.data, requesting_user=request.user)
            return Response(course, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, course_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        try:
            result = delete_course(course_id, requesting_user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)
        
class CourseDetailView(APIView):
    throttle_scope = 'search'
    def get(self, request, course_id):
        try:
            user = getattr(request, 'user', None)
            # user might be AnonymousUser if no token; pass None in that case
            if user and not hasattr(user, 'id'):
                user = None
            course = get_course_by_id(course_id, user=user)
            return Response(course, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)