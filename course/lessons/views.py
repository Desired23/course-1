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
class LessonListView(APIView):
    def get(self, request):
        lessons = get_lessons()
        serializer = LessonSerializer(lessons, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class LessonDetailView(APIView):
    def get(self, request, lesson_id):
        try:
            lesson = get_lesson_by_id(lesson_id)
            return Response(lesson, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, lesson_id):
        try:
            updated_lesson = update_lesson(lesson_id, request.data)
            return Response(LessonSerializer(updated_lesson).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, lesson_id):
        try:
            result = delete_lesson(lesson_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)
        
class LessonCreateView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    def post(self, request):
        try:
            print ("Request data:", request.data)
            lesson = create_lesson(request.data, request.user.id)
            return Response(LessonSerializer(lesson).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        
