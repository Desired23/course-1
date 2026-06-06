from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .services import (
create_blog_post
, update_blog_post, delete_blog_post, get_blog_post, get_all_blog_posts,
get_blog_posts_published,
get_blog_post_published,
increase_blog_post_views,
like_blog_post,
toggle_blog_bookmark,
)
from utils.permissions import RolePermissionFactory
from utils.roles import is_active_admin
from utils.pagination import paginate_queryset
from .serializers import BlogPostSerializer

class AdminBlogPostView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        if request.query_params.get('blog_post_id'):
            blog_post = get_blog_post(request.query_params.get('blog_post_id'), actor_user=request.user)
            return Response(blog_post, status=status.HTTP_200_OK)
        blog_posts = get_all_blog_posts()
        if not is_active_admin(request.user):
            blog_posts = blog_posts.filter(author=request.user)
        return paginate_queryset(blog_posts, request, BlogPostSerializer)

    def post(self, request):
        blog_post = create_blog_post(request.data, actor_user=request.user, request=request)
        return Response(blog_post, status=status.HTTP_201_CREATED)

    def patch(self, request, blog_post_id):
        blog_post = update_blog_post(blog_post_id, request.data, actor_user=request.user, request=request)
        return Response(blog_post, status=status.HTTP_200_OK)

    def delete(self, request, blog_post_id):
        response = delete_blog_post(blog_post_id, actor_user=request.user, request=request)
        return Response(response, status=status.HTTP_204_NO_CONTENT)
class ClientBlogPostView(APIView):
    throttle_scope = 'search'
    permission_classes = [AllowAny]

    def get(self, request):
        blog_post_id = request.query_params.get('blog_post_id')
        if blog_post_id:
            return Response(get_blog_post_published(blog_post_id), status=status.HTTP_200_OK)
        return paginate_queryset(get_blog_posts_published(), request, BlogPostSerializer)

    def patch(self, request, blog_post_id):
        return Response(increase_blog_post_views(blog_post_id), status=status.HTTP_200_OK)


class ClientBlogPostLikeView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def patch(self, request, blog_post_id):
        return Response(like_blog_post(blog_post_id), status=status.HTTP_200_OK)


class ClientBlogBookmarkView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, blog_post_id):
        return Response(toggle_blog_bookmark(blog_post_id, request.user), status=status.HTTP_200_OK)


class ClientBlogPostReportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, blog_post_id):
        from reports.services import create_report
        try:
            create_report(
                reporter=request.user,
                target_type='blog_post',
                target_id=blog_post_id,
                reason=request.data.get('reason', 'other'),
                description=request.data.get('description', ''),
            )
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Báo cáo đã được ghi nhận.'}, status=status.HTTP_200_OK)

