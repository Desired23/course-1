from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import QuizResultSerializer
from .services import (
    create_quiz_result,
    get_quiz_result_by_id,
    get_all_quiz_results,
    update_quiz_result,
    delete_quiz_result,
    get_quiz_results_by_enrollment,
    submit_quiz,
    get_user_quiz_history,
    get_quiz_result_detail,
)

class QuizResultListView(APIView):
    def post(self, request):
        try:
            data = request.data
            quiz_result = create_quiz_result(data)
            return Response(quiz_result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def get(self, request):
        try:
            if 'enrollment_id' in request.query_params:
                enrollment_id = request.query_params.get('enrollment_id')
                quiz_results = get_quiz_results_by_enrollment(enrollment_id)
                return paginate_queryset(quiz_results, request, QuizResultSerializer)
            elif 'quiz_result_id' in request.query_params:
                quiz_result_id = request.query_params.get('quiz_result_id')
                quiz_result = get_quiz_result_by_id(quiz_result_id)
                return Response(quiz_result, status=status.HTTP_200_OK)
            else:
                quiz_results = get_all_quiz_results()
                return paginate_queryset(quiz_results, request, QuizResultSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, quiz_result_id):
        try:
            quiz_result = update_quiz_result(quiz_result_id, request.data)
            return Response(quiz_result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, quiz_result_id):
        try:
            result = delete_quiz_result(quiz_result_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)


class QuizSubmitView(APIView):
    """
    POST /api/quizzes/submit/
    Submit quiz answers and get results
    """
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request):
        try:
            result = submit_quiz(request.data, request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserQuizHistoryView(APIView):
    """
    GET /api/quiz-results/user/<user_id>/
    Get user's quiz history
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            # Optional: Add permission check to ensure user can only see their own history
            # if request.user.id != user_id and not request.user.is_staff:
            #     return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            
            history = get_user_quiz_history(user_id)
            return Response(history, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizResultDetailView(APIView):
    """
    GET /api/quiz-results/<quiz_result_id>/
    Get specific quiz result detail
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, quiz_result_id):
        try:
            result_detail = get_quiz_result_detail(quiz_result_id)
            return Response(result_detail, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)