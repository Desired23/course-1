from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from activity_logs.services import log_activity
from enrollments.models import Enrollment
from instructor_earnings.models import InstructorEarning
from payment_details.models import Payment_Details
from payments.models import Payment

from .momo_services import query_momo_refund_status, send_momo_refund_request
from .vnpay_services import send_vnpay_refund_request
from utils.admin_actors import resolve_admin_actor, actor_user_id


REFUND_PROGRESS_LIMIT = 50
REFUND_MODE_ADMIN_APPROVAL = "admin_approval"
REFUND_MODE_DIRECT_SYSTEM = "direct_system"
DELETED_STATUS = "deleted"

DEFAULT_REFUND_SETTINGS = {
    "refund_mode": REFUND_MODE_DIRECT_SYSTEM,
    "refund_retry_cooldown_minutes": 30,
    "refund_max_retry_count": 3,
    "refund_timeout_seconds": 15,
    "allow_admin_override_refund_status": True,
    "allow_admin_soft_delete_refund": True,
}


def _is_local_payment_mode():
    return str(getattr(settings, "PAYMENT_GATEWAY_MODE", "")).lower() == "local"


def get_refund_settings():
    return dict(DEFAULT_REFUND_SETTINGS)


def _display_refund_status(detail):
    if detail.is_deleted:
        return DELETED_STATUS
    return detail.refund_status


def _append_timeline(detail, event, actor=None, note=None, metadata=None):
    timeline = list(detail.refund_timeline or [])
    timeline.append({
        "event": event,
        "actor": actor,
        "note": note,
        "metadata": metadata or {},
        "timestamp": timezone.now().isoformat(),
    })
    detail.refund_timeline = timeline


def _store_gateway_reference(detail, result):
    refund_order_id = result.get("refund_order_id")
    refund_request_id = result.get("refund_request_id")
    if not refund_order_id and not refund_request_id:
        return
    timeline = list(detail.refund_timeline or [])
    for item in reversed(timeline):
        if item.get("event") == "gateway_attempted":
            metadata = dict(item.get("metadata") or {})
            if refund_order_id:
                metadata["refund_order_id"] = refund_order_id
            if refund_request_id:
                metadata["refund_request_id"] = refund_request_id
            item["metadata"] = metadata
            break
    detail.refund_timeline = timeline


def _get_latest_gateway_reference(detail):
    for item in reversed(detail.refund_timeline or []):
        metadata = item.get("metadata") or {}
        refund_order_id = metadata.get("refund_order_id")
        if refund_order_id:
            return {
                "refund_order_id": refund_order_id,
                "refund_request_id": metadata.get("refund_request_id"),
            }
    return None


def _serialize_refund_detail(detail):
    return {
        "refund_id": detail.id,
        "payment_id": detail.payment_id,
        "payment_method": detail.payment.payment_method if detail.payment else None,
        "payment_gateway": detail.payment.payment_gateway if detail.payment else None,
        "course_id": detail.course_id,
        "course_title": detail.course.title if detail.course else None,
        "amount": float(detail.final_price),
        "refund_amount": float(detail.refund_amount) if detail.refund_amount else None,
        "reason": detail.refund_reason,
        "status": _display_refund_status(detail),
        "request_date": detail.refund_request_time,
        "processed_date": detail.refund_date,
        "transaction_id": detail.refund_transaction_id,
        "gateway_attempt_count": detail.gateway_attempt_count,
        "last_gateway_attempt_at": detail.last_gateway_attempt_at,
        "next_retry_at": detail.next_retry_at,
        "last_gateway_error": detail.last_gateway_error,
        "internal_note_summary": (detail.internal_note[:120] if detail.internal_note else None),
        "is_deleted": detail.is_deleted,
        "deleted_at": detail.deleted_at,
        "timeline": detail.refund_timeline or [],
        "processed_by": detail.processed_by.user.full_name if detail.processed_by and detail.processed_by.user else None,
    }

def _calculate_refund_amount(payment, detail):
    # Allocate the amount actually paid (total_amount, net of all discounts)
    # proportionally to each detail's final_price. The weight base must be the
    # sum of final_price (already net of per-course discounts), NOT payment.amount
    # (the gross total before discounts) — otherwise per-course discounts are
    # subtracted twice and the refund comes out too low.
    final_price_total = sum(
        (Decimal(d.final_price) for d in payment.payment_details.all()),
        Decimal("0"),
    )
    if not final_price_total:
        return detail.final_price
    return (
        (Decimal(detail.final_price) / final_price_total) * Decimal(payment.total_amount)
    ).quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)


def _get_enrollment(payment, detail):
    return Enrollment.objects.filter(
        payment=payment,
        user=payment.user,
        course_id=detail.course_id,
        is_deleted=False,
    ).first()


