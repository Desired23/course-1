from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_qna,
    get_qna_by_id,
    get_qna_by_user_id,
    get_all_qna,
    update_qna,
    delete_qna,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import QnASerializer

class QnAListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            if 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                qna = get_qna_by_user_id(user_id)
                return paginate_queryset(qna, request, QnASerializer)
            elif 'qna_id' in request.query_params:
                qna_id = request.query_params.get('qna_id')
                qna = get_qna_by_id(qna_id)
                return Response(qna, status=status.HTTP_200_OK)
            else:
                qnas = get_all_qna()
                return paginate_queryset(qnas, request, QnASerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        try:
            qna = create_qna(request.data)
            return Response(qna, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, qna_id):
        try:
            updated_qna = update_qna(qna_id, request.data)
            return Response(updated_qna, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, qna_id):
        try:
            result = delete_qna(qna_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)