from django.urls import path
from .views import  LessonCommentDetailView, LessonCommentManagementView, LessonCommentView
urlpatterns = [
    path('comments/create', LessonCommentView.as_view(), name='lesson_comment_create'),
    path('comments/<int:comment_id>', LessonCommentDetailView.as_view(), name='lesson_comment_detail'),
    path('comments/<int:comment_id>/manage/', LessonCommentManagementView.as_view(), name='lesson_comment_management'),
    path('comments/lesson/<int:lesson_id>/', LessonCommentView.as_view(), name='lesson_comments'),
    path('comments/<int:comment_id>/update', LessonCommentView.as_view(), name='update-comment'),
]
