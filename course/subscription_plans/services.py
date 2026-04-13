from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.db.models import F, FloatField, ExpressionWrapper
from rest_framework.exceptions import ValidationError
from .models import (
    SubscriptionPlan,
    PlanCourse,
    UserSubscription,
    CourseSubscriptionConsent,
    SubscriptionUsage,
)
from .serializers import (
    SubscriptionPlanSerializer,
    PlanCourseSerializer,
    UserSubscriptionSerializer,
    CourseSubscriptionConsentSerializer,
    SubscriptionUsageSerializer,
)
from courses.models import Course
from activity_logs.services import log_activity
from enrollments.models import Enrollment
from notifications.services import create_notification
from users.preferences import format_datetime_for_user


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
            'yearly_discount_percent': data.get('yearly_discount_percent', 0),
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


def add_course_to_plan(plan_id, course_id, admin_user=None, added_reason=None):
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_deleted=False)
        course = Course.objects.get(id=course_id, is_deleted=False)


        consent = CourseSubscriptionConsent.objects.filter(
            course=course, is_deleted=False
        ).first()
        if not consent or consent.consent_status != CourseSubscriptionConsent.ConsentStatus.OPTED_IN:
            raise ValidationError({
                "error": "Instructor chưa opt-in khóa học này vào plan. "
                         "Instructor phải chấp thuận trước."
            })

        pc, created = PlanCourse.objects.get_or_create(
            plan=plan, course=course,
            defaults={
                'added_by': admin_user,
                'added_reason': added_reason,
                'status': 'active',
            }
        )
        if not created and (pc.is_deleted or pc.status == 'removed'):
            pc.is_deleted = False
            pc.status = 'active'
            pc.added_by = admin_user
            pc.added_reason = added_reason
            pc.removed_at = None
            pc.removed_by = None
            pc.scheduled_removal_at = None
            pc.save()
        elif not created:
            raise ValidationError({"error": "Course already in this plan."})

        log_activity(
            user_id=admin_user.id if admin_user else None,
            action="PLAN_COURSE_ADDED",
            entity_type="PlanCourse",
            entity_id=pc.id,
            description=f"Added course '{course.title}' to plan '{plan.name}'"
        )

        return PlanCourseSerializer(pc).data

    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Subscription plan not found."})
    except Course.DoesNotExist:
        raise ValidationError({"error": "Course not found."})


def remove_course_from_plan(plan_id, course_id, admin_user=None):
    try:
        pc = PlanCourse.objects.get(
            plan_id=plan_id, course_id=course_id, is_deleted=False, status='active'
        )
    except PlanCourse.DoesNotExist:
        raise ValidationError({"error": "Course not found in this plan."})


    result = schedule_plan_course_removal(
        pc.id, admin_user,
        reason="Admin removed course from plan"
    )

    log_activity(
        user_id=admin_user.id if admin_user else None,
        action="PLAN_COURSE_REMOVAL_SCHEDULED",
        entity_type="PlanCourse",
        entity_id=pc.id,
        description=f"Scheduled removal of course from plan (plan_id={plan_id}, course_id={course_id})"
    )

    return result


def get_plan_courses(plan_id):
    pcs = PlanCourse.objects.filter(
        plan_id=plan_id, is_deleted=False, status='active'
    ).select_related('course__instructor__user')
    return pcs