def _ensure_earning_not_paid_out(payment, course_id):
    from instructor_payouts.models import InstructorPayout
    earning = InstructorEarning.objects.select_for_update().filter(
        payment=payment, course_id=course_id, is_deleted=False,
    ).first()
    if not earning:
        return
    if earning.status == InstructorEarning.StatusChoices.PAID:
        raise ValidationError("Khoản doanh thu của giảng viên đã được chi trả; không thể hoàn tiền.")
    if earning.instructor_payout_id:
        payout = InstructorPayout.objects.filter(id=earning.instructor_payout_id).first()
        if payout and payout.status == InstructorPayout.PayoutStatusChoices.PROCESSED:
            raise ValidationError("Khoản doanh thu đã nằm trong đợt chi trả đã xử lý; không thể hoàn tiền.")
        if payout and payout.status == InstructorPayout.PayoutStatusChoices.PENDING:
            raise ValidationError(
                "Khoản doanh thu đang nằm trong đợt chi trả chờ xử lý. "
                "Vui lòng hủy/từ chối payout đó trước khi hoàn tiền."
            )


def _validate_refundable_detail(payment, detail, user):
    if payment.user != user:
        raise PermissionDenied("Bạn không có quyền hoàn tiền đơn hàng này.")
    if payment.payment_type != Payment.PaymentType.COURSE_PURCHASE:
        raise ValidationError("Only course purchase payments can be refunded.")
    if payment.payment_status not in [Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]:
        raise ValidationError("Only completed payments can be refunded.")
    if detail.is_deleted:
        raise ValidationError("This refund request has been archived.")
    if detail.refund_request_time or detail.refund_status in [
        Payment_Details.RefundStatus.PROCESSING,
        Payment_Details.RefundStatus.SUCCESS,
        Payment_Details.RefundStatus.REJECTED,
        Payment_Details.RefundStatus.FAILED,
        Payment_Details.RefundStatus.CANCELLED,
    ]:
        raise ValidationError("This payment detail already has a refund lifecycle.")

    enrollment = _get_enrollment(payment, detail)
    if not enrollment:
        raise ValidationError("No enrollment found for the selected course.")
    if enrollment.status != Enrollment.Status.Active:
        raise ValidationError("Only active enrollments can be refunded.")
    if (enrollment.progress or 0) > REFUND_PROGRESS_LIMIT:
        raise ValidationError("Refund is not allowed if more than 50% of the course has been completed.")
    if enrollment.expiry_date and enrollment.expiry_date < timezone.now():
        raise ValidationError("Refund is not allowed for expired courses.")
    _ensure_earning_not_paid_out(payment, detail.course_id)


def _apply_success_side_effects(detail):
    payment = detail.payment
    if detail.refund_status == Payment_Details.RefundStatus.SUCCESS:
        payment.refund_amount = (payment.refund_amount or Decimal("0.00")) + (detail.refund_amount or Decimal("0.00"))
        if payment.refund_amount >= payment.total_amount:
            payment.payment_status = Payment.PaymentStatus.REFUNDED
        payment.save(update_fields=["refund_amount", "payment_status", "updated_at"])

    enrollment = _get_enrollment(payment, detail)
    if enrollment:
        enrollment.status = Enrollment.Status.Cancelled
        enrollment.expiry_date = timezone.now()
        enrollment.save(update_fields=["status", "expiry_date", "updated_at"])

    earning = InstructorEarning.objects.filter(
        payment=payment,
        course_id=detail.course_id,
        is_deleted=False,
    ).first()
    if earning:
        earning.status = InstructorEarning.StatusChoices.CANCELLED
        earning.save(update_fields=["status", "updated_at"])

    _revoke_certificate_for_refund(detail)
    _hide_review_for_refund(detail)

    from courses.services import recalc_course_students
    recalc_course_students(detail.course_id)


def _revoke_certificate_for_refund(detail):
    from certificates.models import Certificate
    cert = Certificate.objects.filter(
        user=detail.payment.user, course_id=detail.course_id,
        is_deleted=False, revoked=False,
    ).first()
    if not cert:
        return
    cert.revoked = True
    cert.revoked_at = timezone.now()
    cert.revoked_by = detail.processed_by.user if detail.processed_by and detail.processed_by.user else None
    cert.save(update_fields=["revoked", "revoked_at", "revoked_by", "updated_at"])
    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=cert.user_id,
            title="Chứng chỉ đã bị thu hồi",
            message=f"Chứng chỉ cho khóa học \"{cert.course_title}\" đã bị thu hồi do giao dịch đã được hoàn tiền.",
            type='course',
            related_id=cert.id,
            notification_code='certificate_revoked',
        )
    except Exception:
        pass


def _hide_review_for_refund(detail):
    from reviews.models import Review
    from courses.services import recalc_course_rating
    review = Review.objects.filter(
        user=detail.payment.user, course_id=detail.course_id, is_deleted=False,
    ).first()
    if not review:
        return
    review.is_deleted = True
    review.deleted_at = timezone.now()
    review.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
    recalc_course_rating(detail.course_id)


