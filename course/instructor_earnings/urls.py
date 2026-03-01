from django.urls import path
from .views import (
    InstructorEarningsView,
    InstructorEarningsByPayoutView,
    SubscriptionEarningsCalculationView,
    InstructorEarningsSummaryView,
)

urlpatterns = [
    path('instructor-earnings/', InstructorEarningsView.as_view(), name='instructor_earnings'),
    path('instructor-earnings/payout/<str:payout_id>/', InstructorEarningsByPayoutView.as_view(), name='update_instructor_earning_with_payout'),
    # Phase 3 — subscription revenue sharing
    path('instructor-earnings/subscription-calc/', SubscriptionEarningsCalculationView.as_view(), name='subscription-earnings-calc'),
    # Summary: cả 2 nguồn retail + subscription
    path('instructor-earnings/summary/', InstructorEarningsSummaryView.as_view(), name='instructor-earnings-summary'),
]