def subscribe_to_plan(user, plan_id, payment_id=None):
    """
    Subscribe user to a plan.
    If payment_id is provided, links the subscription to that payment.
    If not, creates a new payment record for the subscription.
    """
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


    payment = None
    if payment_id:
        from payments.models import Payment
        try:
            payment = Payment.objects.get(id=payment_id, user=user)

            if payment.payment_status != 'completed':
                raise ValidationError({"error": "Thanh toán chưa hoàn tất. Không thể kích hoạt gói."})
        except Payment.DoesNotExist:
            raise ValidationError({"error": "Payment not found."})

    subscription = UserSubscription.objects.create(
        user=user,
        plan=plan,
        payment=payment,
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


    reactivate_subscription_enrollments(subscription)

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
    sub.save(update_fields=['status', 'cancelled_at', 'updated_at'])


    Enrollment.objects.filter(
        subscription=sub,
        status=Enrollment.Status.Active,
        is_deleted=False,
    ).update(status=Enrollment.Status.SUSPENDED)

    log_activity(
        user_id=user.id,
        action="SUBSCRIPTION_CANCELLED",
        entity_type="UserSubscription",
        entity_id=sub.id,
        description=f"Hủy đăng ký gói: {sub.plan.name}"
    )

    _create_notification(
        receiver=user,
        title=f"Gói {sub.plan.name} đã bị hủy",
        message=(
            f"Gói '{sub.plan.name}' của bạn đã bị hủy. "
            f"Tiến trình học được lưu lại, bạn có thể đăng ký lại bất kỳ lúc nào."
        ),
        notification_code='subscription_cancelled',
        related_id=sub.id,
    )

    return UserSubscriptionSerializer(sub).data


@transaction.atomic
def admin_extend_subscription(subscription_id, extend_days, admin_user):
    try:
        extend_days = int(extend_days)
    except (TypeError, ValueError):
        raise ValidationError({"error": "extend_days must be a positive integer."})

    if extend_days <= 0:
        raise ValidationError({"error": "extend_days must be greater than 0."})

    try:
        sub = UserSubscription.objects.select_related('user', 'plan').get(
            id=subscription_id,
            is_deleted=False,
        )
    except UserSubscription.DoesNotExist:
        raise ValidationError({"error": "Subscription not found."})

    now = timezone.now()
    base_end_date = sub.end_date if sub.end_date and sub.end_date > now else now
    sub.end_date = base_end_date + timedelta(days=extend_days)
    sub.status = UserSubscription.Status.ACTIVE
    sub.cancelled_at = None
    sub.save(update_fields=['end_date', 'status', 'cancelled_at', 'updated_at'])

    reactivate_subscription_enrollments(sub)

    log_activity(
        user_id=admin_user.id if admin_user else None,
        action="ADMIN_SUBSCRIPTION_EXTENDED",
        entity_type="UserSubscription",
        entity_id=sub.id,
        description=(
            f"Admin extended subscription {sub.id} for user {sub.user_id} "
            f"by {extend_days} days"
        ),
    )

    return UserSubscriptionSerializer(sub).data


@transaction.atomic
def admin_cancel_subscription(subscription_id, admin_user):
    try:
        sub = UserSubscription.objects.select_related('user', 'plan').get(
            id=subscription_id,
            is_deleted=False,
        )
    except UserSubscription.DoesNotExist:
        raise ValidationError({"error": "Subscription not found."})

    if sub.status == UserSubscription.Status.CANCELLED:
        raise ValidationError({"error": "Subscription is already cancelled."})

    now = timezone.now()
    sub.status = UserSubscription.Status.CANCELLED
    sub.cancelled_at = now
    sub.auto_renew = False
    if sub.end_date is None or sub.end_date > now:
        sub.end_date = now
    sub.save(update_fields=['status', 'cancelled_at', 'auto_renew', 'end_date', 'updated_at'])

    Enrollment.objects.filter(
        subscription=sub,
        status=Enrollment.Status.Active,
        is_deleted=False,
    ).update(status=Enrollment.Status.SUSPENDED)

    log_activity(
        user_id=admin_user.id if admin_user else None,
        action="ADMIN_SUBSCRIPTION_CANCELLED",
        entity_type="UserSubscription",
        entity_id=sub.id,
        description=f"Admin cancelled subscription {sub.id} for user {sub.user_id}",
    )

    _create_notification(
        receiver=sub.user,
        title=f"Goi {sub.plan.name} da bi huy boi quan tri vien",
        message=(
            f"Goi '{sub.plan.name}' cua ban da bi huy ngay lap tuc boi quan tri vien. "
            "Ban co the lien he ho tro neu can them thong tin."
        ),
        notification_code='subscription_cancelled',
        related_id=sub.id,
    )

    return UserSubscriptionSerializer(sub).data


def user_has_plan_access(user_id, course_id):
    now = timezone.now()
    return UserSubscription.objects.filter(
        user_id=user_id,
        status='active',
        is_deleted=False,
        plan__plan_courses__course_id=course_id,
        plan__plan_courses__status='active',
        plan__plan_courses__is_deleted=False,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).exists()


def get_user_accessible_courses(user):
    now = timezone.now()
    active_subs = UserSubscription.objects.filter(
        user=user,
        status='active',
        is_deleted=False,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).values_list('plan_id', flat=True)

    course_ids = PlanCourse.objects.filter(
        plan_id__in=active_subs,
        status='active',
        is_deleted=False,
    ).values_list('course_id', flat=True).distinct()

    return list(course_ids)


def get_plan_subscribers(plan_id):
    subs = UserSubscription.objects.filter(
        plan_id=plan_id, is_deleted=False
    ).select_related('user', 'plan').order_by('-start_date')
    return subs


def expire_overdue_subscriptions():
    """
    Legacy cron — đã được thay thế bởi expire_subscriptions_and_suspend_enrollments().
    Giữ lại để backward-compat, nhưng delegate sang hàm mới.
    """
    return expire_subscriptions_and_suspend_enrollments()


def upsert_course_subscription_consent(user, course_id, consent_status, note=''):
    if not hasattr(user, 'instructor') or not user.instructor:
        raise ValidationError({"error": "Chỉ instructor mới có thể thiết lập consent."})

    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
    except Course.DoesNotExist:
        raise ValidationError({"error": "Course not found."})

    if course.instructor_id != user.instructor.id:
        raise ValidationError({"error": "Bạn không sở hữu khóa học này."})

    if consent_status not in [
        CourseSubscriptionConsent.ConsentStatus.OPTED_IN,
        CourseSubscriptionConsent.ConsentStatus.OPTED_OUT,
    ]:
        raise ValidationError({"error": "consent_status không hợp lệ."})

    old_consent = CourseSubscriptionConsent.objects.filter(course=course).first()
    was_opted_in = old_consent and old_consent.consent_status == CourseSubscriptionConsent.ConsentStatus.OPTED_IN

    consent, _ = CourseSubscriptionConsent.objects.update_or_create(
        course=course,
        defaults={
            'instructor': user.instructor,
            'consent_status': consent_status,
            'note': note,
            'is_deleted': False,
        }
    )

    log_activity(
        user_id=user.id,
        action="SUBSCRIPTION_CONSENT_UPDATED",
        entity_type="CourseSubscriptionConsent",
        entity_id=consent.id,
        description=f"Course {course.id} consent set to {consent_status}"
    )


    if consent_status == CourseSubscriptionConsent.ConsentStatus.OPTED_OUT:
        active_plan_courses = PlanCourse.objects.filter(
            course=course,
            status=PlanCourse.Status.ACTIVE,
            is_deleted=False,
            scheduled_removal_at__isnull=True,
        )
        for pc in active_plan_courses:
            schedule_plan_course_removal(
                pc.id, user,
                reason=f"Instructor opt-out: {note or 'không có lý do'}"
            )

    return CourseSubscriptionConsentSerializer(consent).data


def get_instructor_course_consents(user):
    if not hasattr(user, 'instructor') or not user.instructor:
        raise ValidationError({"error": "Chỉ instructor mới có thể xem consent."})

    return CourseSubscriptionConsent.objects.filter(
        instructor=user,
        is_deleted=False,
        course__is_deleted=False,
    ).select_related('course').order_by('-consented_at')


def get_plan_candidate_courses(plan_id, limit=20):
    try:
        SubscriptionPlan.objects.get(id=plan_id, is_deleted=False)
    except SubscriptionPlan.DoesNotExist:
        raise ValidationError({"error": "Plan not found."})

    active_course_ids = PlanCourse.objects.filter(
        plan_id=plan_id,
        status='active',
        is_deleted=False,
    ).values_list('course_id', flat=True)

    candidates = Course.objects.filter(
        is_deleted=False,
        status='published',
        is_public=True,
        subscription_consent__consent_status=CourseSubscriptionConsent.ConsentStatus.OPTED_IN,
        subscription_consent__is_deleted=False,
    ).exclude(
        id__in=active_course_ids
    ).annotate(
        suggestion_score=ExpressionWrapper(
            F('rating') * Decimal('10.0') +
            F('total_students') * Decimal('0.1') +
            F('total_reviews') * Decimal('0.2'),
            output_field=FloatField()
        )
    ).order_by('-suggestion_score', '-updated_at')[:limit]

    result = []
    for course in candidates:
        result.append({
            'course_id': course.id,
            'title': course.title,
            'rating': float(course.rating or 0),
            'total_students': course.total_students,
            'total_reviews': course.total_reviews,
            'suggestion_score': float(course.suggestion_score or 0),
        })
    return result


def track_subscription_usage(user, course_id, usage_type='course_access', consumed_minutes=0):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
    except Course.DoesNotExist:
        raise ValidationError({"error": "Course not found."})

    now = timezone.now()
    active_subscription = UserSubscription.objects.filter(
        user=user,
        status='active',
        is_deleted=False,
        plan__plan_courses__course=course,
        plan__plan_courses__status='active',
        plan__plan_courses__is_deleted=False,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).select_related('plan').first()

    if not active_subscription:
        raise ValidationError({"error": "User does not have active subscription access for this course."})

    if usage_type not in [
        SubscriptionUsage.UsageType.COURSE_ACCESS,
        SubscriptionUsage.UsageType.LESSON_ACCESS,
    ]:
        raise ValidationError({"error": "usage_type không hợp lệ."})

    enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        is_deleted=False,
    ).first()

    usage, created = SubscriptionUsage.objects.get_or_create(
        user_subscription=active_subscription,
        user=user,
        course=course,
        usage_type=usage_type,
        usage_date=now.date(),
        defaults={
            'enrollment': enrollment,
            'consumed_minutes': max(int(consumed_minutes or 0), 0),
            'access_count': 1,
        }
    )

    if not created:
        usage.access_count += 1
        usage.consumed_minutes += max(int(consumed_minutes or 0), 0)
        if usage.enrollment_id is None and enrollment:
            usage.enrollment = enrollment
        usage.save(update_fields=['access_count', 'consumed_minutes', 'enrollment', 'last_accessed_at'])

    return SubscriptionUsageSerializer(usage).data