def _revert_success_side_effects(detail):
    payment = detail.payment
    payment.refund_amount = max(Decimal("0.00"), (payment.refund_amount or Decimal("0.00")) - (detail.refund_amount or Decimal("0.00")))
    if payment.payment_status == Payment.PaymentStatus.REFUNDED and payment.refund_amount < payment.total_amount:
        payment.payment_status = Payment.PaymentStatus.COMPLETED
    payment.save(update_fields=["refund_amount", "payment_status", "updated_at"])

    enrollment = _get_enrollment(payment, detail)
    if enrollment and enrollment.status == Enrollment.Status.Cancelled:
        enrollment.status = Enrollment.Status.Active
        enrollment.save(update_fields=["status", "updated_at"])

    earning = InstructorEarning.objects.filter(
        payment=payment,
        course_id=detail.course_id,
        is_deleted=False,
    ).first()
    if earning and earning.status == InstructorEarning.StatusChoices.CANCELLED:
        earning.status = InstructorEarning.StatusChoices.PENDING
        earning.save(update_fields=["status", "updated_at"])

    from certificates.models import Certificate
    cert = Certificate.objects.filter(
        user=payment.user, course_id=detail.course_id,
        is_deleted=False, revoked=True,
    ).first()
    if cert:
        cert.revoked = False
        cert.revoked_at = None
        cert.revoked_by = None
        cert.save(update_fields=["revoked", "revoked_at", "revoked_by", "updated_at"])


def _notify_admin_refund_event(detail, notification_code, title, message):
    try:
        from notifications.services import notify_admins
        notify_admins(
            title=title,
            message=message,
            type="payment",
            notification_code=notification_code,
            related_id=detail.id,
            action_url="/admin/refunds",
            force=True,
        )
    except Exception:
        pass


def _mark_processing(detail, actor, message, settings_value):
    detail.refund_status = Payment_Details.RefundStatus.PROCESSING
    detail.last_gateway_error = message
    detail.next_retry_at = timezone.now() + timedelta(minutes=int(settings_value["refund_retry_cooldown_minutes"]))
    if actor.startswith("admin:"):
        detail.processed_by_id = int(actor.split(":")[1])
    _append_timeline(detail, "gateway_processing", actor=actor, note=message)


def _mark_failed(detail, actor, message, response_code=None, retryable=True):
    detail.refund_status = Payment_Details.RefundStatus.FAILED
    detail.refund_response_code = response_code
    detail.last_gateway_error = message
    detail.processing_lock_token = None
    if not retryable:
        detail.next_retry_at = None
    if actor.startswith("admin:"):
        detail.processed_by_id = int(actor.split(":")[1])
    _append_timeline(detail, "gateway_failed", actor=actor, note=message, metadata={"response_code": response_code, "retryable": retryable})


def _mark_success(detail, actor, message, transaction_id=None, response_code=None):
    detail.refund_status = Payment_Details.RefundStatus.SUCCESS
    detail.refund_transaction_id = transaction_id
    detail.refund_response_code = response_code
    detail.refund_date = timezone.now()
    detail.last_gateway_error = None
    detail.processing_lock_token = None
    detail.next_retry_at = None
    if actor.startswith("admin:"):
        detail.processed_by_id = int(actor.split(":")[1])
    _append_timeline(
        detail,
        "gateway_success",
        actor=actor,
        note=message,
        metadata={"response_code": response_code, "transaction_id": transaction_id},
    )


def _execute_gateway_refund(detail, actor, settings_value):
    detail.refund_status = Payment_Details.RefundStatus.PROCESSING
    detail.gateway_attempt_count = (detail.gateway_attempt_count or 0) + 1
    detail.last_gateway_attempt_at = timezone.now()
    detail.processing_lock_token = uuid.uuid4().hex
    detail.next_retry_at = timezone.now() + timedelta(minutes=int(settings_value["refund_retry_cooldown_minutes"]))
    _append_timeline(detail, "gateway_attempted", actor=actor, metadata={"attempt": detail.gateway_attempt_count})
    detail.save(update_fields=[
        "refund_status",
        "gateway_attempt_count",
        "last_gateway_attempt_at",
        "processing_lock_token",
        "next_retry_at",
        "refund_timeline",
        "updated_at",
    ])

    if _is_local_payment_mode():
        result = {
            "status": "success",
            "message": "Local refund completed.",
            "transaction_id": f"LOCAL-REFUND-{detail.id}-{uuid.uuid4().hex[:8]}",
            "response_code": "00",
            "retryable": False,
            "refund_order_id": f"local-refund-{detail.id}",
            "refund_request_id": f"local-refund-req-{detail.id}",
        }
    elif detail.payment.payment_method == Payment.PaymentMethod.MOMO:
        try:
            result = send_momo_refund_request(
                detail,
                reason=detail.refund_reason,
                timeout_seconds=int(settings_value["refund_timeout_seconds"]),
            )
        except Exception as exc:
            result = {"status": "failed", "message": str(exc)}
    else:
        result = send_vnpay_refund_request(
            detail,
            reason=detail.refund_reason,
            create_by=actor,
            timeout_seconds=int(settings_value["refund_timeout_seconds"]),
        )

    _store_gateway_reference(detail, result)

    if result["status"] == "success":
        _mark_success(
            detail,
            actor=actor,
            message=result["message"],
            transaction_id=result.get("transaction_id"),
            response_code=result.get("response_code"),
        )
        _apply_success_side_effects(detail)
        try:
            from utils.mailer.mailer import send_refund_success
            import threading
            u = detail.payment.user
            threading.Thread(
                target=send_refund_success,
                args=(u.email, u.full_name, detail.course.title if detail.course else '', detail.refund_amount, detail.payment.id),
                daemon=True,
            ).start()
        except Exception:
            pass
    elif result["status"] == "failed":
        _mark_failed(
            detail,
            actor=actor,
            message=result["message"],
            response_code=result.get("response_code"),
            retryable=result.get("retryable", True),
        )
    else:
        _mark_processing(detail, actor=actor, message=result["message"], settings_value=settings_value)

    detail.save()

    if result["status"] == "success":
        try:
            from notifications.services import create_notification
            course_title = detail.course.title if detail.course else f"Khóa học #{detail.course_id}"
            create_notification(
                receiver_id=detail.payment.user_id,
                title="Hoàn tiền thành công",
                message=f"Hoàn tiền cho khóa học \"{course_title}\" đã được xử lý thành công.",
                type='payment',
                related_id=detail.id,
                notification_code='refund_processed',
            )
        except Exception:
            pass
        _notify_admin_refund_event(
            detail,
            "refund_processed",
            "Hoan tien thanh cong",
            f"Refund #{detail.id} da duoc xu ly thanh cong.",
        )
    elif result["status"] == "failed" and not result.get("retryable", True):
        try:
            from notifications.services import create_notification
            create_notification(
                receiver_id=detail.payment.user_id,
                title="Hoàn tiền thất bại",
                message="Yêu cầu hoàn tiền của bạn không thể xử lý. Vui lòng liên hệ hỗ trợ.",
                type='payment',
                related_id=detail.id,
                notification_code='refund_failed',
            )
        except Exception:
            pass
    if result["status"] == "failed":
        _notify_admin_refund_event(
            detail,
            "refund_failed",
            "Hoan tien that bai",
            f"Refund #{detail.id} xu ly that bai.",
        )

    return result


