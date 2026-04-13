from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from .services import (
create_blog_post
, update_blog_post, delete_blog_post, get_blog_post, get_all_blog_posts,
get_blog_posts_published,
get_blog_post_published,
increase_blog_post_views
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import BlogPostSerializer

class AdminBlogPostView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            if request.query_params.get('blog_post_id'):
                blog_post_id = request.query_params.get('blog_post_id')
                blog_post = get_blog_post(blog_post_id)
                return Response(blog_post, status=status.HTTP_200_OK)
            else:
                blog_posts = get_all_blog_posts()
                return paginate_queryset(blog_posts, request, BlogPostSerializer)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            data = request.data
            blog_post = create_blog_post(data)
            return Response(blog_post, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, blog_post_id):
        try:
            data = request.data
            blog_post = update_blog_post(blog_post_id, data)
            return Response(blog_post, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, blog_post_id):
        try:
            response = delete_blog_post(blog_post_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class ClientBlogPostView(APIView):
    throttle_scope = 'search'
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            blog_post_id = request.query_params.get('blog_post_id')
            if blog_post_id:
                blog_post = get_blog_post_published(blog_post_id)
                return Response(blog_post, status=status.HTTP_200_OK)
            else:
                blog_posts = get_blog_posts_published()
                return paginate_queryset(blog_posts, request, BlogPostSerializer)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, blog_post_id):
        try:
            blog_post = increase_blog_post_views(blog_post_id)
            return Response(blog_post, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

