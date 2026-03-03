from django.urls import path
from .views import CourseListView, CourseDetailView, CourseStatsView

urlpatterns = [
    path('courses/stats/', CourseStatsView.as_view(), name='course-stats'),
    path('courses/', CourseListView.as_view(), name='course-list'),
    path('courses/create', CourseListView.as_view(), name='course-create'),
    path('courses/<int:course_id>', CourseDetailView.as_view(), name='course-detail'),
    path('courses/<int:course_id>/update', CourseListView.as_view(), name='course-update'),
    path('courses/<int:course_id>/delete', CourseListView.as_view(), name='course-delete'),
]