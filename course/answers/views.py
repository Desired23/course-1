from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny

from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import AnswerSerializer
from .services import create_answer, get_answers_by_question_id, update_answer, delete_answer


class AnswerListView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'search'

    def get(self, request):
        try:
            question_id = request.query_params.get('question_id')
            if not question_id:
                return Response({'error': 'question_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            answers = get_answers_by_question_id(question_id)
            return paginate_queryset(answers, request, AnswerSerializer)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnswerMutateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            answer = create_answer(request.data, request.user)
            return Response(answer, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, answer_id):
        try:
            answer = update_answer(answer_id, request.data, request.user)
            return Response(answer, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, answer_id):
        try:
            result = delete_answer(answer_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
