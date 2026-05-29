from django.urls import path

from .views import (
    LearningPathAdvisorChatView,
    LearningPathAdvisorChatStreamView,
    LearningPathDetailView,
    LearningPathListCreateView,
    LearningPathRecalculateView,
)


urlpatterns = [
    path('learning-paths/advisor/chat', LearningPathAdvisorChatView.as_view(), name='learning-path-advisor-chat'),
    path('learning-paths/advisor/chat/stream', LearningPathAdvisorChatStreamView.as_view(), name='learning-path-advisor-chat-stream'),
    path('learning-paths/', LearningPathListCreateView.as_view(), name='learning-path-list-create'),
    path('learning-paths/<int:path_id>', LearningPathDetailView.as_view(), name='learning-path-detail'),
    path('learning-paths/<int:path_id>/recalculate', LearningPathRecalculateView.as_view(), name='learning-path-recalculate'),
]
