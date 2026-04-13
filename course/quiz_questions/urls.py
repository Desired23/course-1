from django.urls import path
from .views import (
    QuizQuestionManagementView,
    LessonQuizView,
    QuizTestCaseView,
)
urlpatterns = [
    path('quiz-questions/', QuizQuestionManagementView.as_view(), name='quiz-question-list'),
    path('quiz-questions/create/', QuizQuestionManagementView.as_view(), name='quiz-question-create'),
    path('quiz-questions/<int:question_id>/', QuizQuestionManagementView.as_view(), name='quiz-question-detail'),
    path('quiz-questions/update/<int:question_id>/', QuizQuestionManagementView.as_view(), name='quiz-question-update'),
    path('quiz-questions/delete/<int:question_id>/', QuizQuestionManagementView.as_view(), name='quiz-question-delete'),


    path('quizzes/lesson/<int:lesson_id>/', LessonQuizView.as_view(), name='lesson-quiz'),


    path('test-cases/', QuizTestCaseView.as_view(), name='test-case-list'),
    path('test-cases/create/', QuizTestCaseView.as_view(), name='test-case-create'),
    path('test-cases/update/<int:test_case_id>/', QuizTestCaseView.as_view(), name='test-case-update'),
    path('test-cases/delete/<int:test_case_id>/', QuizTestCaseView.as_view(), name='test-case-delete'),
]