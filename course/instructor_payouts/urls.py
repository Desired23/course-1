from django.urls import path
from .views import (
    InstructorPayoutView,
    InstructorPayoutRequestView,
    AdminPayoutApproveView,
    AdminPayoutRejectView,
)

urlpatterns = [
    path('instructor-payouts/', InstructorPayoutView.as_view(), name='instructor_payouts_get_delete_detail'),
    path('instructor-payouts/delete/<int:payout_id>/', InstructorPayoutView.as_view(), name='delete_instructor_payout'),


    path('instructor/payouts/request/', InstructorPayoutRequestView.as_view(), name='instructor-payout-request'),


    path('admin/payouts/<int:payout_id>/approve/', AdminPayoutApproveView.as_view(), name='admin-payout-approve'),
    path('admin/payouts/<int:payout_id>/reject/', AdminPayoutRejectView.as_view(), name='admin-payout-reject'),
]