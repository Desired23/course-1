from django.urls import path

from .views import AnswerListView, AnswerMutateView

urlpatterns = [
    path('answers/', AnswerListView.as_view(), name='answer-list'),
    path('answers/create/', AnswerMutateView.as_view(), name='answer-create'),
    path('answers/<int:answer_id>/update/', AnswerMutateView.as_view(), name='answer-update'),
    path('answers/<int:answer_id>/delete/', AnswerMutateView.as_view(), name='answer-delete'),
]
