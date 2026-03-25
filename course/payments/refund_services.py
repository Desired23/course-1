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
def user_refund_request(payment_id, payment_details_ids, user, reason=None):
    try:
        with transaction.atomic():
            try:
                payment = Payment.objects.prefetch_related('payment_details').get(id=payment_id)
            except Payment.DoesNotExist:
                raise ValidationError("Payment not found.")
            if payment.user != user:
                raise ValidationError("You do not have permission to refund this payment.")
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

                enrollments = Enrollment.objects.filter(
                    payment=payment,
                    user=user,
                    course__in=refund_items.values_list('course', flat=True)
                )
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
                            "course_id": detail.course.id,
                            "refund_amount": detail.refund_amount,
                            "refund_status": detail.refund_status,
                            "refund_reason": detail.refund_reason,
                        }
                        for detail in refund_items
                    ]
                }
                        
    except  Exception as e:
        raise ValidationError(f"Error processing refund: {str(e)}")
def admin_update_refund_status(payment_id, payment_details_ids, refund_status, response_code=None, transaction_id=None):
    try:
        with transaction.atomic():
            payment = Payment.objects.select_for_update().prefetch_related('payment_details').get(id=payment_id)
            if not payment.payment_details.filter(id__in=payment_details_ids).exists():
                raise ValidationError("Payment details IDs do not match the specified payment.")
            refund_items = payment.payment_details.filter(id__in=payment_details_ids)
            for detail in refund_items:
                if refund_status == Payment_Details.RefundStatus.APPROVED:
                    detail.refund_status = Payment_Details.RefundStatus.APPROVED
                    detail.save()
                elif refund_status == Payment_Details.RefundStatus.SUCCESS:
                    detail.refund_status = Payment_Details.RefundStatus.SUCCESS
                    detail.refund_transaction_id = transaction_id
                    detail.refund_response_code = response_code
                    detail.refund_date = timezone.now()
                    detail.save()
                    # Cộng dồn refund_amount vào payment
                    payment.refund_amount += detail.refund_amount or Decimal("0.00")
                elif refund_status == Payment_Details.RefundStatus.REJECTED:
                    detail.refund_status = Payment_Details.RefundStatus.REJECTED
                    detail.save()
                elif refund_status == Payment_Details.RefundStatus.FAILED:
                    detail.refund_status = Payment_Details.RefundStatus.FAILED
                    detail.save()
                else:
                    raise ValidationError("Invalid refund status.")
            # Lưu payment sau khi cộng dồn refund_amount
            if payment.refund_amount >= payment.total_amount:
                payment.payment_status = Payment.PaymentStatus.REFUNDED
            payment.save()
    except Exception as e:
        raise ValidationError(f"Error updating refund status: {str(e)}")
def user_cancel_refund_request(payment_id, payment_details_ids, user):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related('payment_details').select_for_update().get(id=payment_id)
            if payment.user != user:
                raise ValidationError("You do not have permission to cancel this refund request.")
            if not payment.payment_details.filter(id__in=payment_details_ids).exists():
                raise ValidationError("Payment details IDs do not match the specified payment.")
            refund_items = payment.payment_details.filter(id__in=payment_details_ids)
            for detail in refund_items:
                if detail.refund_status == Payment_Details.RefundStatus.PENDING:
                    detail.refund_status = Payment_Details.RefundStatus.CANCELLED
                    detail.refund_reason = None
                    detail.refund_amount = None
                    detail.refund_request_time = None
                    detail.save()
                else:
                    raise ValidationError("Only pending refund requests can be cancelled.")
    except Exception as e:
        raise ValidationError(f"Error cancelling refund request: {str(e)}")
def get_refund_details(payment_id, payment_details_ids, user):
    try:
        payment = Payment.objects.prefetch_related('payment_details').get(id=payment_id)
        if payment.user != user:
            raise ValidationError("You do not have permission to view this refund details.")
        refund_items = payment.payment_details.select_related('course').filter(id__in=payment_details_ids)

        # Kiểm tra tính hợp lệ
        if refund_items.count() != len(payment_details_ids):
            raise ValidationError("Some payment details do not belong to the specified payment.")

        # Lấy enrollment cho từng course
        course_ids = [item.course_id for item in refund_items]
        enrollments = Enrollment.objects.filter(
            user=payment.user, course_id__in=course_ids
        )
        enrollment_map = {e.course_id: e for e in enrollments}

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
                "enrolled_at": enrollment_map[item.course_id].created_at if item.course_id in enrollment_map else None,
                "learning_progress": enrollment_map[item.course_id].progress if item.course_id in enrollment_map else None,
            }
            for item in refund_items
        ]

    except Payment.DoesNotExist:
        raise ValidationError("Payment not found.")
    except Exception as e:
        raise ValidationError(f"Error retrieving refund details: {str(e)}")


