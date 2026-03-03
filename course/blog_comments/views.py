from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import BlogCommentSerializer
from .services import (
    create_blog_comment,
    get_blog_comment_by_id,
    get_blog_comments_by_post_id,
    get_blog_comments_by_user_id,
    get_all_blog_comments,
    update_blog_comment,
    delete_blog_comment,
)


class BlogCommentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            if 'post_id' in request.query_params:
                post_id = request.query_params.get('post_id')
                blog_comments = get_blog_comments_by_post_id(post_id)
                return paginate_queryset(blog_comments, request, BlogCommentSerializer)
            elif 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                blog_comments = get_blog_comments_by_user_id(user_id)
                return paginate_queryset(blog_comments, request, BlogCommentSerializer)
            elif 'comment_id' in request.query_params:
                comment_id = request.query_params.get('comment_id')
                blog_comment = get_blog_comment_by_id(comment_id)
                return Response(blog_comment, status=status.HTTP_200_OK)
            else:
                blog_comments = get_all_blog_comments()
                return paginate_queryset(blog_comments, request, BlogCommentSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        try:
            blog_comment = create_blog_comment(request.data)
            return Response(blog_comment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, comment_id):
        try:
            updated = update_blog_comment(comment_id, request.data)
            return Response(updated, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, comment_id):
        try:
            result = delete_blog_comment(comment_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
