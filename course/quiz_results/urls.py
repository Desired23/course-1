from django.urls import path
from .views import (
    QuizResultListView,
    QuizSubmitView,
    UserQuizHistoryView,
    QuizResultDetailView,
)

urlpatterns = [
    path('quiz-results-old/', QuizResultListView.as_view(), name='quiz-results-list'),
    path('quiz-results-old/create/', QuizResultListView.as_view(), name='quiz-results-create'),
    path('quiz-results-old/<int:quiz_result_id>/update/', QuizResultListView.as_view(), name='quiz-results-update'),
    path('quiz-results-old/<int:quiz_result_id>/delete/', QuizResultListView.as_view(), name='quiz-results-delete'),


    path('quizzes/submit/', QuizSubmitView.as_view(), name='quiz-submit'),
    path('quiz-results/user/<int:user_id>/', UserQuizHistoryView.as_view(), name='user-quiz-history'),
    path('quiz-results/<int:quiz_result_id>/', QuizResultDetailView.as_view(), name='quiz-result-detail'),
]