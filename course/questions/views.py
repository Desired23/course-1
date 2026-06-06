from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny

from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import QuestionSerializer
from .services import (
    create_question,
    get_question_by_id,
    get_all_questions,
    update_question,
    delete_question,
    increase_question_views,
    report_question,
    moderate_question,
    accept_answer,
)


class QuestionListView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'search'

    def get(self, request):
        try:
            question_id = request.query_params.get('question_id')
            if question_id:
                question = get_question_by_id(question_id)
                return Response(question, status=status.HTTP_200_OK)
            questions = get_all_questions(
                search=request.query_params.get('search'),
                tag=request.query_params.get('tag'),
                status=request.query_params.get('status'),
                sort=request.query_params.get('sort', 'newest'),
            )
            return paginate_queryset(questions, request, QuestionSerializer)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionMutateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            question = create_question(request.data, request.user)
            return Response(question, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, question_id):
        try:
            question = update_question(question_id, request.data, request.user)
            return Response(question, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, question_id):
        try:
            result = delete_question(question_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionViewsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, question_id):
        try:
            result = increase_question_views(question_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionReportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, question_id):
        try:
            result = report_question(question_id, request.data.get('reason', ''))
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionModerationView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, question_id):
        try:
            result = moderate_question(
                question_id,
                request.data.get('action'),
                request.data.get('reason', ''),
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionAcceptAnswerView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def patch(self, request, question_id):
        try:
            answer_id = request.data.get('answer_id')
            if not answer_id:
                return Response({'error': 'answer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            result = accept_answer(question_id, answer_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