def _sync_momo_processing_refund(detail, actor, settings_value):
    if _is_local_payment_mode():
        result = {
            "status": "success",
            "message": "Local refund synchronized.",
            "transaction_id": f"LOCAL-REFUND-{detail.id}-{uuid.uuid4().hex[:8]}",
            "response_code": "00",
            "retryable": False,
        }
        _mark_success(
            detail,
            actor=actor,
            message=result["message"],
            transaction_id=result["transaction_id"],
            response_code=result["response_code"],
        )
        _apply_success_side_effects(detail)
        detail.save()
        return result

    reference = _get_latest_gateway_reference(detail)
    if not reference or not reference.get("refund_order_id"):
        raise ValidationError("Khong tim thay refund_order_id de dong bo trang thai MoMo.")

    result = query_momo_refund_status(
        reference["refund_order_id"],
        timeout_seconds=int(settings_value["refund_timeout_seconds"]),
    )

    if result["status"] == "success":
        _mark_success(
            detail,
            actor=actor,
            message=result["message"],
            transaction_id=result.get("transaction_id"),
            response_code=result.get("response_code"),
        )
        _apply_success_side_effects(detail)
    elif result["status"] == "failed":
        _mark_failed(
            detail,
            actor=actor,
            message=result["message"],
            response_code=result.get("response_code"),
            retryable=result.get("retryable", True),
        )
    else:
        _mark_processing(detail, actor=actor, message=result["message"], settings_value=settings_value)

    detail.save()
    return result


def _ensure_retryable(detail, settings_value):
    if detail.refund_status not in [Payment_Details.RefundStatus.PROCESSING, Payment_Details.RefundStatus.FAILED]:
        raise ValidationError("Only processing or failed refunds can be retried.")
    if _is_local_payment_mode():
        return
    max_retry = int(settings_value.get("refund_max_retry_count", 3))
    if (detail.gateway_attempt_count or 0) >= max_retry:
        raise ValidationError(f"Refund đã đạt giới hạn retry tối đa ({max_retry} lần).")
    if detail.next_retry_at and detail.next_retry_at > timezone.now():
        wait_secs = int((detail.next_retry_at - timezone.now()).total_seconds()) + 1
        wait_min = (wait_secs + 59) // 60
        raise ValidationError(f"Chưa đến thời gian retry. Vui lòng thử lại sau {wait_min} phút.")


def _get_details_for_payment(payment_id, payment_details_ids, include_deleted=False):
    try:
        payment = Payment.objects.select_for_update().prefetch_related("payment_details").get(id=payment_id)
    except Payment.DoesNotExist:
        raise ValidationError("Payment not found.")

    if not payment_details_ids:
        raise ValidationError("Payment details IDs are required.")

    detail_qs = payment.payment_details.select_related("course")
    if not include_deleted:
        detail_qs = detail_qs.filter(is_deleted=False)
    details = list(detail_qs.filter(id__in=payment_details_ids))
    if len(details) != len(set(payment_details_ids)):
        raise ValidationError("Some payment details IDs do not belong to the specified payment.")
    return payment, details


def _log_refund_activity(user_id, action, detail, description):
    try:
        log_activity(
            user_id=user_id,
            action=action,
            entity_type="PaymentDetailRefund",
            entity_id=detail.id,
            description=description,
        )
    except Exception:
        pass


