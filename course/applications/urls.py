from django.urls import path
from .views import (
    ApplicationSubmitView,
    ApplicationUserView,
    ApplicationResubmitView,
    ApplicationAdminView,
    ApplicationReviewView,
)

urlpatterns = [
    path('applications/submit/', ApplicationSubmitView.as_view(), name='application-submit'),
    path('applications/me/', ApplicationUserView.as_view(), name='application-user'),
    path('applications/<int:application_id>/resubmit/', ApplicationResubmitView.as_view(), name='application-resubmit'),
    path('applications/admin/', ApplicationAdminView.as_view(), name='application-admin-list'),
    path('applications/<int:application_id>/review/', ApplicationReviewView.as_view(), name='application-review'),
]
