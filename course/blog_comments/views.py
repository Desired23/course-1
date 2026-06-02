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
from .models import BlogComment


class BlogCommentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        if 'post_id' in request.query_params:
            blog_comments = get_blog_comments_by_post_id(request.query_params.get('post_id'))
            return paginate_queryset(blog_comments, request, BlogCommentSerializer)
        elif 'user_id' in request.query_params:
            blog_comments = get_blog_comments_by_user_id(request.query_params.get('user_id'))
            return paginate_queryset(blog_comments, request, BlogCommentSerializer)
        elif 'comment_id' in request.query_params:
            blog_comment = get_blog_comment_by_id(request.query_params.get('comment_id'))
            return Response(blog_comment, status=status.HTTP_200_OK)
        else:
            blog_comments = get_all_blog_comments()
            return paginate_queryset(blog_comments, request, BlogCommentSerializer)

    def post(self, request):
        data = request.data.copy()
        data['user'] = request.user.id
        blog_comment = create_blog_comment(data)
        return Response(blog_comment, status=status.HTTP_201_CREATED)

    def patch(self, request, comment_id):
        updated = update_blog_comment(comment_id, request.data)
        return Response(updated, status=status.HTTP_200_OK)

    def delete(self, request, comment_id):
        result = delete_blog_comment(comment_id)
        return Response(result, status=status.HTTP_200_OK)


class BlogCommentLikeView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def patch(self, request, comment_id):
        try:
            comment = BlogComment.objects.get(id=comment_id)
            comment.likes += 1
            comment.save(update_fields=['likes'])
            return Response(BlogCommentSerializer(comment).data, status=status.HTTP_200_OK)
        except BlogComment.DoesNotExist:
            return Response({"errors": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