def user_refund_request(payment_id, payment_details_ids, user, reason=None):
    settings_value = get_refund_settings()
    refund_mode = settings_value["refund_mode"]
    actor = f"user:{user.id}"
    results = []

    with transaction.atomic():
        payment, details = _get_details_for_payment(payment_id, payment_details_ids)
        for detail in details:
            _validate_refundable_detail(payment, detail, user)
            detail.refund_reason = reason
            detail.refund_request_time = timezone.now()
            detail.refund_amount = _calculate_refund_amount(payment, detail)
            detail.last_gateway_error = None
            _append_timeline(detail, "refund_requested", actor=actor, note=reason)
            _log_refund_activity(user.id, "REFUND_REQUESTED", detail, f"Refund requested for course {detail.course_id}")

            if refund_mode == REFUND_MODE_ADMIN_APPROVAL:
                detail.refund_status = Payment_Details.RefundStatus.PENDING
                detail.save()
            else:
                detail.save()
                gateway_result = _execute_gateway_refund(detail, actor=actor, settings_value=settings_value)
                if gateway_result["status"] == "success":
                    _log_refund_activity(user.id, "REFUND_APPROVED", detail, f"Refund auto-processed successfully for course {detail.course_id}")

            results.append(_serialize_refund_detail(detail))

    try:
        from notifications.services import notify_admins
        for detail in details:
            course_title = detail.course.title if detail.course else f"Khóa học #{detail.course_id}"
            notify_admins(
                title="Yêu cầu hoàn tiền mới",
                message=f"{user.full_name} yêu cầu hoàn tiền cho khóa học \"{course_title}\".",
                type='payment',
                notification_code='refund_requested',
                related_id=detail.id,
                sender_id=user.id,
            )
    except Exception:
        pass

    return {
        "message": "Refund request processed successfully.",
        "mode": refund_mode,
        "results": results,
    }


def _apply_admin_override(detail, target_status, actor, note):
    if detail.refund_status == Payment_Details.RefundStatus.SUCCESS and target_status != Payment_Details.RefundStatus.SUCCESS:
        _revert_success_side_effects(detail)

    if target_status == Payment_Details.RefundStatus.SUCCESS:
        _mark_success(detail, actor=actor, message=note or "Refund status overridden by admin.")
        _apply_success_side_effects(detail)
    elif target_status == Payment_Details.RefundStatus.FAILED:
        _mark_failed(detail, actor=actor, message=note or "Refund marked failed by admin override.")
    elif target_status == Payment_Details.RefundStatus.REJECTED:
        detail.refund_status = Payment_Details.RefundStatus.REJECTED
        if actor.startswith("admin:"):
            detail.processed_by_id = int(actor.split(":")[1])
        _append_timeline(detail, "admin_override", actor=actor, note=note or "Refund overridden to rejected.")
    elif target_status == Payment_Details.RefundStatus.CANCELLED:
        detail.refund_status = Payment_Details.RefundStatus.CANCELLED
        if actor.startswith("admin:"):
            detail.processed_by_id = int(actor.split(":")[1])
        _append_timeline(detail, "admin_override", actor=actor, note=note or "Refund overridden to cancelled.")
    else:
        raise ValidationError("Unsupported override target status.")

    detail.processing_lock_token = None
    detail.next_retry_at = None
    detail.save()


