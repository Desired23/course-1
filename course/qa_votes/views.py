from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from utils.permissions import RolePermissionFactory
from .services import vote_question, vote_answer


class QuestionVoteView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, question_id):
        vote_type = request.data.get('vote_type')
        if vote_type not in ('up', 'down'):
            return Response(
                {'error': "vote_type must be 'up' or 'down'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = vote_question(request.user, question_id, vote_type)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnswerVoteView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, answer_id):
        vote_type = request.data.get('vote_type')
        if vote_type not in ('up', 'down'):
            return Response(
                {'error': "vote_type must be 'up' or 'down'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = vote_answer(request.user, answer_id, vote_type)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
