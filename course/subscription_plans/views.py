from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    create_subscription_plan,
    get_subscription_plan,
    get_all_subscription_plans,
    update_subscription_plan,
    delete_subscription_plan,
    add_course_to_plan,
    remove_course_from_plan,
    get_plan_courses,
    subscribe_to_plan,
    get_user_subscriptions,
    get_user_subscription_detail,
    cancel_subscription,
    admin_extend_subscription,
    admin_cancel_subscription,
    user_has_plan_access,
    get_user_accessible_courses,
    get_plan_subscribers,
    expire_overdue_subscriptions,
    upsert_course_subscription_consent,
    get_instructor_course_consents,
    get_plan_candidate_courses,
    track_subscription_usage,
    # Phase 3
    send_subscription_expiry_notifications,
    expire_subscriptions_and_suspend_enrollments,
    reactivate_subscription_enrollments,
    schedule_plan_course_removal,
    process_scheduled_plan_course_removals,
)
from .serializers import (
    SubscriptionPlanListSerializer,
    PlanCourseSerializer,
    UserSubscriptionListSerializer,
    CourseSubscriptionConsentSerializer,
)
from utils.pagination import paginate_queryset


class SubscriptionPlanPublicView(APIView):
    throttle_scope = 'search'

    def get(self, request):
        try:
            plan_id = request.query_params.get('plan_id')
            if plan_id:
                result = get_subscription_plan(int(plan_id))
                return Response(result, status=status.HTTP_200_OK)
            results = get_all_subscription_plans(include_inactive=False)
            return paginate_queryset(results, request, SubscriptionPlanListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PlanCoursesPublicView(APIView):
    throttle_scope = 'search'

    def get(self, request, plan_id):
        try:
            results = get_plan_courses(plan_id)
            return paginate_queryset(results, request, PlanCourseSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class SubscriptionPlanAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            plan_id = request.query_params.get('plan_id')
            if plan_id:
                result = get_subscription_plan(int(plan_id))
                return Response(result, status=status.HTTP_200_OK)
            results = get_all_subscription_plans(include_inactive=True)
            return paginate_queryset(results, request, SubscriptionPlanListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, plan_id=None):
        try:
            result = create_subscription_plan(request.data, admin_user=request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, plan_id):
        try:
            result = update_subscription_plan(plan_id, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        try:
            result = delete_subscription_plan(plan_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PlanCourseAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, plan_id):
        try:
            course_id = request.data.get('course_id')
            added_reason = request.data.get('added_reason', '')
            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = add_course_to_plan(
                plan_id, course_id,
                admin_user=request.user,
                added_reason=added_reason
            )
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        try:
            course_id = request.data.get('course_id')
            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = remove_course_from_plan(plan_id, course_id, admin_user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class PlanSubscribersView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, plan_id):
        try:
            results = get_plan_subscribers(plan_id)
            return paginate_queryset(results, request, UserSubscriptionListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class AdminExtendSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, subscription_id):
        try:
            extend_days = request.data.get('extend_days')
            result = admin_extend_subscription(subscription_id, extend_days, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class AdminCancelSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, subscription_id):
        try:
            result = admin_cancel_subscription(subscription_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class ExpireSubscriptionsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        result = expire_overdue_subscriptions()
        return Response(result, status=status.HTTP_200_OK)


class UserSubscribeView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            plan_id = request.data.get('plan_id')
            payment_id = request.data.get('payment_id')
            if not plan_id:
                return Response(
                    {"error": "plan_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = subscribe_to_plan(request.user, plan_id, payment_id)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            subscription_id = request.query_params.get('subscription_id')
            if subscription_id:
                result = get_user_subscription_detail(int(subscription_id), request.user)
                return Response(result, status=status.HTTP_200_OK)
            results = get_user_subscriptions(request.user)

            status_filter = request.query_params.get('status')
            search = (request.query_params.get('search') or '').strip()
            sort_by = request.query_params.get('sort_by')

            if status_filter:
                results = results.filter(status=status_filter)
            if search:
                results = results.filter(plan__name__icontains=search)

            if sort_by == 'oldest':
                results = results.order_by('created_at')
            elif sort_by == 'end_date_desc':
                results = results.order_by('-end_date', '-created_at')
            elif sort_by == 'end_date_asc':
                results = results.order_by('end_date', '-created_at')
            else:
                results = results.order_by('-created_at')

            return paginate_queryset(results, request, UserSubscriptionListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class UserCancelSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, subscription_id):
        try:
            result = cancel_subscription(subscription_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserCourseAccessView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            course_id = request.query_params.get('course_id')
            if course_id:
                has_access = user_has_plan_access(request.user.id, int(course_id))
                return Response({"has_access": has_access}, status=status.HTTP_200_OK)
            course_ids = get_user_accessible_courses(request.user)
            return Response({"accessible_course_ids": course_ids}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserSubscriptionCoursesView(APIView):
    """
    GET /subscriptions/me/courses/
    Returns all courses the user can access via active subscriptions,
    with enrollment status (enrolled or not).
    """
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            from .models import PlanCourse

            now = timezone.now()
            search = (request.query_params.get('search') or '').strip()
            results = PlanCourse.objects.filter(
                plan__subscriptions__user=request.user,
                plan__subscriptions__status='active',
                plan__subscriptions__is_deleted=False,
                status='active',
                is_deleted=False,
                plan__is_deleted=False,
                course__is_deleted=False,
            ).filter(
                Q(plan__subscriptions__end_date__isnull=True) |
                Q(plan__subscriptions__end_date__gte=now)
            ).select_related('course', 'course__instructor__user').distinct().order_by('-added_at')

            if search:
                results = results.filter(
                    Q(course__title__icontains=search) |
                    Q(course__instructor__user__full_name__icontains=search)
                )

            return paginate_queryset(results, request, PlanCourseSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorCourseConsentView(APIView):
    permission_classes = [RolePermissionFactory(['instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            consents = get_instructor_course_consents(request.user)
            return paginate_queryset(consents, request, CourseSubscriptionConsentSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            course_id = request.data.get('course_id')
            consent_status = request.data.get('consent_status')
            note = request.data.get('note', '')
            if not course_id or not consent_status:
                return Response(
                    {"error": "course_id và consent_status là bắt buộc."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = upsert_course_subscription_consent(
                request.user,
                int(course_id),
                consent_status,
                note,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class PlanCandidateSuggestionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, plan_id):
        try:
            limit = int(request.query_params.get('limit', 20))
            result = get_plan_candidate_courses(plan_id, limit)
            return Response({"count": len(result), "candidates": result}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionUsageTrackingView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            course_id = request.data.get('course_id')
            usage_type = request.data.get('usage_type', 'course_access')
            consumed_minutes = request.data.get('consumed_minutes', 0)

            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = track_subscription_usage(
                request.user,
                int(course_id),
                usage_type,
                int(consumed_minutes or 0),
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


# ─── Phase 3 Admin Operations ─────────────────────────────────────────────────

class SendExpiryNotificationsView(APIView):
    """
    POST /api/subscriptions/admin/notify-expiry/
    Cron job: gửi thông báo 7d và 3d cho subscription sắp hết hạn.
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        result = send_subscription_expiry_notifications()
        return Response(result, status=status.HTTP_200_OK)


class ExpireAndSuspendView(APIView):
    """
    POST /api/subscriptions/admin/expire-suspend/
    Cron job: expire subscription quá hạn + suspend enrollment.
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        result = expire_subscriptions_and_suspend_enrollments()
        return Response(result, status=status.HTTP_200_OK)


class ProcessScheduledRemovalsView(APIView):
    """
    POST /api/subscriptions/admin/process-removals/
    Cron job: xử lý các PlanCourse đã đến ngày xóa.
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        result = process_scheduled_plan_course_removals()
        return Response(result, status=status.HTTP_200_OK)


class SchedulePlanCourseRemovalView(APIView):
    """
    POST /api/subscription-plans/admin/courses/<plan_course_id>/schedule-removal/
    Lên lịch xóa khóa học khỏi plan sau 7 ngày + thông báo user.
    Body: { reason: str (optional) }
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, plan_course_id):
        try:
            reason = request.data.get('reason', '')
            result = schedule_plan_course_removal(plan_course_id, request.user, reason)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
