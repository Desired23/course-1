from payments.models import Payment
from payment_details.models import Payment_Details
from enrollments.models import Enrollment
from django.db import transaction
from datetime import datetime
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from decimal import ROUND_HALF_UP
refund_conditions = 50
def user_refund_request(payment_id, payment_details_ids , reason=None):
    try:
        with transaction.atomic():
            try:
                payment = Payment.objects.prefetch_related('payment_details').get(id=payment_id)
            except Payment.DoesNotExist:
                raise ValidationError("Payment not found.")
            if payment.payment_status != Payment.PaymentStatus.COMPLETED:
                raise ValidationError("Only completed payments can be refunded.")
            if payment.refund_amount >= payment.total_amount:
                raise ValidationError("Refund amount exceeds total payment amount.")
            
            if not payment_details_ids:
                raise ValidationError("Payment details IDs are required for refund processing.")
            if payment.payment_details:
                valid_ids = set(payment.payment_details.all().values_list('id', flat=True))
                if not set(payment_details_ids).issubset(valid_ids):
                    raise ValidationError("Some payment details IDs do not belong to the specified payment.")
                refund_items = payment.payment_details.filter(id__in=payment_details_ids)

                enrollments = Enrollment.objects.filter(payment_id=payment_id, course_id__in=refund_items.values_list('course_id', flat=True))
                if not enrollments.exists():
                    raise ValidationError("No enrollments found for the given payment IDs.")
                for enrollment in enrollments:
                    if enrollment.status != Enrollment.Status.Active:
                        raise ValidationError("Only active enrollments can be refunded.")
                    if enrollment.progress > refund_conditions:
                        raise ValidationError("Refund is not allowed if more than 50% of the course has been completed.")
                    if enrollment.expiry_date and enrollment.expiry_date < timezone.now():
                        raise ValidationError("Refund is not allowed for expired courses.")
                for detail in refund_items:
                    detail.refund_status = Payment_Details.RefundStatus.PENDING
                    detail.refund_request_time = timezone.now()
                    detail.refund_reason = reason
                    detail.refund_amount = (
                        (Decimal(detail.final_price) / Decimal(payment.amount)) * Decimal(payment.total_amount)
                    ).quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)


                    detail.save()
                return {
                    "message": "Refund request submitted successfully.",
                    "refund_items": [
                        {
                            "payment_detail_id": detail.id,
                            "course_id": detail.course_id,
                            "refund_amount": detail.refund_amount,
                            "refund_status": detail.refund_status,
                            "refund_reason": detail.refund_reason,
                        }
                        for detail in refund_items
                    ]
                }
                        
    except  Exception as e:
        raise ValidationError(f"Error processing refund: {str(e)}")
def admin_update_refund_status(payment_id, payment_details_ids, status, response_code=None, transaction_id=None):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related('payment_details').get(id=payment_id)
            if not payment.payment_details.filter(id__in=payment_details_ids).exists():
                raise ValidationError("Payment details IDs do not match the specified payment.")
            refund_items = payment.payment_details.filter(id__in=payment_details_ids)
            for detail in refund_items:
                if status == Payment_Details.RefundStatus.APPROVED:
                    detail.refund_status = Payment_Details.RefundStatus.APPROVED
                    detail.save()
                elif status == Payment_Details.RefundStatus.SUCCESS:
                    detail.refund_status = Payment_Details.RefundStatus.SUCCESS
                    detail.refund_transaction_id = transaction_id
                    detail.refund_response_code = response_code
                    detail.refund_date = timezone.now()
                    detail.save()
                elif status == Payment_Details.RefundStatus.REJECTED:
                    detail.refund_status = Payment_Details.RefundStatus.REJECTED
                    detail.save()
                elif status == Payment_Details.RefundStatus.FAILED:
                    detail.refund_status = Payment_Details.RefundStatus.FAILED
                    detail.save()
                else:
                    raise ValidationError("Invalid refund status.")
    except Exception as e:
        raise ValidationError(f"Error updating refund status: {str(e)}")
def user_cancel_refund_request(payment_id, payment_details_ids):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related('payment_details').select_for_update().get(id=payment_id)
            if not payment.payment_details.filter(id__in=payment_details_ids).exists():
                raise ValidationError("Payment details IDs do not match the specified payment.")
            refund_items = payment.payment_details.filter(id__in=payment_details_ids)
            for detail in refund_items:
                if detail.refund_status == Payment_Details.RefundStatus.PENDING:
                    detail.refund_status = Payment_Details.RefundStatus.REJECTED
                    detail.save()
                else:
                    raise ValidationError("Only pending refund requests can be cancelled.")
    except Exception as e:
        raise ValidationError(f"Error cancelling refund request: {str(e)}")
def get_refund_details(payment_id, payment_details_ids):
    try:
        payment = Payment.objects.prefetch_related('payment_details').get(id=payment_id)
        refund_items = payment.payment_details.select_related('course').filter(id__in=payment_details_ids)

        # Kiểm tra tính hợp lệ
        if refund_items.count() != len(payment_details_ids):
            raise ValidationError("Some payment details do not belong to the specified payment.")

        # Trả về dữ liệu dạng list chứa dict
        return [
            {
                "payment_detail_id": item.id,
                "course_id": item.course.id,
                "course_title": item.course.title,
                "course_thumbnail": item.course.thumbnail.url if item.course.thumbnail else None,
                "original_price": item.price,
                "discount": item.discount,
                "final_price": item.final_price,
                "refund_status": item.refund_status,
                "enrolled_at": item.enrollment.created_at if hasattr(item, "enrollment") else None,
                "learning_progress": item.enrollment.progress if hasattr(item, "enrollment") else None,
            }
            for item in refund_items
        ]

    except Payment.DoesNotExist:
        raise ValidationError("Payment not found.")
    except Exception as e:
        raise ValidationError(f"Error retrieving refund details: {str(e)}")
