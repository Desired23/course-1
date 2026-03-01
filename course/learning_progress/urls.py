from django.urls import path
from .views import (
    LearningProgressUpdateView,
    LearningProgressDetailView,
    CourseProgressView,
    StudentStatsView,
)

urlpatterns = [
    path('learning-progress/update/', LearningProgressUpdateView.as_view(), name='learning_progress_update'),
    path('learning-progress/<int:lesson_id>/', LearningProgressDetailView.as_view(), name='learning_progress_detail'),
    path('learning-progress/course/<int:course_id>/', CourseProgressView.as_view(), name='course_progress'),
    path('students/my-stats/', StudentStatsView.as_view(), name='student-my-stats'),
]