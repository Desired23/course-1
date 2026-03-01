from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .services import (
    create_lesson_comment,
    update_lesson_comment,
    delete_lesson_comment,
    get_root_comments,
    get_comment_replies,
    get_comment_by_id
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import LessonCommentSerializer


class LessonCommentView(APIView):
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        user_id = request.user.id
        lesson_id = request.data.get('lesson_id')
        content = request.data.get('content')
        parent_comment = request.data.get('parent_comment')

        if not lesson_id or not content:
            return Response({"error": "Lesson ID and content are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment_data = create_lesson_comment(user_id, lesson_id, content, parent_comment)
            return Response(comment_data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, comment_id = None):
        content = request.data.get('content')
        votes = request.data.get('votes')

        if not content:
            return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment_data = update_lesson_comment(comment_id, content, votes)
            return Response(comment_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    def get(self, request, lesson_id = None):
        try:
            root_comments = get_root_comments(lesson_id)
            return paginate_queryset(root_comments, request, LessonCommentSerializer)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
class LessonCommentManagementView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def delete(self, request, comment_id):
        try:
            response = delete_lesson_comment(comment_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
class LessonCommentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request, comment_id):
        query = request.query_params.get('replies', 'false').lower() == 'true'
        if not query:
            try:
                comment = get_comment_by_id(comment_id)
                return Response(comment, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        try:
            replies = get_comment_replies(comment_id)
            return paginate_queryset(replies, request, LessonCommentSerializer)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    