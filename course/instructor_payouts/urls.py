from django.urls import path
from .cron_view import run_payouts_view, settle_earnings_view
from .views import (
    InstructorPayoutView,
    AdminMonthlyPayoutRunView,
    InstructorPayoutExportView,
)

urlpatterns = [
    path('payouts/cron/settle-earnings/', settle_earnings_view, name='payouts-cron-settle-earnings'),
    path('payouts/cron/run-payouts/', run_payouts_view, name='payouts-cron-run-payouts'),
    path('instructor-payouts/', InstructorPayoutView.as_view(), name='instructor_payouts_get_delete_detail'),
    path('instructor-payouts/export/', InstructorPayoutExportView.as_view(), name='instructor-payout-export'),
    path('instructor-payouts/delete/<int:payout_id>/', InstructorPayoutView.as_view(), name='delete_instructor_payout'),

    path('admin/payouts/run-monthly/', AdminMonthlyPayoutRunView.as_view(), name='admin-payout-run-monthly'),
]