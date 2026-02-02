from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    update_learning_progress,
    update_lesson_progress,
    get_course_progress
)
from .serializers import LearningProgressSerializer, CourseLearningProgressSerializer

class LearningProgressUpdateView(APIView):
    """
    POST /api/learning-progress/update/
    Update learning progress for a lesson
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    
    def post(self, request):
        try:
            user_id = request.user.id
            lesson_id = request.data.get('lesson_id')
            
            if not lesson_id:
                raise ValidationError({"lesson_id": "lesson_id is required."})
            
            progress_data = {
                'progress_percentage': request.data.get('progress_percentage', 0),
                'time_spent': request.data.get('time_spent', 0),
                'is_completed': request.data.get('is_completed', False),
                'last_position': request.data.get('last_position')
            }
            
            result = update_learning_progress(user_id, lesson_id, progress_data)
            return Response(result, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LearningProgressDetailView(APIView):
    """
    PUT /api/learning-progress/<lesson_id>/
    Update progress for specific lesson
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    
    def put(self, request, lesson_id):
        try:
            user_id = request.user.id
            
            progress_data = {
                'progress_percentage': request.data.get('progress_percentage', 0),
                'time_spent': request.data.get('time_spent', 0),
                'is_completed': request.data.get('is_completed', False),
                'last_position': request.data.get('last_position')
            }
            
            result = update_lesson_progress(lesson_id, user_id, progress_data)
            return Response(result, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CourseProgressView(APIView):
    """
    GET /api/learning-progress/course/<course_id>/
    Get overall progress for a course
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    
    def get(self, request, course_id):
        try:
            user_id = request.user.id
            result = get_course_progress(user_id, course_id)
            return Response(result, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)