def _create_notification(receiver, title, message, notification_code, related_id=None):
    """Helper: tạo Notification cho user."""
    create_notification(
        receiver_id=receiver.id,
        title=title,
        message=message,
        type='payment',
        related_id=related_id,
        notification_code=notification_code,
    )


def send_subscription_expiry_notifications():
    """
    Cron job hàng ngày:
    - Gửi thông báo 7 ngày trước khi subscription hết hạn (notified_7d)
    - Gửi thông báo 3 ngày trước khi subscription hết hạn (notified_3d)
    Đánh dấu flag để không gửi trùng.
    Trả về số lượng thông báo đã gửi.
    """
    now = timezone.now()
    sent = {'7d': 0, '3d': 0}


    window_7d_start = now + timedelta(days=6, hours=23)
    window_7d_end = now + timedelta(days=7, hours=1)
    subs_7d = UserSubscription.objects.filter(
        status=UserSubscription.Status.ACTIVE,
        end_date__gte=window_7d_start,
        end_date__lte=window_7d_end,
        notified_7d=False,
        is_deleted=False,
    ).select_related('user', 'plan')

    for sub in subs_7d:
        _create_notification(
            receiver=sub.user,
            title=f"Gói {sub.plan.name} sắp hết hạn",
            message=(
                f"Gói đăng ký '{sub.plan.name}' của bạn sẽ hết hạn vào "
                f"{format_datetime_for_user(sub.user_id, sub.end_date)}. "
                f"Hãy gia hạn để tiếp tục truy cập các khóa học trong gói."
            ),
            notification_code='subscription_expiry_7d',
            related_id=sub.id,
        )
        sub.notified_7d = True
        sub.save(update_fields=['notified_7d'])
        sent['7d'] += 1


    window_3d_start = now + timedelta(days=2, hours=23)
    window_3d_end = now + timedelta(days=3, hours=1)
    subs_3d = UserSubscription.objects.filter(
        status=UserSubscription.Status.ACTIVE,
        end_date__gte=window_3d_start,
        end_date__lte=window_3d_end,
        notified_3d=False,
        is_deleted=False,
    ).select_related('user', 'plan')

    for sub in subs_3d:
        _create_notification(
            receiver=sub.user,
            title=f"Gói {sub.plan.name} còn 3 ngày nữa hết hạn",
            message=(
                f"Chỉ còn 3 ngày! Gói '{sub.plan.name}' của bạn sẽ hết hạn vào "
                f"{format_datetime_for_user(sub.user_id, sub.end_date)}. "
                f"Sau khi hết hạn, bạn sẽ không còn truy cập được các khóa học trong gói."
            ),
            notification_code='subscription_expiry_3d',
            related_id=sub.id,
        )
        sub.notified_3d = True
        sub.save(update_fields=['notified_3d'])
        sent['3d'] += 1

    return {
        "notified_7d": sent['7d'],
        "notified_3d": sent['3d'],
    }


