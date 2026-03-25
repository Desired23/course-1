from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    update_learning_progress,
    update_lesson_progress,
    get_course_progress,
    get_student_stats,
)

class LearningProgressUpdateView(APIView):
    """
    POST /api/learning-progress/update/
    Update learning progress for a lesson
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'
    
    def post(self, request):
        try:
            user_id = request.user.id
            lesson_id = request.data.get('lesson_id')
            
            if not lesson_id:
                raise ValidationError({"lesson_id": "lesson_id is required."})
            
            progress_data = {}
            for field in ['progress_percentage', 'time_spent', 'is_completed', 'last_position', 'notes']:
                if field in request.data:
                    progress_data[field] = request.data.get(field)
            
            result = update_learning_progress(user_id, lesson_id, progress_data)
            return Response(result, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LearningProgressDetailView(APIView):
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'
    
    def put(self, request, lesson_id):
        try:
            user_id = request.user.id
            
            progress_data = {}
            for field in ['progress_percentage', 'time_spent', 'is_completed', 'last_position', 'notes']:
                if field in request.data:
                    progress_data[field] = request.data.get(field)
            
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
    throttle_scope = 'burst'
    
    def get(self, request, course_id):
        try:
            user_id = request.user.id
            result = get_course_progress(user_id, course_id)
            return Response(result, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StudentStatsView(APIView):
    """
    GET /api/students/my-stats/
    Returns aggregated learning statistics for the authenticated student.
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            result = get_student_stats(request.user)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
