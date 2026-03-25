from django.urls import path
from .views import ForumTopicListView, ForumTopicReportView, ForumTopicModerationView

urlpatterns = [
    path('forum_topics/', ForumTopicListView.as_view(), name='forum-topic-list'),
    path('forum_topics/create/', ForumTopicListView.as_view(), name='forum-topic-create'),
    path('forum_topics/<int:topic_id>/update/', ForumTopicListView.as_view(), name='forum-topic-update'),
    path('forum_topics/<int:topic_id>/delete/', ForumTopicListView.as_view(), name='forum-topic-delete'),
    path('forum_topics/<int:topic_id>/report/', ForumTopicReportView.as_view(), name='forum-topic-report'),
    path('forum_topics/<int:topic_id>/moderate/', ForumTopicModerationView.as_view(), name='forum-topic-moderate'),
]
