import json
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .serializers import PaymentSerializer, PaymentCreateSerializer
from .models import Payment
from promotions.models import Promotion
from courses.models import Course
from enrollments.models import Enrollment
from payment_details.serializers import PaymentDetailSerializer
from decimal import Decimal
from django.utils import timezone
from .utils import generate_unique_transaction_id
from activity_logs.services import log_activity
from instructor_earnings.services import generate_instructor_earnings_from_payment
from payment_details.models import Payment_Details
from systems_settings.models import SystemsSetting
from datetime import timedelta


PAYMENT_ADMIN_CONFIGS = {
    'policies': {
        'setting_key': 'payment_policies',
        'description': 'Payment management policies configuration',
        'default_value': [],
    },
    'instructor-rates': {
        'setting_key': 'instructor_rates',
        'description': 'Payment management instructor rates configuration',
        'default_value': [],
    },
    'discounts': {
        'setting_key': 'discount_rules',
        'description': 'Payment management discount rules configuration',
        'default_value': [],
    },
    'refund-settings': {
        'setting_key': 'refund_settings',
        'description': 'Refund workflow settings',
        'default_value': {
            'refund_mode': 'admin_approval',
            'refund_retry_cooldown_minutes': 30,
            'refund_max_retry_count': 3,
            'refund_timeout_seconds': 15,
            'allow_admin_override_refund_status': True,
            'allow_admin_soft_delete_refund': True,
        },
    },
}


