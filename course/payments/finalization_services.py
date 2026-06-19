from decimal import Decimal

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from activity_logs.services import log_activity
from instructor_earnings.services import generate_instructor_earnings_from_payment
from payments.models import Payment


SUCCESS_PROVIDER_LABELS = {
    Payment.PaymentMethod.MOMO: "MoMo",
    Payment.PaymentMethod.VNPAY: "VNPay",
}


def _broadcast_payment(payment_id, payment_status):
    channel_layer = get_channel_layer()
    if not channel_layer or not payment_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"payment_{payment_id}",
        {"type": "send_payment_update", "data": {"payment_id": payment_id, "payment_status": payment_status}},
    )


def _notify_admin_payment_event(payment, notification_code, title, message):
    try:
        from notifications.services import notify_admins
        notify_admins(
            title=title,
            message=message,
            type="payment",
            notification_code=notification_code,
            related_id=payment.id,
            action_url="/admin/payments",
            force=True,
        )
    except Exception:
        pass


def _normalize_provider(provider):
    provider = str(provider or "").lower().strip()
    if provider not in {Payment.PaymentMethod.MOMO, Payment.PaymentMethod.VNPAY}:
        raise ValidationError("Unsupported payment provider.")
    return provider


def _response_code(response_code, payload):
    if response_code is not None:
        return str(response_code)
    if isinstance(payload, dict):
        for key in ("resultCode", "vnp_ResponseCode", "code"):
            if payload.get(key) is not None:
                return str(payload.get(key))
    return None


def finalize_payment_success(payment, provider, transaction_id=None, response_code=None, payload=None):
    provider = _normalize_provider(provider)
    payload = payload or {}

    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(id=payment.id)
        if payment.payment_status == Payment.PaymentStatus.COMPLETED:
            return payment
        if payment.payment_status in [Payment.PaymentStatus.REFUNDED, Payment.PaymentStatus.CANCELLED]:
            raise ValidationError("Payment cannot be completed from its current status.")

        payment.payment_status = Payment.PaymentStatus.COMPLETED
        payment.transaction_id = str(transaction_id) if transaction_id is not None else payment.transaction_id
        payment.gateway_response = _response_code(response_code, payload)
        payment.payment_gateway = provider
        payment.ipn_attempts = (payment.ipn_attempts or 0) + 1
        payment.save(update_fields=[
            "payment_status",
            "transaction_id",
            "gateway_response",
            "payment_gateway",
            "ipn_attempts",
            "updated_at",
        ])

        label = SUCCESS_PROVIDER_LABELS.get(provider, provider)
        log_activity(
            user_id=payment.user.id,
            action="PAYMENT_SUCCESS",
            entity_type="Payment",
            entity_id=payment.id,
            description=f"Thanh toan thanh cong: {payment.total_amount} VND qua {label}",
        )

        from instructor_earnings.models import InstructorEarning
        if not InstructorEarning.objects.filter(payment=payment).exists():
            generate_instructor_earnings_from_payment(payment.id)

        from .services import consume_payment_promotions
        consume_payment_promotions(payment)

        from .vnpay_services import create_enrollments_from_payment
        create_enrollments_from_payment(payment)

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=payment.user.id,
            title="Thanh toan thanh cong",
            message=f"Don hang #{payment.id} da duoc thanh toan thanh cong.",
            type="payment",
            related_id=payment.id,
            notification_code="payment_completed",
        )
    except Exception:
        pass

    _notify_admin_payment_event(
        payment,
        "payment_completed",
        "Thanh toan thanh cong",
        f"Don hang #{payment.id} da thanh toan thanh cong.",
    )

    try:
        from utils.mailer.mailer import send_payment_invoice
        if payment.payment_details.exists():
            send_payment_invoice(payment.user.email, payment)
    except Exception:
        pass

    try:
        _broadcast_payment(payment.id, "completed")
    except Exception:
        pass

    return payment


def finalize_payment_failure(payment, provider, transaction_id=None, response_code=None, payload=None):
    provider = _normalize_provider(provider)
    payload = payload or {}

    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(id=payment.id)
        if payment.payment_status in [
            Payment.PaymentStatus.COMPLETED,
            Payment.PaymentStatus.REFUNDED,
            Payment.PaymentStatus.CANCELLED,
        ]:
            return payment

        payment.payment_status = Payment.PaymentStatus.FAILED
        if transaction_id is not None:
            payment.transaction_id = str(transaction_id)
        payment.gateway_response = _response_code(response_code, payload)
        payment.payment_gateway = provider
        payment.ipn_attempts = (payment.ipn_attempts or 0) + 1
        payment.save(update_fields=[
            "payment_status",
            "transaction_id",
            "gateway_response",
            "payment_gateway",
            "ipn_attempts",
            "updated_at",
        ])

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=payment.user.id,
            title="Thanh toan that bai",
            message=f"Don hang #{payment.id} thanh toan khong thanh cong. Vui long thu lai.",
            type="payment",
            related_id=payment.id,
            notification_code="payment_failed",
        )
    except Exception:
        pass

    _notify_admin_payment_event(
        payment,
        "payment_failed",
        "Thanh toan that bai",
        f"Don hang #{payment.id} thanh toan khong thanh cong.",
    )

    try:
        from utils.mailer.mailer import send_payment_failed
        import threading
        threading.Thread(
            target=send_payment_failed,
            args=(payment.user.email, payment.user.full_name, payment.id, payment.total_amount, provider),
            kwargs={"error_code": _response_code(response_code, payload)},
            daemon=True,
        ).start()
    except Exception:
        pass

    try:
        _broadcast_payment(payment.id, "failed")
    except Exception:
        pass

    return payment


def finalize_local_payment_callback(user, payload):
    provider = _normalize_provider(payload.get("provider"))
    payment_id = payload.get("payment_id") or payload.get("order_id")
    if not payment_id:
        raise ValidationError("payment_id is required.")

    try:
        payment = Payment.objects.get(id=payment_id, user=user, is_deleted=False)
    except Payment.DoesNotExist:
        raise PermissionDenied("Payment not found or not owned by the current user.")

    if payment.payment_method != provider:
        raise ValidationError("Payment method does not match callback provider.")

    try:
        callback_amount = Decimal(str(payload.get("amount")))
    except Exception:
        raise ValidationError("Invalid payment amount.")

    if callback_amount != Decimal(payment.total_amount):
        raise ValidationError("Payment amount does not match.")

    status = str(payload.get("status") or "").lower().strip()
    code = payload.get("code")
    transaction_id = payload.get("transaction_id") or payload.get("transaction")

    if status == "success":
        return finalize_payment_success(
            payment,
            provider=provider,
            transaction_id=transaction_id,
            response_code=code,
            payload=payload,
        )

    if status in {"failed", "cancelled", "canceled"}:
        return finalize_payment_failure(
            payment,
            provider=provider,
            transaction_id=transaction_id,
            response_code=code,
            payload=payload,
        )

    raise ValidationError("Unsupported local payment status.")
