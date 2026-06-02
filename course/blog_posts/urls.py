from django.urls import path
from .views import (
    AdminBlogPostView,
    ClientBlogPostView,
    ClientBlogPostLikeView,
    ClientBlogBookmarkView,
    ClientBlogPostReportView,
)

urlpatterns = [
    path('admin/blog-posts/', AdminBlogPostView.as_view(), name='admin-blog-posts'),
    path('client/blog-posts/', ClientBlogPostView.as_view(), name='client-blog-posts'),
    path('admin/blog-posts/create/', AdminBlogPostView.as_view(), name='admin-blog-post-create'),
    path('admin/blog-posts/update/<int:blog_post_id>/', AdminBlogPostView.as_view(), name='admin-blog-post-update'),
    path('admin/blog-posts/delete/<int:blog_post_id>/', AdminBlogPostView.as_view(), name='admin-blog-post-delete'),
    path('client/blog-posts/increase-views/<int:blog_post_id>/', ClientBlogPostView.as_view(), name='client-blog-post-increase-views'),
    path('client/blog-posts/like/<int:blog_post_id>/', ClientBlogPostLikeView.as_view(), name='client-blog-post-like'),
    path('client/blog-posts/bookmark/<int:blog_post_id>/', ClientBlogBookmarkView.as_view(), name='client-blog-post-bookmark'),
    path('client/blog-posts/report/<int:blog_post_id>/', ClientBlogPostReportView.as_view(), name='client-blog-post-report'),
]