

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from enrollments.models import Enrollment
from subscription_plans.models import PlanCourse, UserSubscription
from utils.roles import is_active_admin, is_active_instructor


def check_course_access(user, course):


    if is_active_admin(user):
        return None

    if getattr(course, 'is_hard_blocked', False):
        raise PermissionDenied(
            "Khóa học đang bị khóa do vi phạm chính sách. Vui lòng liên hệ hỗ trợ."
        )


    if is_active_instructor(user):
        if course.instructor_id == user.instructor.id:
            return None


    enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).first()

    if enrollment:

        if enrollment.source == Enrollment.Source.SUBSCRIPTION:
            if _subscription_still_valid(enrollment.subscription) or _has_active_subscription_for_course(user, course):
                return enrollment

            raise PermissionDenied(
                "Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục học."
            )

        return enrollment


    if _has_active_subscription_for_course(user, course):
        from courses.models import Course
        if course.status != Course.Status.PUBLISHED or course.admin_hidden:
            raise PermissionDenied(
                "Khóa học đã ngừng nhận học viên mới."
            )

        active_sub = _get_active_subscription_for_course(user, course)

        enrollment = Enrollment.objects.create(
            user=user,
            course=course,
            source=Enrollment.Source.SUBSCRIPTION,
            subscription=active_sub,
            enrollment_date=timezone.now(),
            status=Enrollment.Status.Active,
        )
        return enrollment


    raise PermissionDenied(
        "Bạn chưa đăng ký khóa học này. Vui lòng mua khóa học hoặc đăng ký gói subscription."
    )


def course_not_buyable_reason(course):
    from courses.models import Course
    if course is None or course.is_deleted:
        return "Khóa học không còn khả dụng."
    if getattr(course, 'is_hard_blocked', False):
        return "Khóa học đang bị khóa do vi phạm chính sách."
    if getattr(course, 'admin_hidden', False):
        return "Khóa học hiện không còn được bán."
    if course.status != Course.Status.PUBLISHED or not course.is_public:
        return "Khóa học hiện không mở bán."
    instructor = course.instructor
    if not instructor or instructor.is_deleted:
        return "Khóa học hiện không còn được bán."
    instructor_user = getattr(instructor, 'user', None)
    if instructor_user is not None and instructor_user.status != 'active':
        return "Giảng viên của khóa học hiện không hoạt động."
    return None


def is_course_buyable(course):
    return course_not_buyable_reason(course) is None


def check_lesson_access(user, lesson):

    if lesson.is_free:
        return None


    course = lesson.coursemodule.course if lesson.coursemodule else None
    if not course:
        raise ValidationError({"error": "Lesson không thuộc khóa học nào."})

    return check_course_access(user, course)


def has_course_access(user, course):
    try:
        check_course_access(user, course)
        return True
    except PermissionDenied:
        return False


def has_existing_course_access(user, course):
    if not user:
        return False
    return bool(get_course_access_info(user, course).get('has_access'))


def get_course_access_info(user, course):

    if is_active_admin(user):
        return {"has_access": True, "access_type": "admin"}

    if is_active_instructor(user):
        if course.instructor_id == user.instructor.id:
            return {"has_access": True, "access_type": "instructor"}

    if getattr(course, 'is_hard_blocked', False):
        return {"has_access": False, "access_type": None, "hard_blocked": True}


    purchase_enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        source=Enrollment.Source.PURCHASE,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).exists()

    if purchase_enrollment:
        return {"has_access": True, "access_type": "purchase"}


    sub_enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        source=Enrollment.Source.SUBSCRIPTION,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).select_related('subscription').first()
    if sub_enrollment and _subscription_still_valid(sub_enrollment.subscription):
        return {
            "has_access": True,
            "access_type": "subscription",
            "subscription_plan": get_relevant_subscription_plan(user, course),
        }


    if _has_active_subscription_for_course(user, course):
        return {
            "has_access": True,
            "access_type": "subscription",
            "subscription_plan": get_relevant_subscription_plan(user, course),
        }


    relevant_plan = get_relevant_subscription_plan(user, course)

    return {
        "has_access": False,
        "access_type": None,
        "in_subscription": relevant_plan is not None,
        "subscription_plan": relevant_plan,
    }




def get_relevant_subscription_plan(user, course):
    """Trả về plan liên quan nhất chứa khóa học (ưu tiên plan user đang sở hữu,
    nếu không thì plan rẻ nhất). Trả None nếu khóa học không nằm trong plan nào."""
    from django.db.models import Q

    plans = [
        pc.plan for pc in PlanCourse.objects.filter(
            course=course,
            status='active',
            is_deleted=False,
            plan__status='active',
            plan__is_deleted=False,
        ).select_related('plan')
    ]
    if not plans:
        return None

    owned_plan_ids = set()
    if user:
        now = timezone.now()
        owned_plan_ids = set(
            UserSubscription.objects.filter(
                user=user, status='active', is_deleted=False,
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=now)
            ).values_list('plan_id', flat=True)
        )

    owned = [p for p in plans if p.id in owned_plan_ids]
    chosen = owned[0] if owned else min(plans, key=lambda p: p.effective_price)

    return {
        "id": chosen.id,
        "name": chosen.name,
        "price": str(chosen.effective_price),
        "owned": chosen.id in owned_plan_ids,
    }


def _subscription_still_valid(subscription):
    if not subscription:
        return False
    if subscription.is_deleted or subscription.status != 'active':
        return False
    return subscription.end_date is None or subscription.end_date >= timezone.now()


def _has_active_subscription_for_course(user, course):
    now = timezone.now()
    from django.db.models import Q

    return UserSubscription.objects.filter(
        user=user,
        status='active',
        is_deleted=False,
        plan__plan_courses__course=course,
        plan__plan_courses__status='active',
        plan__plan_courses__is_deleted=False,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).exists()


def _get_active_subscription_for_course(user, course):
    now = timezone.now()
    from django.db.models import Q

    return UserSubscription.objects.filter(
        user=user,
        status='active',
        is_deleted=False,
        plan__plan_courses__course=course,
        plan__plan_courses__status='active',
        plan__plan_courses__is_deleted=False,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).select_related('plan').first()
