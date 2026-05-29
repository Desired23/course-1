from django.urls import path
from .views import (
    InstructorEarningsView,
    InstructorEarningsByPayoutView,
    SubscriptionEarningsCalculationView,
    InstructorEarningsSummaryView,
    InstructorSubscriptionRevenueBreakdownView,
    InstructorEarningsMonthlyView,
    InstructorEarningsExportView,
)

urlpatterns = [
    path('instructor-earnings/', InstructorEarningsView.as_view(), name='instructor_earnings'),
    path('instructor-earnings/payout/<str:payout_id>/', InstructorEarningsByPayoutView.as_view(), name='update_instructor_earning_with_payout'),
    path('instructor-earnings/subscription-calc/', SubscriptionEarningsCalculationView.as_view(), name='subscription-earnings-calc'),
    path('instructor-earnings/summary/', InstructorEarningsSummaryView.as_view(), name='instructor-earnings-summary'),
    path('instructor-earnings/subscription-breakdown/', InstructorSubscriptionRevenueBreakdownView.as_view(), name='instructor-earnings-subscription-breakdown'),
    path('instructor-earnings/monthly/', InstructorEarningsMonthlyView.as_view(), name='instructor-earnings-monthly'),
    path('instructor-earnings/export/', InstructorEarningsExportView.as_view(), name='instructor-earnings-export'),
]
