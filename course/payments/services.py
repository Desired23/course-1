from django.db import transaction
from rest_framework.exceptions import ValidationError
from .serializers import PaymentSerializer, PaymentCreateSerializer
from .models import Payment
from promotions.models import Promotion
from courses.models import Course
from payment_details.serializers import PaymentDetailSerializer
from decimal import Decimal
from django.utils import timezone
from .utils import generate_unique_transaction_id
from carts.models import Cart
from activity_logs.services import log_activity


def create_payment(payment_data):
    try:
        with transaction.atomic():
            user_id = payment_data.get("user_id")
            payment_method = payment_data.get("payment_method")
            payment_type = payment_data.get("payment_type", "course_purchase")
            payment_detail_input = payment_data.get("payment_details", [])
            promotion_id = payment_data.get("promotion_id")  # ADMIN-level promotion

            # Subscription payments cannot use promotions
            if payment_type == "subscription":
                if promotion_id:
                    raise ValidationError("Thanh toán gói subscription không được áp dụng mã giảm giá.")
                for item in (payment_detail_input or []):
                    if item.get("promotion_id"):
                        raise ValidationError("Thanh toán gói subscription không được áp dụng mã giảm giá.")

            courses_detail = []
            if not payment_detail_input:
                raise ValidationError("Thiếu thông tin chi tiết thanh toán.")

            total_discount = Decimal("0.0")
            total_original = Decimal("0.0")
            payment_detail_arr = []

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
                courses_detail.append(course)
                price = Decimal(course.price)
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
                            now = timezone.now()
                            if not (promotion.start_date <= now <= promotion.end_date):
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
                    now = timezone.now()
                    if promotion.start_date and promotion.end_date and not (promotion.start_date <= now <= promotion.end_date):
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
            # Gán payment vào từng chi tiết
            for detail in payment_detail_arr:
                detail["payment"] = payment.id

            payment_detail_serializer = PaymentDetailSerializer(data=payment_detail_arr, many=True)
            if not payment_detail_serializer.is_valid():
                raise ValidationError({"payment_details": payment_detail_serializer.errors})

            payment_detail_serializer.save()
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
            Cart.objects.filter(user=user_id).delete()
            log_activity(
                user_id=user_id,
                action="PAYMENT_INITIATED",
                entity_type="Payment",
                entity_id=payment.id,
                description=f"Khởi tạo thanh toán: {payment.payment_method} - {payment.total_amount} VND"
            )
            return {
                "payment": PaymentSerializer(payment).data,
                "payment_details": payment_detail_serializer.data
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

        courses.append({
            "course_id": detail.course_id,
            "course_title": detail.course.title if detail.course else None,
            "price": str(detail.price),
            "discount": str(detail.discount),
            "final_price": str(detail.final_price),
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None,
        })

    completed_at = None
    if payment.payment_status == Payment.PaymentStatus.COMPLETED:
        completed_at = payment.updated_at

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
    }


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
