from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .models import CourseModule
from .serializers import CourseModuleSerializer
from .services import (
    create_course_module,
    get_course_modules,
    get_course_module_by_id,
    update_course_module,
    delete_course_module
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
class CourseModuleListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        filters = {}
        course_id = request.query_params.get('course_id')
        if course_id:
            if not str(course_id).isdigit():
                return Response({"errors": {"course_id": ["course_id must be an integer"]}}, status=status.HTTP_400_BAD_REQUEST)
            filters['course_id'] = int(course_id)
        if request.query_params.get('status'):
            filters['status'] = request.query_params['status']

        course_modules = get_course_modules(filters if filters else None)
        return paginate_queryset(course_modules, request, CourseModuleSerializer)

class CourseModuleDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request, course_module_id):
        try:
            course_module = get_course_module_by_id(course_module_id)
            return Response(course_module, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, course_module_id):
        try:
            updated_course_module = update_course_module(course_module_id, request.data, requesting_user=request.user)
            return Response(CourseModuleSerializer(updated_course_module).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, course_module_id):
        try:
            result = delete_course_module(course_module_id, requesting_user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class CourseModuleCreateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            course_module = create_course_module(request.data)
            return Response(CourseModuleSerializer(course_module).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

