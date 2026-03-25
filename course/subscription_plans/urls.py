from django.urls import path
from .views import (
    SubscriptionPlanPublicView,
    PlanCoursesPublicView,
    SubscriptionPlanAdminView,
    PlanCourseAdminView,
    PlanSubscribersView,
    AdminExtendSubscriptionView,
    AdminCancelSubscriptionView,
    ExpireSubscriptionsView,
    UserSubscribeView,
    UserSubscriptionView,
    UserCancelSubscriptionView,
    UserCourseAccessView,
    UserSubscriptionCoursesView,
    InstructorCourseConsentView,
    SubscriptionUsageTrackingView,
    PlanCandidateSuggestionView,
    # Phase 3
    SendExpiryNotificationsView,
    ExpireAndSuspendView,
    ProcessScheduledRemovalsView,
    SchedulePlanCourseRemovalView,
)

urlpatterns = [
    path('subscription-plans/', SubscriptionPlanPublicView.as_view(), name='subscription-plan-list'),
    path('subscription-plans/<int:plan_id>/courses/', PlanCoursesPublicView.as_view(), name='plan-courses'),

    path('subscription-plans/admin/', SubscriptionPlanAdminView.as_view(), name='subscription-plan-admin'),
    path('subscription-plans/admin/<int:plan_id>/', SubscriptionPlanAdminView.as_view(), name='subscription-plan-admin-detail'),
    path('subscription-plans/admin/<int:plan_id>/courses/', PlanCourseAdminView.as_view(), name='plan-course-admin'),
    path('subscription-plans/admin/<int:plan_id>/subscribers/', PlanSubscribersView.as_view(), name='plan-subscribers'),
    path('subscriptions/admin/<int:subscription_id>/extend/', AdminExtendSubscriptionView.as_view(), name='admin-extend-subscription'),
    path('subscriptions/admin/<int:subscription_id>/cancel/', AdminCancelSubscriptionView.as_view(), name='admin-cancel-subscription'),
    path('subscription-plans/admin/<int:plan_id>/candidates/', PlanCandidateSuggestionView.as_view(), name='plan-candidate-suggestions'),
    path('subscription-plans/admin/expire/', ExpireSubscriptionsView.as_view(), name='expire-subscriptions'),

    # Phase 3 — admin cron endpoints
    path('subscriptions/admin/notify-expiry/', SendExpiryNotificationsView.as_view(), name='sub-notify-expiry'),
    path('subscriptions/admin/expire-suspend/', ExpireAndSuspendView.as_view(), name='sub-expire-suspend'),
    path('subscriptions/admin/process-removals/', ProcessScheduledRemovalsView.as_view(), name='sub-process-removals'),
    path('subscription-plans/admin/courses/<int:plan_course_id>/schedule-removal/', SchedulePlanCourseRemovalView.as_view(), name='plan-course-schedule-removal'),

    path('subscriptions/subscribe/', UserSubscribeView.as_view(), name='user-subscribe'),
    path('subscriptions/me/', UserSubscriptionView.as_view(), name='user-subscriptions'),
    path('subscriptions/me/courses/', UserSubscriptionCoursesView.as_view(), name='user-subscription-courses'),
    path('subscriptions/consents/me/', InstructorCourseConsentView.as_view(), name='instructor-course-consents'),
    path('subscriptions/usage/track/', SubscriptionUsageTrackingView.as_view(), name='subscription-usage-track'),
    path('subscriptions/<int:subscription_id>/cancel/', UserCancelSubscriptionView.as_view(), name='user-cancel-subscription'),
    path('subscriptions/access/', UserCourseAccessView.as_view(), name='user-course-access'),
]