def create_payment(payment_data):
    # Khóa mốc thời gian ngay khi bắt đầu để tránh độ trễ ảnh hưởng tính giá
    payment_time = timezone.now()
    try:
        with transaction.atomic():
            user_id = payment_data.get("user_id")
            payment_method = payment_data.get("payment_method")
            payment_type = payment_data.get("payment_type", "course_purchase")
            payment_detail_input = payment_data.get("payment_details", [])
            promotion_id = payment_data.get("promotion_id")  # ADMIN-level promotion
            billing_cycle = str(payment_data.get("billing_cycle", "monthly")).lower()

            # Subscription payments cannot use promotions
            if payment_type == "subscription":
                if promotion_id:
                    raise ValidationError("Thanh toán gói subscription không được áp dụng mã giảm giá.")
                for item in (payment_detail_input or []):
                    if item.get("promotion_id"):
                        raise ValidationError("Thanh toán gói subscription không được áp dụng mã giảm giá.")
                if billing_cycle not in ["monthly", "yearly"]:
                    raise ValidationError("billing_cycle phải là 'monthly' hoặc 'yearly' cho thanh toán subscription.")
            elif not payment_detail_input:
                raise ValidationError("Thiếu thông tin chi tiết thanh toán.")

            courses_detail = []

            total_discount = Decimal("0.0")
            total_original = Decimal("0.0")
            payment_detail_arr = []

            if payment_type == "subscription":
                from subscription_plans.models import SubscriptionPlan
                subscription_plan_id = payment_data.get("subscription_plan_id")
                if not subscription_plan_id:
                    raise ValidationError("subscription_plan_id là bắt buộc cho thanh toán subscription.")

                try:
                    plan = SubscriptionPlan.objects.get(
                        id=subscription_plan_id,
                        status=SubscriptionPlan.Status.ACTIVE,
                        is_deleted=False,
                    )
                except SubscriptionPlan.DoesNotExist:
                    raise ValidationError("Gói subscription không tồn tại hoặc không khả dụng.")

                base_monthly_price = Decimal(plan.discount_price if plan.discount_price else plan.price)
                if billing_cycle == "yearly":
                    yearly_discount_percent = Decimal(plan.yearly_discount_percent or Decimal("0.00"))
                    total_original = base_monthly_price * Decimal("12")
                    total_discount = (total_original * yearly_discount_percent / Decimal("100")).quantize(Decimal("0.00"))
                    total_amount = total_original - total_discount
                else:
                    total_original = base_monthly_price
                    total_discount = Decimal("0.00")
                    total_amount = total_original
            else:
                # Tính chi tiết từng khóa học
                for item in payment_detail_input:
                    course_id = item.get("course_id")
                    detail_promotion_id = item.get("promotion_id")
                    if not course_id:
                        raise ValidationError("Thiếu course_id trong chi tiết thanh toán.")

                    try:
                        course = Course.objects.get(id=course_id)
                    except Course.DoesNotExist:
                        raise ValidationError(f"Course ID {course_id} không tồn tại.")

                    # Kiểm tra user đã sở hữu khóa học chưa (đã enroll active/complete)
                    already_enrolled = Enrollment.objects.filter(
                        user_id=user_id,
                        course_id=course_id,
                        is_deleted=False,
                        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete]
                    ).exists()
                    if already_enrolled:
                        raise ValidationError(
                            f"Bạn đã sở hữu khóa học '{course.title}'. Không thể mua lại."
                        )

                    courses_detail.append(course)

                    # Tính giá thực tế: ưu tiên discount_price nếu đang trong thời gian giảm giá
                    original_price = Decimal(course.price)
                    if (
                        course.discount_price
                        and Decimal(course.discount_price) > 0
                        and course.discount_start_date
                        and course.discount_end_date
                        and course.discount_start_date <= payment_time <= course.discount_end_date
                    ):
                        price = Decimal(course.discount_price)
                    else:
                        price = original_price
                    discount = Decimal("0.0")

                    # Áp dụng promotion của instructor (nếu có)
                    if detail_promotion_id:
                        try:
                            promotion = Promotion.objects.get(id=detail_promotion_id)

                            if not promotion.instructor:
                                raise ValidationError(f"Mã giảm giá ID {detail_promotion_id} không áp dụng cho từng khóa học.")
                            if promotion.status != Promotion.StatusChoices.ACTIVE:
                                raise ValidationError(f"Khuyến mãi ID {detail_promotion_id} không hoạt động.")
                            if promotion.start_date and promotion.end_date:
                                if not (promotion.start_date <= payment_time <= promotion.end_date):
                                    raise ValidationError(f"Khuyến mãi ID {detail_promotion_id} đã hết hạn.")
                            if promotion.usage_limit and promotion.used_count >= promotion.usage_limit:
                                raise ValidationError(f"Khuyến mãi ID {detail_promotion_id} đã hết lượt sử dụng.")

                            # kiểm tra hợp lệ
                            course_valid = promotion.applicable_courses.filter(pk=course.pk).exists()

                            if not (course_valid):
                                raise ValidationError(
                                    f"Khuyến mãi ID {promotion.id} không áp dụng cho khóa học {course.title}"
                                )
                            # Tính discount
                            if promotion.discount_type == Promotion.DiscountTypeChoices.PERCENTAGE:
                                discount = price * Decimal(promotion.discount_value) / 100
                            elif promotion.discount_type == Promotion.DiscountTypeChoices.FIXED_AMOUNT:
                                discount = Decimal(promotion.discount_value)

                            if promotion.max_discount and discount > promotion.max_discount:
                                discount = promotion.max_discount

                        except Promotion.DoesNotExist:
                            raise ValidationError(f"Khuyến mãi ID {detail_promotion_id} không tồn tại.")

                    final_price = price - discount
                    total_original += price
                    total_discount += discount

                    payment_detail_arr.append({
                        "course": course.id,
                        "price": price,
                        "discount": discount,
                        "final_price": final_price,
                        "promotion": detail_promotion_id
                    })

            # Áp dụng promotion cho toàn đơn hàng nếu có (admin-level)
            admin_discount = Decimal("0.0")
            if promotion_id:
                try:
                    promotion = Promotion.objects.get(id=promotion_id)

                    if not promotion.admin:
                        raise ValidationError("Mã giảm giá không hợp lệ (chỉ admin mới áp dụng toàn đơn hàng).")
                    
                    # Kiểm tra tất cả courses trong đơn hàng đều thuộc category được áp dụng
                    applicable_category_ids = set(
                        promotion.applicable_categories.values_list('pk', flat=True)
                    )
                    for detail_course in courses_detail:
                        if not detail_course.category_id or detail_course.category_id not in applicable_category_ids:
                            raise ValidationError(
                                f"Khuyến mãi {promotion.code} (ID {promotion.id}) không áp dụng cho danh mục của khóa học '{detail_course.title}'."
                            )
                    if promotion.status != Promotion.StatusChoices.ACTIVE:
                        raise ValidationError("Khuyến mãi không hoạt động.")
                    if promotion.start_date and promotion.end_date and not (promotion.start_date <= payment_time <= promotion.end_date):
                        raise ValidationError("Khuyến mãi hết hạn.")
                    if promotion.usage_limit and promotion.used_count >= promotion.usage_limit:
                        raise ValidationError("Khuyến mãi đã hết lượt sử dụng.")
                    if total_original < promotion.min_purchase:
                        raise ValidationError("Đơn hàng chưa đủ điều kiện tối thiểu để áp dụng mã giảm.")

                    if promotion.discount_type == Promotion.DiscountTypeChoices.PERCENTAGE:
                        admin_discount = total_original * Decimal(promotion.discount_value) / 100
                    elif promotion.discount_type == Promotion.DiscountTypeChoices.FIXED_AMOUNT:
                        admin_discount = Decimal(promotion.discount_value)

                    if promotion.max_discount and admin_discount > promotion.max_discount:
                        admin_discount = promotion.max_discount

                except Promotion.DoesNotExist:
                    raise ValidationError("Khuyến mãi không tồn tại.")

            if payment_type != "subscription":
                total_discount += admin_discount
                total_amount = total_original - total_discount

            # Tạo payment
            transaction_id = generate_unique_transaction_id()
            payment_serializer = PaymentCreateSerializer(data={
                "user": user_id,
                "amount": total_original,
                "discount_amount": total_discount,
                "total_amount": total_amount,
                "payment_method": payment_method,
                "payment_type": payment_type,
                "subscription_plan": payment_data.get("subscription_plan_id"),
                "transaction_id": transaction_id,
                "promotion": promotion_id if promotion_id else None
            })

            if not payment_serializer.is_valid():
                raise ValidationError({"payment": payment_serializer.errors})

            payment_serializer.save()
            payment = Payment.objects.get(transaction_id=transaction_id)
            payment_details_data = []
            if payment_detail_arr:
                # Gán payment vào từng chi tiết
                for detail in payment_detail_arr:
                    detail["payment"] = payment.id

                payment_detail_serializer = PaymentDetailSerializer(data=payment_detail_arr, many=True)
                if not payment_detail_serializer.is_valid():
                    raise ValidationError({"payment_details": payment_detail_serializer.errors})

                payment_detail_serializer.save()
                payment_details_data = payment_detail_serializer.data
            used_promotions = set()

            # Thêm promotion của từng khóa học
            for detail in payment_detail_arr:
                if detail.get("promotion"):
                    used_promotions.add(detail["promotion"])

            # Thêm promotion toàn đơn
            if promotion_id:
                used_promotions.add(promotion_id)

            # Cập nhật used_count
            for promo_id in used_promotions:
                try:
                    promo = Promotion.objects.select_for_update().get(id=promo_id)
                    promo.used_count = (promo.used_count or 0) + 1
                    promo.save()
                except Promotion.DoesNotExist:
                    raise ValidationError(f"Khuyến mãi ID {promo_id} không tồn tại khi cập nhật lượt dùng.")
            # Xoá giỏ hàng của user sau khi thanh toán thành công
            log_activity(
                user_id=user_id,
                action="PAYMENT_INITIATED",
                entity_type="Payment",
                entity_id=payment.id,
                description=f"Khởi tạo thanh toán: {payment.payment_method} - {payment.total_amount} VND"
            )
            return {
                "payment": PaymentSerializer(payment).data,
                "payment_details": payment_details_data
            }

    except Exception as e:
        raise ValidationError(f"Lỗi khi tạo thanh toán: {str(e)}")