def expire_subscriptions_and_suspend_enrollments():
    """
    Cron job hàng ngày:
    - Chuyển các UserSubscription đã quá end_date → status='expired'
    - Chuyển các Enrollment liên kết với sub đó → status='suspended'
    Trả về số lượng sub và enrollment đã xử lý.
    """
    now = timezone.now()
    expired_ids = []
    suspended_count = 0

    overdue_subs = UserSubscription.objects.filter(
        status=UserSubscription.Status.ACTIVE,
        end_date__lt=now,
        is_deleted=False,
    ).select_related('user', 'plan')

    with transaction.atomic():
        for sub in overdue_subs:
            sub.status = UserSubscription.Status.EXPIRED
            sub.save(update_fields=['status', 'updated_at'])
            expired_ids.append(sub.id)


            count = Enrollment.objects.filter(
                subscription=sub,
                status=Enrollment.Status.Active,
                is_deleted=False,
            ).update(status=Enrollment.Status.SUSPENDED)
            suspended_count += count


            _create_notification(
                receiver=sub.user,
                title=f"Gói {sub.plan.name} đã hết hạn",
                message=(
                    f"Gói đăng ký '{sub.plan.name}' của bạn đã hết hạn. "
                    f"Các khóa học trong gói tạm thời bị khóa. "
                    f"Gia hạn để tiếp tục học với toàn bộ tiến trình cũ."
                ),
                notification_code='subscription_expired',
                related_id=sub.id,
            )

    return {
        "expired_subscriptions": len(expired_ids),
        "suspended_enrollments": suspended_count,
    }