def admin_refund_action(action, refund_ids, admin_actor, note=None, override_status=None):
    settings_value = get_refund_settings()
    admin = resolve_admin_actor(admin_actor)
    actor = f"admin:{admin.id}"
    updated_items = []
    skipped_items = []
    errors = []

    for refund_id in refund_ids:
        try:
            with transaction.atomic():
                detail = Payment_Details.objects.select_for_update().select_related("payment", "course").get(id=refund_id)
                if action == "approve":
                    if settings_value["refund_mode"] != REFUND_MODE_ADMIN_APPROVAL:
                        raise ValidationError("Admin approval is disabled in direct refund mode.")
                    if detail.refund_status != Payment_Details.RefundStatus.PENDING:
                        raise ValidationError("Only pending refunds can be approved.")
                    _append_timeline(detail, "admin_approved", actor=actor, note=note)
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_APPROVED", detail, f"Admin approved refund {detail.id}")
                    detail.save(update_fields=["refund_timeline", "updated_at"])
                    _execute_gateway_refund(detail, actor=actor, settings_value=settings_value)
                    try:
                        from utils.mailer.mailer import send_refund_approved
                        import threading
                        u = detail.payment.user
                        threading.Thread(
                            target=send_refund_approved,
                            args=(u.email, u.full_name, detail.course.title if detail.course else '', detail.refund_amount, detail.payment.id),
                            daemon=True,
                        ).start()
                    except Exception:
                        pass
                elif action == "reject":
                    if detail.refund_status != Payment_Details.RefundStatus.PENDING:
                        raise ValidationError("Only pending refunds can be rejected.")
                    detail.refund_status = Payment_Details.RefundStatus.REJECTED
                    detail.processed_by = admin
                    _append_timeline(detail, "admin_rejected", actor=actor, note=note)
                    detail.save()
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_REJECTED", detail, f"Admin rejected refund {detail.id}")
                    try:
                        from utils.mailer.mailer import send_refund_rejected
                        import threading
                        u = detail.payment.user
                        threading.Thread(
                            target=send_refund_rejected,
                            args=(u.email, u.full_name, detail.course.title if detail.course else '', detail.refund_amount),
                            kwargs={"note": note},
                            daemon=True,
                        ).start()
                    except Exception:
                        pass
                    try:
                        from notifications.services import create_notification
                        course_title = detail.course.title if detail.course else f"Khóa học #{detail.course_id}"
                        msg = f"Yêu cầu hoàn tiền cho khóa học \"{course_title}\" đã bị từ chối."
                        if note:
                            msg += f" Lý do: {note}"
                        create_notification(
                            receiver_id=detail.payment.user_id,
                            title="Yêu cầu hoàn tiền bị từ chối",
                            message=msg,
                            type='payment',
                            related_id=detail.id,
                            notification_code='refund_rejected',
                        )
                    except Exception:
                        pass
                    _notify_admin_refund_event(
                        detail,
                        "refund_rejected",
                        "Yeu cau hoan tien bi tu choi",
                        f"Refund #{detail.id} da bi tu choi.",
                    )
                elif action == "retry":
                    _ensure_retryable(detail, settings_value)
                    if detail.payment.payment_method == Payment.PaymentMethod.MOMO and detail.refund_status == Payment_Details.RefundStatus.PROCESSING:
                        sync_result = _sync_momo_processing_refund(detail, actor=actor, settings_value=settings_value)
                        if sync_result["status"] == "processing":
                            raise ValidationError("Refund MoMo van dang duoc xu ly. Khong nen retry luc nay.")
                        if sync_result["status"] == "success":
                            _log_refund_activity(actor_user_id(admin_actor), "REFUND_SYNCED", detail, f"Admin synced refund {detail.id} from MoMo query")
                            updated_items.append(_serialize_refund_detail(detail))
                            continue
                    _execute_gateway_refund(detail, actor=actor, settings_value=settings_value)
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_RETRIED", detail, f"Admin retried refund {detail.id}")
                elif action == "sync":
                    if detail.refund_status != Payment_Details.RefundStatus.PROCESSING:
                        raise ValidationError("Chi refund dang processing moi co the sync.")
                    if _is_local_payment_mode():
                        _execute_gateway_refund(detail, actor=actor, settings_value=settings_value)
                    else:
                        if detail.payment.payment_method != Payment.PaymentMethod.MOMO:
                            raise ValidationError("Sync action hien chi ho tro refund MoMo.")
                        _sync_momo_processing_refund(detail, actor=actor, settings_value=settings_value)
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_SYNCED", detail, f"Admin synced refund {detail.id}")
                elif action == "cancel":
                    if detail.refund_status not in [Payment_Details.RefundStatus.PENDING, Payment_Details.RefundStatus.PROCESSING]:
                        raise ValidationError("Only pending or processing refunds can be cancelled.")
                    detail.refund_status = Payment_Details.RefundStatus.CANCELLED
                    detail.processing_lock_token = None
                    detail.next_retry_at = None
                    detail.processed_by = admin
                    _append_timeline(detail, "admin_cancelled", actor=actor, note=note)
                    detail.save()
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_CANCELLED", detail, f"Admin cancelled refund {detail.id}")
                elif action == "soft_delete":
                    if not settings_value.get("allow_admin_soft_delete_refund", True):
                        raise ValidationError("Soft delete is disabled by configuration.")
                    detail.is_deleted = True
                    detail.deleted_at = timezone.now()
                    detail.deleted_by = admin.user
                    detail.processed_by = admin
                    _append_timeline(detail, "admin_soft_deleted", actor=actor, note=note)
                    detail.save()
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_SOFT_DELETED", detail, f"Admin archived refund {detail.id}")
                elif action == "restore":
                    detail.is_deleted = False
                    detail.deleted_at = None
                    detail.deleted_by = None
                    detail.processed_by = admin
                    _append_timeline(detail, "admin_restored", actor=actor, note=note)
                    detail.save()
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_RESTORED", detail, f"Admin restored refund {detail.id}")
                elif action == "add_note":
                    existing = detail.internal_note or ""
                    detail.internal_note = f"{existing}\n[{timezone.now().isoformat()}] {note}".strip()
                    detail.processed_by = admin
                    _append_timeline(detail, "admin_note_added", actor=actor, note=note)
                    detail.save()
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_NOTE_ADDED", detail, f"Admin added note to refund {detail.id}")
                elif action == "override_status":
                    if not settings_value.get("allow_admin_override_refund_status", True):
                        raise ValidationError("Override status is disabled by configuration.")
                    if override_status not in [
                        Payment_Details.RefundStatus.SUCCESS,
                        Payment_Details.RefundStatus.FAILED,
                        Payment_Details.RefundStatus.REJECTED,
                        Payment_Details.RefundStatus.CANCELLED,
                    ]:
                        raise ValidationError("Unsupported override status.")
                    _apply_admin_override(detail, override_status, actor=actor, note=note)
                    _log_refund_activity(actor_user_id(admin_actor), "REFUND_STATUS_OVERRIDDEN", detail, f"Admin overrode refund {detail.id} to {override_status}")
                else:
                    raise ValidationError("Unsupported refund action.")

                updated_items.append(_serialize_refund_detail(detail))
        except Payment_Details.DoesNotExist:
            errors.append({"refund_id": refund_id, "message": "Refund item not found."})
        except Exception as exc:
            errors.append({"refund_id": refund_id, "message": str(exc)})

    return {
        "message": "Refund action processed.",
        "updated_items": updated_items,
        "skipped_items": skipped_items,
        "errors": errors,
    }


