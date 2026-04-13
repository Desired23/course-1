from django.urls import path
from .views import (
    EnrollmentDetailView,
    EnrollmentManageByUserView,)

urlpatterns = [

    path('enrollments/<int:enrollment_id>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path('enrollments/create/', EnrollmentManageByUserView.as_view(), name='enrollment-create'),

    path('enrollments/', EnrollmentManageByUserView.as_view(), name='enrollment-manage'),

]