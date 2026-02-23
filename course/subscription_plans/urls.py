from django.urls import path
from .views import (
    SubscriptionPlanPublicView,
    PlanCoursesPublicView,
    SubscriptionPlanAdminView,
    PlanCourseAdminView,
    PlanSubscribersView,
    ExpireSubscriptionsView,
    UserSubscribeView,
    UserSubscriptionView,
    UserCancelSubscriptionView,
    UserCourseAccessView,
)

urlpatterns = [
    path('subscription-plans/', SubscriptionPlanPublicView.as_view(), name='subscription-plan-list'),
    path('subscription-plans/<int:plan_id>/courses/', PlanCoursesPublicView.as_view(), name='plan-courses'),

    path('subscription-plans/admin/', SubscriptionPlanAdminView.as_view(), name='subscription-plan-admin'),
    path('subscription-plans/admin/<int:plan_id>/', SubscriptionPlanAdminView.as_view(), name='subscription-plan-admin-detail'),
    path('subscription-plans/admin/<int:plan_id>/courses/', PlanCourseAdminView.as_view(), name='plan-course-admin'),
    path('subscription-plans/admin/<int:plan_id>/subscribers/', PlanSubscribersView.as_view(), name='plan-subscribers'),
    path('subscription-plans/admin/expire/', ExpireSubscriptionsView.as_view(), name='expire-subscriptions'),

    path('subscriptions/subscribe/', UserSubscribeView.as_view(), name='user-subscribe'),
    path('subscriptions/me/', UserSubscriptionView.as_view(), name='user-subscriptions'),
    path('subscriptions/<int:subscription_id>/cancel/', UserCancelSubscriptionView.as_view(), name='user-cancel-subscription'),
    path('subscriptions/access/', UserCourseAccessView.as_view(), name='user-course-access'),
]
