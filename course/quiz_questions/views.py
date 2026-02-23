from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.pagination import paginate_queryset
from .serializers import QuizQuestionSerializer, QuizTestCaseSerializer
from .services import (
    create_quiz_question,
    get_quiz_questions_by_lesson,
    find_quiz_question_by_id,
    update_quiz_question,
    delete_quiz_question,
    get_all_quiz_questions,
    get_lesson_quiz,
    create_test_case,
    get_test_cases_by_question,
    update_test_case,
    delete_test_case,
)
from utils.permissions import RolePermissionFactory
from rest_framework.permissions import IsAuthenticated

class QuizQuestionManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def post(self, request):
        try:
            quiz_question = create_quiz_question(request.data)
            print("Quiz question created successfully:", quiz_question)
            print("Request data:", request.data)
            return Response(quiz_question, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        try:
            if 'question_id' in request.query_params:
                question_id = request.query_params.get('question_id')
                quiz_question = find_quiz_question_by_id(question_id)
                return Response(quiz_question, status=status.HTTP_200_OK)
            elif 'lesson_id' in request.query_params:
                lesson_id = request.query_params.get('lesson_id')
                quiz_questions = get_quiz_questions_by_lesson(lesson_id)
                return paginate_queryset(quiz_questions, request, QuizQuestionSerializer)
            # elif 'user_id' in request.query_params:
            #     user_id = request.query_params.get('user_id')
            #     quiz_questions = get_quiz_questions_by_user_id(user_id)
            #     return paginate_queryset(quiz_questions, request, QuizQuestionSerializer)
            else:
                quiz_questions = get_all_quiz_questions()
                return paginate_queryset(quiz_questions, request, QuizQuestionSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, question_id):
        try:
            print("Updating quiz question ID:", question_id)
            updated_quiz_question = update_quiz_question(question_id, request.data)
            return Response(updated_quiz_question, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, question_id):
        try:
            response = delete_quiz_question(question_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class LessonQuizView(APIView):
    """
    GET /api/quizzes/lesson/<lesson_id>/
    Get all quiz questions for a lesson (for students taking quiz)
    """
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    def get(self, request, lesson_id):
        try:
            quiz_data = get_lesson_quiz(lesson_id)
            return Response(quiz_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizTestCaseView(APIView):
    """
    Manage test cases for code-type quiz questions
    """
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def post(self, request):
        """Create a new test case"""
        try:
            test_case = create_test_case(request.data)
            return Response(test_case, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """Get test cases for a question"""
        try:
            question_id = request.query_params.get('question_id')
            if not question_id:
                return Response({"error": "question_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            test_cases = get_test_cases_by_question(question_id)
            return paginate_queryset(test_cases, request, QuizTestCaseSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, test_case_id):
        """Update a test case"""
        try:
            updated_test_case = update_test_case(test_case_id, request.data)
            return Response(updated_test_case, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, test_case_id):
        """Delete a test case"""
        try:
            response = delete_test_case(test_case_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)