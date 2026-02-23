from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_support_reply,
    get_support_replies,
    get_support_reply_by_id,
    delete_support_reply,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import SupportReplySerializer

class SupportReplyListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    def post(self, request):
        data = request.data
        try:
            support_reply = create_support_reply(data)
            return Response({"message": "Support reply created successfully.", "data": support_reply}, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, support_id):
        try:
            replies = get_support_replies(support_id)
            return paginate_queryset(replies, request, SupportReplySerializer)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_404_NOT_FOUND)
class SupportReplyDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    def get(self, request, reply_id):
        try:
            reply = get_support_reply_by_id(reply_id)
            return Response(reply, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, reply_id):
        try:
            response = delete_support_reply(reply_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_404_NOT_FOUND)