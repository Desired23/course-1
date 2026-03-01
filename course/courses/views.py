from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_course,
    update_course,
    delete_course,
    get_all_courses,
    get_course_by_id
)
from utils.permissions import RolePermissionFactory
from .serializers import CourseSerializer
from utils.pagination import paginate_queryset

class CourseListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        try:
            courses = get_all_courses()
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