def get_payment_status(payment_id, user):
    """Get payment status by payment ID for the authenticated user."""
    try:
        payment = Payment.objects.get(id=payment_id, user=user, is_deleted=False)
    except Payment.DoesNotExist:
        raise ValidationError("Payment không tồn tại hoặc không thuộc về bạn.")

    from payment_details.models import Payment_Details
    from enrollments.models import Enrollment

    details = Payment_Details.objects.filter(payment=payment, is_deleted=False).select_related('course')

    courses = []
    for detail in details:
        enrollment = Enrollment.objects.filter(
            user=user, course_id=detail.course_id, is_deleted=False
        ).first()

        course_obj = detail.course
        # gather metadata that frontend may want
        thumbnail = getattr(course_obj, "thumbnail", None) if course_obj else None
        slug = getattr(course_obj, "slug", None) if course_obj else None
        instructor_name = None
        level = None
        duration = None
        total_lessons = None
        if course_obj:
            if hasattr(course_obj, "instructor") and course_obj.instructor:
                instructor_name = course_obj.instructor.user.full_name
            level = getattr(course_obj, "level", None)
            duration = getattr(course_obj, "duration", None)
            total_lessons = getattr(course_obj, "total_lessons", None)

        courses.append({
            "course_id": detail.course_id,
            "course_title": course_obj.title if course_obj else None,
            "course_thumbnail": thumbnail,
            "course_slug": slug,
            "instructor_name": instructor_name,
            "level": level,
            "duration": duration,
            "total_lessons": total_lessons,
            "price": str(detail.price),
            "discount": str(detail.discount),
            "final_price": str(detail.final_price),
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None,
        })

    completed_at = None
    if payment.payment_status == Payment.PaymentStatus.COMPLETED:
        completed_at = payment.updated_at
    retryable_until = get_payment_retry_deadline(payment)

    return {
        "payment_id": payment.id,
        "payment_status": payment.payment_status,
        "transaction_id": payment.transaction_id,
        "amount": payment.amount,
        "discount_amount": payment.discount_amount,
        "total_amount": payment.total_amount,
        "payment_method": payment.payment_method,
        "courses": courses,
        "created_at": payment.created_at,
        "completed_at": completed_at,
        "retryable_until": retryable_until,
        "can_retry_payment": can_retry_payment(payment),
    }


