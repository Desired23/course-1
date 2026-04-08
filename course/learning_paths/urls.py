from django.urls import path

from .views import (
    LearningPathAdminActionView,
    LearningPathAdminBulkActionView,
    LearningPathAdminDetailView,
    LearningPathAdvisorChatView,
    LearningPathAdvisorChatStreamView,
    LearningPathAdvisorStatsView,
    LearningPathDetailView,
    LearningPathListCreateView,
    LearningPathRecalculateView,
)


urlpatterns = [
    path('learning-paths/advisor/chat', LearningPathAdvisorChatView.as_view(), name='learning-path-advisor-chat'),
    path('learning-paths/advisor/chat/stream', LearningPathAdvisorChatStreamView.as_view(), name='learning-path-advisor-chat-stream'),
    path('learning-paths/advisor/stats', LearningPathAdvisorStatsView.as_view(), name='learning-path-advisor-stats'),
    path('learning-paths/admin/bulk-action', LearningPathAdminBulkActionView.as_view(), name='learning-path-admin-bulk-action'),
    path('learning-paths/admin/<int:path_id>', LearningPathAdminDetailView.as_view(), name='learning-path-admin-detail'),
    path('learning-paths/admin/<int:path_id>/action', LearningPathAdminActionView.as_view(), name='learning-path-admin-action'),
    path('learning-paths/', LearningPathListCreateView.as_view(), name='learning-path-list-create'),
    path('learning-paths/<int:path_id>', LearningPathDetailView.as_view(), name='learning-path-detail'),
    path('learning-paths/<int:path_id>/recalculate', LearningPathRecalculateView.as_view(), name='learning-path-recalculate'),
]
