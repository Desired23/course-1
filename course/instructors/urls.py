from django.urls import path
from .views import (
    InstructorListView, InstructorCreateView, InstructorDetailView,
    InstructorDashboardStatsView, InstructorCourseAnalyticsView,
    InstructorAnalyticsTimeseriesView, InstructorStudentsView, InstructorStudentsExportView, InstructorStudentDetailView,
)

urlpatterns = [
    path('instructors/', InstructorListView.as_view(), name='instructor-list'),
    path('instructors/create', InstructorCreateView.as_view(), name='instructor-create'),
    path('instructors/<int:instructor_id>/', InstructorDetailView.as_view(), name='instructor-detail'),
    path('instructors/<int:instructor_id>/update', InstructorDetailView.as_view(), name='instructor-update'),
    path('instructors/<int:instructor_id>/delete', InstructorDetailView.as_view(), name='instructor-delete'),


    path('instructor/dashboard/stats/', InstructorDashboardStatsView.as_view(), name='instructor-dashboard-stats'),
    path('instructor/students/', InstructorStudentsView.as_view(), name='instructor-students'),
    path('instructor/students/<int:student_id>/', InstructorStudentDetailView.as_view(), name='instructor-student-detail'),
    path('instructor/students/export/', InstructorStudentsExportView.as_view(), name='instructor-students-export'),
    path('instructor/courses/<int:course_id>/analytics/', InstructorCourseAnalyticsView.as_view(), name='instructor-course-analytics'),
    path('instructor/analytics/timeseries/', InstructorAnalyticsTimeseriesView.as_view(), name='instructor-analytics-timeseries'),
]