# ---------------------------------------------------------------------------
# administration helpers
# ---------------------------------------------------------------------------

def list_admin_payments(problematic: bool = False):
    """Return a list of payments with minimal metadata for admin dashboards.

    If ``problematic`` is True the result list is filtered to those payments
    which are marked completed but have at least one detail missing an
    enrollment record (i.e. payments that the reconciliation command would
    report).

    The returned structure is a list of dicts containing keys:
    - payment_id, user_id, user_email, payment_status, total_amount,
      created_at
    - courses: array of objects with course_id, course_title,
      enrollment_status
    - has_problem: boolean indicating a missing-enrollment issue
    """
    from enrollments.models import Enrollment

    qs = Payment.objects.filter(is_deleted=False)
    # only completed payments can be problematic, but admin may want to see all
    if problematic:
        qs = qs.filter(payment_status=Payment.PaymentStatus.COMPLETED)

    results = []
    for p in qs.select_related('user'):
        details = Payment_Details.objects.filter(payment=p, is_deleted=False).select_related('course')
        has_problem_flag = False
        course_list = []
        for d in details:
            enrollment = None
            if d.course:
                enrollment = Enrollment.objects.filter(
                    user=p.user, course=d.course, is_deleted=False
                ).first()
            course_list.append({
                'course_id': d.course_id,
                'course_title': d.course.title if d.course else None,
                'enrollment_status': enrollment.status if enrollment else None,
            })
            if p.payment_status == Payment.PaymentStatus.COMPLETED and not enrollment:
                has_problem_flag = True
        if problematic and not has_problem_flag:
            continue
        # flatten some commonly used fields to keep frontend simpler
        first_course = course_list[0] if course_list else {}
        instructor_name = None
        if details and details[0].course and hasattr(details[0].course, 'instructor') and details[0].course.instructor:
            instructor_name = details[0].course.instructor.user.full_name
        results.append({
            'payment_id': p.id,
            'user_id': p.user.id if p.user else None,
            'user_name': p.user.full_name if p.user else None,
            'user_email': p.user.email if p.user else None,
            'payment_status': p.payment_status,
            'total_amount': p.total_amount,
            'created_at': p.created_at,
            'courses': course_list,
            'has_problem': has_problem_flag,
            'course_title': first_course.get('course_title'),
            'instructor_name': instructor_name,
        })
    return results



def fix_payment(payment_id):
    """Idempotently ensure that a completed payment has enrollments and earnings.

    Raises ValidationError if payment is not completed or doesn't exist. Returns
    a dict summarizing actions taken. Used by admin endpoints and reconciliation.
    """
    from rest_framework.exceptions import ValidationError
    from instructor_earnings.models import InstructorEarning

    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        raise ValidationError("Payment không tồn tại.")

    if payment.payment_status != Payment.PaymentStatus.COMPLETED:
        raise ValidationError("Chỉ có thể sửa payment đã hoàn thành.")

    created_enrollments = 0
    created_earnings = 0

    with transaction.atomic():
        # enrollments
        details = Payment_Details.objects.filter(payment=payment, is_deleted=False).select_related('course')
        for detail in details:
            if not detail.course:
                continue
            from enrollments.models import Enrollment
            existing = Enrollment.objects.filter(
                user=payment.user,
                course=detail.course,
                is_deleted=False
            ).first()
            if not existing:
                Enrollment.objects.create(
                    user=payment.user,
                    course=detail.course,
                    payment=payment,
                    source=Enrollment.Source.PURCHASE,
                    status=Enrollment.Status.Active,
                )
                created_enrollments += 1
            elif existing.payment_id is None:
                existing.payment = payment
                if not existing.source:
                    existing.source = Enrollment.Source.PURCHASE
                existing.save(update_fields=["payment", "source", "updated_at"])

        # earnings
        for detail in details:
            if not detail.course:
                continue
            earning_exists = InstructorEarning.objects.filter(payment=payment, course=detail.course).exists()
            if not earning_exists:
                generate_instructor_earnings_from_payment(payment.id)
                created_earnings += 1

    return {"enrollments_created": created_enrollments, "earnings_created": created_earnings}


