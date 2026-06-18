

from decimal import Decimal

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from enrollments.models import Enrollment
from subscription_plans.models import PlanCourse, UserSubscription
from utils.roles import is_active_admin, is_active_instructor


def course_requires_payment(course):
    return (getattr(course, 'price', None) or Decimal('0.00')) > Decimal('0.00')


def purchase_enrollment_has_valid_payment(enrollment, course=None):
    course = course or getattr(enrollment, 'course', None)
    if not course_requires_payment(course):
        return True

    payment = getattr(enrollment, 'payment', None)
    if not payment:
        return False

    try:
        from payment_details.models import Payment_Details
        from payments.models import Payment
    except Exception:
        return False

    if payment.is_deleted:
        return False
    if payment.user_id != enrollment.user_id:
        return False
    if payment.payment_type != Payment.PaymentType.COURSE_PURCHASE:
        return False
    if payment.payment_status != Payment.PaymentStatus.COMPLETED:
        return False

    return Payment_Details.objects.filter(
        payment=payment,
        course=course,
        is_deleted=False,
    ).exclude(refund_status=Payment_Details.RefundStatus.SUCCESS).exists()


def payment_covers_course_for_purchase(payment_id, user_id, course):
    if not course_requires_payment(course):
        return True
    if not payment_id:
        return False

    try:
        from payment_details.models import Payment_Details
        from payments.models import Payment
    except Exception:
        return False

    return Payment_Details.objects.filter(
        payment_id=payment_id,
        payment__user_id=user_id,
        payment__payment_type=Payment.PaymentType.COURSE_PURCHASE,
        payment__payment_status=Payment.PaymentStatus.COMPLETED,
        payment__is_deleted=False,
        course=course,
        is_deleted=False,
    ).exclude(refund_status=Payment_Details.RefundStatus.SUCCESS).exists()


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
            if _has_active_subscription_for_course(user, course):
                return enrollment

            raise PermissionDenied(
                "Khóa học này không còn nằm trong gói đăng ký của bạn."
            )

        if enrollment.source == Enrollment.Source.PURCHASE:
            if purchase_enrollment_has_valid_payment(enrollment, course):
                return enrollment

            raise PermissionDenied(
                "KhÃ´ng tÃ¬m tháº¥y thanh toÃ¡n há»£p lá»‡ cho khÃ³a há»c nÃ y."
            )

        return enrollment


    if _has_active_subscription_for_course(user, course):
        # Có gói chứa khóa học nhưng chưa đăng ký: không tự tạo enrollment.
        # Học viên phải bấm "Đăng ký học" để ghi danh trước khi học.
        raise PermissionDenied(
            "Bạn cần đăng ký khóa học này trong gói trước khi bắt đầu học."
        )


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


def course_is_archived(course):
    from courses.models import Course
    return getattr(course, 'status', None) == Course.Status.ARCHIVED


def ensure_course_interaction_allowed(course):
    """Chặn các tương tác học tập/cộng đồng (comment, quiz, review) khi
    khóa học đã được lưu trữ. Học viên cũ vẫn xem được nội dung."""
    if course is not None and course_is_archived(course):
        raise ValidationError(
            "Khóa học đã được lưu trữ và không còn nhận tương tác/hỗ trợ."
        )


def check_lesson_access(user, lesson):

    course = lesson.coursemodule.course if lesson.coursemodule else None
    if not course:
        raise ValidationError({"error": "Lesson không thuộc khóa học nào."})

    if getattr(course, 'is_hard_blocked', False):
        raise PermissionDenied(
            "KhÃ³a há»c Ä‘ang bá»‹ khÃ³a do vi pháº¡m chÃ­nh sÃ¡ch. Vui lÃ²ng liÃªn há»‡ há»— trá»£."
        )

    if lesson.is_free:
        return None

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
    info = get_course_access_info(user, course)
    return bool(info.get('has_access') and not info.get('requires_enrollment'))


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
    ).select_related('payment').first()

    if purchase_enrollment and purchase_enrollment_has_valid_payment(purchase_enrollment, course):
        return {"has_access": True, "access_type": "purchase"}


    sub_enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
        source=Enrollment.Source.SUBSCRIPTION,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).select_related('subscription').first()
    if sub_enrollment and _has_active_subscription_for_course(user, course):
        return {
            "has_access": True,
            "access_type": "subscription",
            "subscription_plan": get_relevant_subscription_plan(user, course),
        }


    if _has_active_subscription_for_course(user, course):
        # Có gói chứa khóa nhưng chưa ghi danh: cần bấm "Đăng ký học" trước khi học.
        return {
            "has_access": True,
            "access_type": "subscription",
            "requires_enrollment": True,
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