def reactivate_subscription_enrollments(new_subscription: UserSubscription):
    """
    Sau khi user gia hạn thành công (Payment webhook tạo UserSubscription mới):
    - Tìm Enrollment 'suspended' của user với các course trong plan mới
    - Reactivate bằng cách set status='active' + gán subscription mới
    """
    plan_course_ids = list(
        PlanCourse.objects.filter(
            plan=new_subscription.plan,
            status=PlanCourse.Status.ACTIVE,
            is_deleted=False,
        ).values_list('course_id', flat=True)
    )

    update_kwargs = {
        'status': Enrollment.Status.Active,
        'subscription': new_subscription,
    }

    if new_subscription.end_date is not None:
        update_kwargs['expiry_date'] = new_subscription.end_date

    reactivated = Enrollment.objects.filter(
        user=new_subscription.user,
        course_id__in=plan_course_ids,
        status=Enrollment.Status.SUSPENDED,
        is_deleted=False,
    ).update(**update_kwargs)


    end_label = (
        new_subscription.end_date.strftime('%d/%m/%Y')
        if new_subscription.end_date
        else 'vĩnh viễn'
    )
    _create_notification(
        receiver=new_subscription.user,
        title=f"Gia hạn gói {new_subscription.plan.name} thành công",
        message=(
            f"Gói '{new_subscription.plan.name}' đã được gia hạn thành công đến "
            f"{end_label}. "
            f"Toàn bộ tiến trình học của bạn được giữ nguyên."
        ),
        notification_code='subscription_renewed',
        related_id=new_subscription.id,
    )

    return {"reactivated_enrollments": reactivated}