def check_enrollment_by_course(course_id, user):
    """Check if user has paid for and enrolled in a specific course."""
    from payment_details.models import Payment_Details
    from enrollments.models import Enrollment

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        raise ValidationError(f"Course ID {course_id} không tồn tại.")

    # Find the latest payment detail for this course & user
    payment_detail = (
        Payment_Details.objects
        .filter(course_id=course_id, payment__user=user, payment__is_deleted=False, is_deleted=False)
        .select_related('payment')
        .order_by('-payment__created_at')
        .first()
    )

    enrollment = Enrollment.objects.filter(
        user=user, course_id=course_id, is_deleted=False
    ).first()

    if not payment_detail:
        return {
            "payment_id": None,
            "payment_status": None,
            "transaction_id": None,
            "amount": None,
            "course_id": course_id,
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None,
            "created_at": None,
            "completed_at": None,
        }

    payment = payment_detail.payment
    completed_at = payment.updated_at if payment.payment_status == Payment.PaymentStatus.COMPLETED else None

    return {
        "payment_id": payment.id,
        "payment_status": payment.payment_status,
        "transaction_id": payment.transaction_id,
        "amount": payment_detail.final_price,
        "course_id": course_id,
        "enrollment_status": enrollment.status if enrollment else None,
        "enrollment_id": enrollment.id if enrollment else None,
        "created_at": payment.created_at,
        "completed_at": completed_at,
    }


def get_payment_admin_config(config_key):
    config_meta = PAYMENT_ADMIN_CONFIGS.get(config_key)
    if not config_meta:
        raise ValidationError("Unsupported payment admin config key.")

    setting, _ = SystemsSetting.objects.get_or_create(
        setting_key=config_meta['setting_key'],
        defaults={
            'setting_group': 'payments',
            'setting_value': json.dumps(config_meta.get('default_value', []), ensure_ascii=False),
            'description': config_meta['description'],
        }
    )

    try:
        parsed_value = json.loads(setting.setting_value or json.dumps(config_meta.get('default_value', []), ensure_ascii=False))
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Stored payment config is invalid JSON: {exc}") from exc

    return {
        'config_key': config_key,
        'setting_id': setting.id,
        'value': parsed_value,
        'updated_at': setting.updated_at,
    }


def update_payment_admin_config(config_key, value, admin=None):
    config_meta = PAYMENT_ADMIN_CONFIGS.get(config_key)
    if not config_meta:
        raise ValidationError("Unsupported payment admin config key.")
    expected_default = config_meta.get('default_value', [])
    if isinstance(expected_default, list) and not isinstance(value, list):
        raise ValidationError("Payment admin config value must be a JSON array.")
    if isinstance(expected_default, dict) and not isinstance(value, dict):
        raise ValidationError("Payment admin config value must be a JSON object.")

    serialized_value = json.dumps(value, ensure_ascii=False)
    setting, _ = SystemsSetting.objects.get_or_create(
        setting_key=config_meta['setting_key'],
        defaults={
            'setting_group': 'payments',
            'setting_value': serialized_value,
            'description': config_meta['description'],
            'admin': admin,
        }
    )

    setting.setting_group = 'payments'
    setting.setting_value = serialized_value
    setting.description = config_meta['description']
    setting.admin = admin
    setting.save(update_fields=['setting_group', 'setting_value', 'description', 'admin', 'updated_at'])

    return {
        'config_key': config_key,
        'setting_id': setting.id,
        'value': value,
        'updated_at': setting.updated_at,
    }
PAYMENT_RETRY_WINDOW = timedelta(hours=1)


def get_payment_retry_deadline(payment):
    if not payment or not payment.created_at:
        return None
    return payment.created_at + PAYMENT_RETRY_WINDOW


def can_retry_payment(payment, at_time=None):
    if not payment:
        return False
    if payment.payment_status not in [Payment.PaymentStatus.PENDING, Payment.PaymentStatus.FAILED]:
        return False
    deadline = get_payment_retry_deadline(payment)
    if not deadline:
        return False
    return (at_time or timezone.now()) <= deadline


def ensure_payment_retryable(payment):
    if payment.payment_status == Payment.PaymentStatus.COMPLETED:
        raise ValidationError("Payment đã hoàn tất, không thể thanh toán lại.")
    if payment.payment_status in [Payment.PaymentStatus.REFUNDED, Payment.PaymentStatus.CANCELLED]:
        raise ValidationError("Payment không còn khả dụng để thanh toán lại.")
    if not can_retry_payment(payment):
        raise ValidationError("Đã hết thời hạn thanh toán lại cho giao dịch này.")
