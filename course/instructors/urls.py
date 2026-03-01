from django.urls import path
from .views import (
    InstructorListView, InstructorCreateView, InstructorDetailView,
    InstructorDashboardStatsView, InstructorCourseAnalyticsView,
)

urlpatterns = [
    path('instructors/', InstructorListView.as_view(), name='instructor-list'),
    path('instructors/create', InstructorCreateView.as_view(), name='instructor-create'),
    path('instructors/<int:instructor_id>', InstructorDetailView.as_view(), name='instructor-detail'),
    path('instructors/<int:instructor_id>/update', InstructorDetailView.as_view(), name='instructor-update'),
    path('instructors/<int:instructor_id>/delete', InstructorDetailView.as_view(), name='instructor-delete'),

    # Dashboard analytics
    path('instructor/dashboard/stats/', InstructorDashboardStatsView.as_view(), name='instructor-dashboard-stats'),
    path('instructor/courses/<int:course_id>/analytics/', InstructorCourseAnalyticsView.as_view(), name='instructor-course-analytics'),
]