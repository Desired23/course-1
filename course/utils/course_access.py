

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from enrollments.models import Enrollment
from subscription_plans.models import PlanCourse, UserSubscription
from utils.roles import is_active_admin, is_active_instructor


def check_course_access(user, course):


    if is_active_admin(user):
        return None


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
            if _has_active_subscription_for_course(user, course):
                return enrollment

            raise PermissionDenied(
                "Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục học."
            )

        return enrollment


    if _has_active_subscription_for_course(user, course):

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


def get_course_access_info(user, course):

    if is_active_admin(user):
        return {"has_access": True, "access_type": "admin"}

    if is_active_instructor(user):
        if course.instructor_id == user.instructor.id:
            return {"has_access": True, "access_type": "instructor"}


    purchase_enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        source=Enrollment.Source.PURCHASE,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).exists()

    if purchase_enrollment:
        return {"has_access": True, "access_type": "purchase"}


    if _has_active_subscription_for_course(user, course):
        return {"has_access": True, "access_type": "subscription"}


    in_subscription = PlanCourse.objects.filter(
        course=course,
        status='active',
        is_deleted=False,
        plan__status='active',
        plan__is_deleted=False,
    ).exists()

    return {
        "has_access": False,
        "access_type": None,
        "in_subscription": in_subscription,
    }




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
