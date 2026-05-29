from django.urls import path

from .views import (
    QuestionListView,
    QuestionMutateView,
    QuestionViewsView,
    QuestionReportView,
    QuestionModerationView,
    QuestionAcceptAnswerView,
)

urlpatterns = [
    path('questions/', QuestionListView.as_view(), name='question-list'),
    path('questions/create/', QuestionMutateView.as_view(), name='question-create'),
    path('questions/<int:question_id>/update/', QuestionMutateView.as_view(), name='question-update'),
    path('questions/<int:question_id>/delete/', QuestionMutateView.as_view(), name='question-delete'),
    path('questions/<int:question_id>/increase-views/', QuestionViewsView.as_view(), name='question-increase-views'),
    path('questions/<int:question_id>/report/', QuestionReportView.as_view(), name='question-report'),
    path('questions/<int:question_id>/moderate/', QuestionModerationView.as_view(), name='question-moderate'),
    path('questions/<int:question_id>/accept-answer/', QuestionAcceptAnswerView.as_view(), name='question-accept-answer'),
]
