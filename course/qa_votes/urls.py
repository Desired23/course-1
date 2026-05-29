from django.urls import path

from .views import QuestionVoteView, AnswerVoteView

urlpatterns = [
    path('qa-votes/question/<int:question_id>/', QuestionVoteView.as_view(), name='question-vote'),
    path('qa-votes/answer/<int:answer_id>/', AnswerVoteView.as_view(), name='answer-vote'),
]