def admin_update_refund_status(payment_id, payment_details_ids, refund_status, response_code=None, transaction_id=None, admin_user=None):
    action = "approve" if refund_status == Payment_Details.RefundStatus.APPROVED else "reject"
    if refund_status not in [Payment_Details.RefundStatus.APPROVED, Payment_Details.RefundStatus.REJECTED]:
        if refund_status == Payment_Details.RefundStatus.SUCCESS:
            return admin_refund_action("override_status", payment_details_ids, admin_user, note=response_code, override_status=refund_status)
        raise ValidationError("Legacy admin refund update only supports approved/rejected.")
    return admin_refund_action(action, payment_details_ids, admin_user, note=None)


def user_cancel_refund_request(payment_id, payment_details_ids, user):
    with transaction.atomic():
        payment, details = _get_details_for_payment(payment_id, payment_details_ids)
        if payment.user != user:
            raise PermissionDenied("Bạn không có quyền hủy yêu cầu hoàn tiền này.")
        for detail in details:
            if detail.refund_status != Payment_Details.RefundStatus.PENDING:
                raise ValidationError("Only pending refund requests can be cancelled.")
            detail.refund_status = Payment_Details.RefundStatus.CANCELLED
            detail.refund_reason = None
            detail.refund_amount = None
            detail.refund_request_time = None
            detail.next_retry_at = None
            detail.processing_lock_token = None
            _append_timeline(detail, "user_cancelled", actor=f"user:{user.id}")
            detail.save()


def get_refund_details(payment_id, payment_details_ids, user):
    payment, details = _get_details_for_payment(payment_id, payment_details_ids, include_deleted=True)
    from utils.roles import is_active_admin
    if payment.user != user and not is_active_admin(user):
        raise PermissionDenied("Bạn không có quyền xem chi tiết hoàn tiền này.")
    return [_serialize_refund_detail(detail) for detail in details]


def admin_create_refund(payment_id, payment_details_ids, admin_user, reason=None):
    admin = resolve_admin_actor(admin_user)
    settings_value = get_refund_settings()
    actor = f"admin:{admin.id}"
    results = []

    with transaction.atomic():
        payment, details = _get_details_for_payment(payment_id, payment_details_ids)
        for detail in details:
            if payment.payment_type != Payment.PaymentType.COURSE_PURCHASE:
                raise ValidationError("Chỉ hỗ trợ hoàn tiền cho giao dịch mua khóa học.")
            if payment.payment_status not in [Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]:
                raise ValidationError("Chỉ có thể hoàn tiền cho giao dịch đã hoàn tất.")
            if detail.is_deleted:
                raise ValidationError("Chi tiết giao dịch này đã bị lưu trữ.")
            if detail.refund_request_time or detail.refund_status in [
                Payment_Details.RefundStatus.PROCESSING,
                Payment_Details.RefundStatus.SUCCESS,
                Payment_Details.RefundStatus.REJECTED,
                Payment_Details.RefundStatus.FAILED,
                Payment_Details.RefundStatus.CANCELLED,
            ]:
                raise ValidationError("Khóa học này đã có yêu cầu hoàn tiền.")
            _ensure_earning_not_paid_out(payment, detail.course_id)

            detail.refund_reason = reason or "Hoàn tiền do admin khởi tạo"
            detail.refund_request_time = timezone.now()
            detail.refund_amount = _calculate_refund_amount(payment, detail)
            detail.last_gateway_error = None
            detail.processed_by = admin
            _append_timeline(detail, "refund_requested", actor=actor, note=reason)
            _append_timeline(detail, "refund_approved", actor=actor, note="Tự động duyệt bởi admin")
            detail.refund_status = Payment_Details.RefundStatus.APPROVED
            detail.save()

            _execute_gateway_refund(detail, actor=actor, settings_value=settings_value)

            _log_refund_activity(
                admin.user_id, "REFUND_REQUESTED", detail,
                f"Admin tạo refund cho course {detail.course_id} thuộc payment {payment_id}"
            )
            results.append(_serialize_refund_detail(detail))

    return {"message": "Yêu cầu hoàn tiền đã được tạo và gửi đến cổng thanh toán.", "results": results}


