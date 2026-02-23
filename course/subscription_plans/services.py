from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import SubscriptionPlan, PlanCourse, UserSubscription
from .serializers import (
    SubscriptionPlanSerializer,
    PlanCourseSerializer,
    UserSubscriptionSerializer,
)
from courses.models import Course
from activity_logs.services import log_activity


def create_subscription_plan(data, admin_user=None):
    try:
        plan_data = {
            'name': data.get('name'),
            'description': data.get('description', ''),
            'price': data.get('price'),
            'discount_price': data.get('discount_price'),
            'duration_type': data.get('duration_type', 'monthly'),
            'duration_days': data.get('duration_days', 30),
            'status': data.get('status', 'active'),
            'is_featured': data.get('is_featured', False),
            'max_subscribers': data.get('max_subscribers'),
            'instructor_share_percent': data.get('instructor_share_percent', 60),
            'thumbnail': data.get('thumbnail'),
        }
        if admin_user:
            plan_data['created_by'] = admin_user.id

        serializer = SubscriptionPlanSerializer(data=plan_data)
        if serializer.is_valid(raise_exception=True):
            plan = serializer.save()

            course_ids = data.get('course_ids', [])
            for cid in course_ids:
                try:
                    course = Course.objects.get(id=cid, is_deleted=False)
                    PlanCourse.objects.create(
                        plan=plan, course=course,
                        added_by=admin_user
                    )
                except Course.DoesNotExist:
                    pass

            return SubscriptionPlanSerializer(plan).data

    except Exception as e:
        raise ValidationError({"error": str(e)})


def get_subscription_plan(plan_id):
    try:
        plan = SubscriptionPlan.objects.prefetch_related(
            'plan_courses__course__instructor__user'
        ).get(id=plan_id, is_deleted=False)
        return SubscriptionPlanSerializer(plan).data
    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Subscription plan not found."})


def get_all_subscription_plans(include_inactive=False):
    qs = SubscriptionPlan.objects.prefetch_related(
        'plan_courses'
    ).filter(is_deleted=False)
    if not include_inactive:
        qs = qs.filter(status='active')
    return qs


def update_subscription_plan(plan_id, data):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_deleted=False)
        serializer = SubscriptionPlanSerializer(plan, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return SubscriptionPlanSerializer(plan).data
    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Subscription plan not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def delete_subscription_plan(plan_id):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_deleted=False)
        plan.is_deleted = True
        plan.deleted_at = timezone.now()
        plan.save()
        return {"message": "Subscription plan deleted successfully."}
    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Subscription plan not found."})


def add_course_to_plan(plan_id, course_id, admin_user=None):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_deleted=False)
        course = Course.objects.get(id=course_id, is_deleted=False)

        pc, created = PlanCourse.objects.get_or_create(
            plan=plan, course=course,
            defaults={'added_by': admin_user}
        )
        if not created and pc.is_deleted:
            pc.is_deleted = False
            pc.added_by = admin_user
            pc.save()
        elif not created:
            raise ValidationError({"error": "Course already in this plan."})

        return PlanCourseSerializer(pc).data

    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Subscription plan not found."})
    except Course.DoesNotExist:
        raise ValidationError({"error": "Course not found."})


def remove_course_from_plan(plan_id, course_id):
    try:
        pc = PlanCourse.objects.get(
            plan_id=plan_id, course_id=course_id, is_deleted=False
        )
        pc.is_deleted = True
        pc.save()
        return {"message": "Course removed from plan successfully."}
    except PlanCourse.DoesNotExist:
        raise ValidationError({"error": "Course not found in this plan."})


def get_plan_courses(plan_id):
    pcs = PlanCourse.objects.filter(
        plan_id=plan_id, is_deleted=False
    ).select_related('course__instructor__user')
    return pcs


def subscribe_to_plan(user, plan_id, payment_id=None):
    try:
        plan = SubscriptionPlan.objects.get(
            id=plan_id, status='active', is_deleted=False
        )
    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Plan not found or inactive."})

    if plan.max_subscribers:
        if plan.current_subscribers >= plan.max_subscribers:
            raise ValidationError({"error": "This plan has reached its maximum subscriber limit."})

    existing = UserSubscription.objects.filter(
        user=user, plan=plan, status='active', is_deleted=False
    ).first()
    if existing and existing.is_active:
        raise ValidationError({
            "error": "You already have an active subscription to this plan.",
            "subscription_id": existing.id,
        })

    now = timezone.now()
    end_date = None
    if plan.duration_days > 0:
        end_date = now + timedelta(days=plan.duration_days)

    subscription = UserSubscription.objects.create(
        user=user,
        plan=plan,
        payment_id=payment_id,
        start_date=now,
        end_date=end_date,
        status='active',
    )

    log_activity(
        user_id=user.id,
        action="SUBSCRIPTION_CREATED",
        entity_type="UserSubscription",
        entity_id=subscription.id,
        description=f"Đăng ký gói: {plan.name}"
    )

    return UserSubscriptionSerializer(subscription).data


def get_user_subscriptions(user):
    subs = UserSubscription.objects.filter(
        user=user, is_deleted=False
    ).select_related('plan').order_by('-start_date')
    return subs


def get_user_subscription_detail(subscription_id, user):
    try:
        sub = UserSubscription.objects.select_related(
            'plan'
        ).prefetch_related(
            'plan__plan_courses__course'
        ).get(id=subscription_id, user=user, is_deleted=False)
        return UserSubscriptionSerializer(sub).data
    except UserSubscription.DoesNotExist:
        raise ValidationError({"error": "Subscription not found."})


def cancel_subscription(subscription_id, user):
    try:
        sub = UserSubscription.objects.get(
            id=subscription_id, user=user,
            status='active', is_deleted=False
        )
    except UserSubscription.DoesNotExist:
        raise ValidationError({"error": "Active subscription not found."})

    sub.status = 'cancelled'
    sub.cancelled_at = timezone.now()
    sub.save()

    log_activity(
        user_id=user.id,
        action="SUBSCRIPTION_CANCELLED",
        entity_type="UserSubscription",
        entity_id=sub.id,
        description=f"Hủy đăng ký gói: {sub.plan.name}"
    )

    return UserSubscriptionSerializer(sub).data


def user_has_plan_access(user_id, course_id):
    now = timezone.now()
    return UserSubscription.objects.filter(
        user_id=user_id,
        status='active',
        is_deleted=False,
        plan__plan_courses__course_id=course_id,
        plan__plan_courses__is_deleted=False,
    ).filter(
        models_q_active(now)
    ).exists()


def models_q_active(now):
    from django.db.models import Q
    return Q(end_date__isnull=True) | Q(end_date__gte=now)


def get_user_accessible_courses(user):
    now = timezone.now()
    active_subs = UserSubscription.objects.filter(
        user=user,
        status='active',
        is_deleted=False,
    ).filter(
        models_q_active(now)
    ).values_list('plan_id', flat=True)

    course_ids = PlanCourse.objects.filter(
        plan_id__in=active_subs,
        is_deleted=False,
    ).values_list('course_id', flat=True).distinct()

    return list(course_ids)


def get_plan_subscribers(plan_id):
    subs = UserSubscription.objects.filter(
        plan_id=plan_id, is_deleted=False
    ).select_related('user', 'plan').order_by('-start_date')
    return subs


def expire_overdue_subscriptions():
    now = timezone.now()
    expired = UserSubscription.objects.filter(
        status='active',
        end_date__lt=now,
        end_date__isnull=False,
        is_deleted=False,
    )
    count = expired.update(status='expired')
    return {"expired_count": count}
