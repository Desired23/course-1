from django.urls import path
from .views import BlogCommentListView, BlogCommentLikeView

urlpatterns = [
    path('blog_comments/', BlogCommentListView.as_view(), name='blog-comment-list'),
    path('blog_comments/create/', BlogCommentListView.as_view(), name='blog-comment-create'),
    path('blog_comments/<int:comment_id>/update/', BlogCommentListView.as_view(), name='blog-comment-update'),
    path('blog_comments/<int:comment_id>/delete/', BlogCommentListView.as_view(), name='blog-comment-delete'),
    path('blog_comments/<int:comment_id>/like/', BlogCommentLikeView.as_view(), name='blog-comment-like'),
]