def schedule_plan_course_removal(plan_course_id: int, admin_user, reason: str = ''):
    """
    Đặt lịch xóa khóa học khỏi plan sau 7 ngày + thông báo cho tất cả user
    đang sử dụng gói có khóa học này.
    """
    try:
        plan_course = PlanCourse.objects.select_related('plan', 'course').get(
            id=plan_course_id,
            status=PlanCourse.Status.ACTIVE,
            is_deleted=False,
            scheduled_removal_at__isnull=True,
        )
    except PlanCourse.DoesNotExist:
        raise ValidationError("Không tìm thấy PlanCourse hoặc đã được lên lịch xóa.")

    removal_date = timezone.now() + timedelta(days=7)
    plan_course.scheduled_removal_at = removal_date
    if reason:
        plan_course.added_reason = reason
    plan_course.save(update_fields=['scheduled_removal_at', 'added_reason'])


    active_users = (
        UserSubscription.objects
        .filter(plan=plan_course.plan, status=UserSubscription.Status.ACTIVE, is_deleted=False)
        .select_related('user')
        .distinct()
    )

    notified = 0
    for sub in active_users:
        _create_notification(
            receiver=sub.user,
            title=f"Khóa học '{plan_course.course.title}' sắp bị xóa khỏi gói",
            message=(
                f"Khóa học '{plan_course.course.title}' sẽ bị xóa khỏi gói "
                f"'{plan_course.plan.name}' vào ngày "
                f"{removal_date.strftime('%d/%m/%Y')}. "
                f"Hãy hoàn thành các bài học trước ngày đó."
            ),
            notification_code='plan_course_removal_scheduled',
            related_id=plan_course.id,
        )
        notified += 1

    return {
        "plan_course_id": plan_course_id,
        "course_title": plan_course.course.title,
        "scheduled_removal_at": removal_date.isoformat(),
        "users_notified": notified,
    }


def process_scheduled_plan_course_removals():
    """
    Cron job hàng ngày:
    Xử lý các PlanCourse có scheduled_removal_at đã qua → set status='removed'.
    """
    now = timezone.now()
    due = PlanCourse.objects.filter(
        status=PlanCourse.Status.ACTIVE,
        scheduled_removal_at__lte=now,
        is_deleted=False,
    ).select_related('plan', 'course')

    removed = 0
    with transaction.atomic():
        for pc in due:
            pc.status = PlanCourse.Status.REMOVED
            pc.removed_at = now
            pc.save(update_fields=['status', 'removed_at'])
            removed += 1

    return {"removed_courses": removed}
