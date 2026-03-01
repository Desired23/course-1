# utils/course_access.py
"""
Course Access Control - Unified access check for course content.

Logic:
1. Admin / Instructor (owner of course) → ALLOW
2. Enrollment active (mua lẻ) → ALLOW
3. Subscription active chứa course → ALLOW + lazy create enrollment
4. Lesson is_free → ALLOW
5. Không có → DENY
"""

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from enrollments.models import Enrollment
from subscription_plans.models import PlanCourse, UserSubscription


def check_course_access(user, course):
    """
    Check if user has access to a course.
    Returns the enrollment if access is granted, raises PermissionDenied otherwise.
    
    For subscription users, creates a lazy enrollment on first access.
    """
    # 1. Admin always has access
    if hasattr(user, 'admin') and user.admin:
        return None

    # 2. Instructor who owns the course has access
    if hasattr(user, 'instructor') and user.instructor:
        if course.instructor_id == user.instructor.id:
            return None

    # 3. Check existing active enrollment (purchase or subscription)
    enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        status='active',
        is_deleted=False,
    ).first()

    if enrollment:
        # If enrollment is from subscription, verify subscription is still active
        if enrollment.source == Enrollment.Source.SUBSCRIPTION:
            if _has_active_subscription_for_course(user, course):
                return enrollment
            # Subscription expired → soft block (enrollment stays, but no access)
            raise PermissionDenied(
                "Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục học."
            )
        # Purchase enrollment → always valid
        return enrollment

    # 4. Check subscription access (lazy enrollment)
    if _has_active_subscription_for_course(user, course):
        # Get the active subscription
        active_sub = _get_active_subscription_for_course(user, course)
        # Lazy create enrollment
        enrollment = Enrollment.objects.create(
            user=user,
            course=course,
            source=Enrollment.Source.SUBSCRIPTION,
            subscription=active_sub,
            enrollment_date=timezone.now(),
            status=Enrollment.Status.Active,
        )
        return enrollment

    # 5. No access
    raise PermissionDenied(
        "Bạn chưa đăng ký khóa học này. Vui lòng mua khóa học hoặc đăng ký gói subscription."
    )


def check_lesson_access(user, lesson):
    """
    Check if user has access to a specific lesson.
    Free lessons are accessible to everyone.
    """
    # Free lessons are always accessible
    if lesson.is_free:
        return None

    # Get course from lesson → coursemodule → course
    course = lesson.coursemodule.course if lesson.coursemodule else None
    if not course:
        raise ValidationError({"error": "Lesson không thuộc khóa học nào."})

    return check_course_access(user, course)


def has_course_access(user, course):
    """
    Non-raising version - returns True/False.
    """
    try:
        check_course_access(user, course)
        return True
    except PermissionDenied:
        return False


def get_course_access_info(user, course):
    """
    Returns access info for a course (used in course detail API for UX).
    """
    # Admin / Instructor owner
    if hasattr(user, 'admin') and user.admin:
        return {"has_access": True, "access_type": "admin"}
    
    if hasattr(user, 'instructor') and user.instructor:
        if course.instructor_id == user.instructor.id:
            return {"has_access": True, "access_type": "instructor"}

    # Check purchase enrollment
    purchase_enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        source=Enrollment.Source.PURCHASE,
        status='active',
        is_deleted=False,
    ).exists()

    if purchase_enrollment:
        return {"has_access": True, "access_type": "purchase"}

    # Check subscription
    if _has_active_subscription_for_course(user, course):
        return {"has_access": True, "access_type": "subscription"}

    # Check if course is in any active plan (for "Included in Subscription" badge)
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


# ─── Private helpers ───────────────────────────────────────────────

def _has_active_subscription_for_course(user, course):
    """Check if user has any active subscription that includes this course."""
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
    """Get the active subscription that includes this course."""
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