def force_refund_recent_course_purchases(course, admin_user, reason=None, source_case=None, cutoff_days=30):
    """Hoàn tiền cưỡng chế khi takedown / đóng băng vĩnh viễn một khóa học.

    - Giao dịch <= cutoff_days ngày: tự refund 100% qua admin_create_refund
      (vốn đã bỏ qua giới hạn 50% tiến độ và hoàn full giá).
    - Giao dịch > cutoff_days ngày: KHÔNG refund tự động -> manual_compensation_required.
    - Đã có refund lifecycle -> skipped_already_refunded.
    - Gateway/earning fail từng giao dịch -> ghi errors, không làm hỏng toàn bộ.
    """
    from enrollments.models import Enrollment

    course_id = getattr(course, 'id', course)
    cutoff = timezone.now() - timedelta(days=cutoff_days)
    reason = reason or "Hoàn tiền cưỡng chế do gỡ khóa học vi phạm bản quyền"

    summary = {
        'auto_refund_created': [],
        'refund_processing': [],
        'skipped_already_refunded': [],
        'manual_compensation_required': [],
        'errors': [],
    }

    details = (
        Payment_Details.objects
        .select_related('payment')
        .filter(
            course_id=course_id,
            is_deleted=False,
            payment__payment_type=Payment.PaymentType.COURSE_PURCHASE,
            payment__payment_status__in=[Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED],
        )
    )

    for detail in details:
        payment = detail.payment
        entry = {
            'payment_id': payment.id,
            'payment_detail_id': detail.id,
            'user_id': payment.user_id,
            'source_case_id': getattr(source_case, 'id', None),
        }

        if detail.refund_request_time or detail.refund_status in [
            Payment_Details.RefundStatus.PROCESSING,
            Payment_Details.RefundStatus.APPROVED,
            Payment_Details.RefundStatus.SUCCESS,
            Payment_Details.RefundStatus.REJECTED,
            Payment_Details.RefundStatus.FAILED,
            Payment_Details.RefundStatus.CANCELLED,
        ]:
            summary['skipped_already_refunded'].append(entry)
            continue

        enrollment = Enrollment.objects.filter(
            payment=payment, user=payment.user, course_id=course_id, is_deleted=False,
        ).first()
        if not enrollment:
            summary['skipped_already_refunded'].append({**entry, 'note': 'no_enrollment'})
            continue

        if payment.payment_date and payment.payment_date < cutoff:
            summary['manual_compensation_required'].append(entry)
            continue

        try:
            admin_create_refund(payment.id, [detail.id], admin_user, reason=reason)
            detail.refresh_from_db()
            if detail.refund_status == Payment_Details.RefundStatus.SUCCESS:
                summary['auto_refund_created'].append(entry)
            else:
                summary['refund_processing'].append({**entry, 'status': detail.refund_status})
        except Exception as exc:
            summary['errors'].append({**entry, 'message': str(exc)})

    return summary


def get_user_refunds(user, refund_status_filter=None, search=None, date_from=None, date_to=None):
    qs = Payment_Details.objects.select_related("payment", "course", "payment__user").filter(
        payment__user=user,
        refund_request_time__isnull=False,
    )

    if refund_status_filter == DELETED_STATUS:
        qs = qs.filter(is_deleted=True)
    else:
        qs = qs.filter(is_deleted=False)
        if refund_status_filter:
            qs = qs.filter(refund_status=refund_status_filter)
    if search:
        qs = qs.filter(course__title__icontains=search)
    if date_from:
        qs = qs.filter(refund_request_time__date__gte=date_from)
    if date_to:
        qs = qs.filter(refund_request_time__date__lte=date_to)

    return [_serialize_refund_detail(detail) for detail in qs.order_by("-refund_request_time")]


def get_admin_refunds(refund_status_filter=None, search=None, date_from=None, date_to=None, include_deleted=False, retryable=False):
    qs = Payment_Details.objects.select_related("payment", "course", "payment__user").filter(
        refund_request_time__isnull=False,
    )

    if not include_deleted:
        qs = qs.filter(is_deleted=False)

    if refund_status_filter == DELETED_STATUS:
        qs = qs.filter(is_deleted=True)
    elif refund_status_filter:
        qs = qs.filter(refund_status=refund_status_filter, is_deleted=False)

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
    )
    enrollment_map = {(enrollment.payment_id, enrollment.course_id): enrollment for enrollment in enrollments}

    results = []
    for detail in qs.order_by("-refund_request_time"):
        enrollment = enrollment_map.get((detail.payment_id, detail.course_id))
        course_completion_days = 0
        if enrollment and enrollment.created_at and detail.refund_request_time:
            course_completion_days = max(0, (detail.refund_request_time.date() - enrollment.created_at.date()).days)

        item = _serialize_refund_detail(detail)
        item.update({
            "payment_details_ids": [detail.id],
            "user_name": detail.payment.user.full_name if detail.payment and detail.payment.user else None,
            "user_email": detail.payment.user.email if detail.payment and detail.payment.user else None,
            "requested_at": detail.refund_request_time,
            "processed_at": detail.refund_date,
            "learning_progress": float(enrollment.progress) if enrollment and enrollment.progress is not None else 0,
            "course_completion_days": course_completion_days,
            "retryable": (
                not detail.is_deleted
                and detail.refund_status in [Payment_Details.RefundStatus.PROCESSING, Payment_Details.RefundStatus.FAILED]
                and (detail.next_retry_at is None or detail.next_retry_at <= timezone.now())
            ),
        })
        if retryable and not item["retryable"]:
            continue
        results.append(item)
    return results
