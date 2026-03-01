from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import ForumCommentSerializer
from .services import (
    create_forum_comment,
    get_forum_comment_by_id,
    get_forum_comments_by_topic_id,
    get_forum_comments_by_user_id,
    get_all_forum_comments,
    update_forum_comment,
    delete_forum_comment,
)

class ForumCommentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            if 'topic_id' in request.query_params:
                topic_id = request.query_params.get('topic_id')
                forum_comments = get_forum_comments_by_topic_id(topic_id)
                return paginate_queryset(forum_comments, request, ForumCommentSerializer)
            elif 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                forum_comments = get_forum_comments_by_user_id(user_id)
                return paginate_queryset(forum_comments, request, ForumCommentSerializer)
            elif 'comment_id' in request.query_params:
                comment_id = request.query_params.get('comment_id')
                forum_comment = get_forum_comment_by_id(comment_id)
                return Response(forum_comment, status=status.HTTP_200_OK)
            else:
                forum_comments = get_all_forum_comments()
                return paginate_queryset(forum_comments, request, ForumCommentSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        try:
            forum_comment = create_forum_comment(request.data)
            return Response(forum_comment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, comment_id):
        try:
            updated_forum_comment = update_forum_comment(comment_id, request.data)
            return Response(updated_forum_comment, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, comment_id):
        try:
            result = delete_forum_comment(comment_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)