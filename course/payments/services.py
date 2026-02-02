from django.db import transaction
from rest_framework.exceptions import ValidationError
from .serializers import PaymentSerializer, PaymentCreateSerializer
from .models import Payment
from promotions.models import Promotion
from courses.models import Course
from payment_details.serializers import PaymentDetailSerializer
from decimal import Decimal
from django.utils import timezone
from courses.models import Course
from .utils import generate_unique_transaction_id
from decimal import Decimal
from django.utils import timezone


def create_payment(payment_data):
    try:
        with transaction.atomic():
            user_id = payment_data.get("user_id")
            payment_method = payment_data.get("payment_method")
            payment_detail_input = payment_data.get("payment_details", [])
            promotion_id = payment_data.get("promotion_id")  # ADMIN-level promotion

            if not payment_detail_input:
                raise ValidationError("Thiếu thông tin chi tiết thanh toán.")

            total_discount = Decimal("0.0")
            total_original = Decimal("0.0")
            payment_detail_arr = []

            # Tính chi tiết từng khóa học
            for item in payment_detail_input:
                course_id = item.get("course_id")
                detail_promotion_id = item.get("promotion_id")
                print("detail_promotion_id:", detail_promotion_id)

                if not course_id:
                    raise ValidationError("Thiếu course_id trong chi tiết thanh toán.")

                try:
                    course = Course.objects.get(id=course_id)
                except Course.DoesNotExist:
                    raise ValidationError(f"Course ID {course_id} không tồn tại.")

                price = Decimal(course.price)
                discount = Decimal("0.0")

                # Áp dụng promotion của instructor (nếu có)
               
                if detail_promotion_id:
                    try:
                        promotion = Promotion.objects.get(id=detail_promotion_id)

                        if not promotion.instructor_id:
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
                                f"Khuyến mãi ID {promotion.promotion_id} không áp dụng cho khóa học {course.title}"
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
                    "course_id": course.course_id,
                    "price": price,
                    "discount": discount,
                    "final_price": final_price,
                    "promotion_id": detail_promotion_id
                })

            # Áp dụng promotion cho toàn đơn hàng nếu có (admin-level)
            admin_discount = Decimal("0.0")
            if promotion_id:
                try:
                    promotion = Promotion.objects.get(id=promotion_id)

                    if not promotion.admin_id:
                        raise ValidationError("Mã giảm giá không hợp lệ (chỉ admin mới áp dụng toàn đơn hàng).")
                    category_valid = promotion.applicable_categories.filter(pk=course.category_id.pk).exists()
                    if not category_valid:
                        raise ValidationError(f"Khuyến mãi ID {promotion.code} id {promotion.promotion_id}không áp dụng cho danh mục khóa học {course.category_id.name}.")
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
            payment_serializer = PaymentCreateSerializer(data={
                "user_id": user_id,
                "amount": total_original,
                "discount_amount": total_discount,
                "total_amount": total_amount,
                "payment_method": payment_method,
                "transaction_id": generate_unique_transaction_id(),
                "promotion_id": promotion_id if promotion_id else None
            })

            if not payment_serializer.is_valid():
                raise ValidationError({"payment": payment_serializer.errors})

            payment = payment_serializer.save()

            # Gán payment_id vào từng chi tiết
            for detail in payment_detail_arr:
                print("payment_id:", payment.payment_id)
                detail["payment_id"] = payment.payment_id

            payment_detail_serializer = PaymentDetailSerializer(data=payment_detail_arr, many=True)
            if not payment_detail_serializer.is_valid():
                raise ValidationError({"payment_details": payment_detail_serializer.errors})

            payment_detail_serializer.save()

            return {
                "payment": PaymentSerializer(payment).data,
                "payment_details": payment_detail_serializer.data
            }

    except Exception as e:
        raise ValidationError(f"Lỗi khi tạo thanh toán: {str(e)}")
