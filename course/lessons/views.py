from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Lesson
from .serializers import LessonSerializer
from .services import (
    create_lesson,
    update_lesson,
    delete_lesson,
    get_lessons,
    get_lesson_by_id
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
class LessonListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        filters = {}
        if request.query_params.get('coursemodule_id'):
            filters['coursemodule_id'] = request.query_params['coursemodule_id']
        if request.query_params.get('content_type'):
            filters['content_type'] = request.query_params['content_type']
        if request.query_params.get('instructor_id'):
            filters['instructor_id'] = request.query_params['instructor_id']
        if request.query_params.get('status'):
            filters['status'] = request.query_params['status']
        if request.query_params.get('search'):
            filters['search'] = request.query_params['search']
        if request.query_params.get('ordering'):
            filters['ordering'] = request.query_params['ordering']
        lessons = get_lessons(filters if filters else None)
        return paginate_queryset(lessons, request, LessonSerializer)

class LessonDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, lesson_id):
        try:
            lesson = get_lesson_by_id(lesson_id)
            return Response(lesson, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, lesson_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        try:
            updated_lesson = update_lesson(lesson_id, request.data, requesting_user=request.user)
            return Response(LessonSerializer(updated_lesson).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, lesson_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
        self.check_permissions(request)
        try:
            result = delete_lesson(lesson_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class LessonCreateView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = 'burst'
    def post(self, request):
        try:
            print ("Request data:", request.data)
            lesson = create_lesson(request.data, request.user.id)
            return Response(LessonSerializer(lesson).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