def get_user_refunds(user, refund_status_filter=None, search=None, date_from=None, date_to=None):
    """
    Returns all payment_details where user has requested a refund.
    Optionally filter by refund_status.
    """
    from payment_details.models import Payment_Details

    qs = Payment_Details.objects.select_related(
        'payment', 'course', 'payment__user'
    ).filter(
        payment__user=user,
        refund_request_time__isnull=False,  # has been submitted
    )

    if refund_status_filter:
        qs = qs.filter(refund_status=refund_status_filter)
    if search:
        qs = qs.filter(course__title__icontains=search)
    if date_from:
        qs = qs.filter(refund_request_time__date__gte=date_from)
    if date_to:
        qs = qs.filter(refund_request_time__date__lte=date_to)

    result = []
    for detail in qs.order_by('-refund_request_time'):
        result.append({
            'refund_id': detail.id,
            'payment_id': detail.payment_id,
            'course_id': detail.course_id,
            'course_title': detail.course.title if detail.course else None,
            'amount': float(detail.final_price),
            'refund_amount': float(detail.refund_amount) if detail.refund_amount else None,
            'reason': detail.refund_reason,
            'status': detail.refund_status,
            'request_date': detail.refund_request_time,
            'processed_date': detail.refund_date,
            'transaction_id': detail.refund_transaction_id,
        })
    return result


def get_admin_refunds(refund_status_filter=None, search=None, date_from=None, date_to=None):
    """
    Returns all refund requests across users for admin moderation queue.
    """
    qs = Payment_Details.objects.select_related(
        'payment', 'course', 'payment__user'
    ).filter(
        refund_request_time__isnull=False,
    )

    if refund_status_filter:
        qs = qs.filter(refund_status=refund_status_filter)
    if search:
        qs = qs.filter(course__title__icontains=search)
    if date_from:
        qs = qs.filter(refund_request_time__date__gte=date_from)
    if date_to:
        qs = qs.filter(refund_request_time__date__lte=date_to)

    course_ids = [detail.course_id for detail in qs if detail.course_id]
    payment_ids = [detail.payment_id for detail in qs]
    enrollments = Enrollment.objects.filter(
        course_id__in=course_ids,
        payment_id__in=payment_ids,
        is_deleted=False,
    ).select_related('course', 'user')
    enrollment_map = {(enrollment.payment_id, enrollment.course_id): enrollment for enrollment in enrollments}

    result = []
    for detail in qs.order_by('-refund_request_time'):
        enrollment = enrollment_map.get((detail.payment_id, detail.course_id))
        course_completion_days = 0
        if enrollment and enrollment.created_at and detail.refund_request_time:
            course_completion_days = max(
                0,
                (detail.refund_request_time.date() - enrollment.created_at.date()).days,
            )

        result.append({
            'refund_id': detail.id,
            'payment_id': detail.payment_id,
            'payment_details_ids': [detail.id],
            'user_name': detail.payment.user.full_name if detail.payment and detail.payment.user else None,
            'user_email': detail.payment.user.email if detail.payment and detail.payment.user else None,
            'course_id': detail.course_id,
            'course_title': detail.course.title if detail.course else None,
            'amount': float(detail.final_price),
            'refund_amount': float(detail.refund_amount) if detail.refund_amount else None,
            'reason': detail.refund_reason,
            'status': detail.refund_status,
            'requested_at': detail.refund_request_time,
            'processed_at': detail.refund_date,
            'processed_by': None,
            'learning_progress': float(enrollment.progress) if enrollment and enrollment.progress is not None else 0,
            'course_completion_days': course_completion_days,
            'transaction_id': detail.refund_transaction_id,
        })
    return result

