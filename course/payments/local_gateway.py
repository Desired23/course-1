import time
import urllib.parse
import uuid

from django.conf import settings

from payments.models import Payment

from .return_url import resolve_payment_return_url


def is_local_payment_mode():
    return str(getattr(settings, "PAYMENT_GATEWAY_MODE", "")).lower() == "local"


def _frontend_origin(return_url):
    parsed = urllib.parse.urlparse(return_url)
    if not parsed.scheme or not parsed.netloc:
        return getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}"


def build_local_gateway_url(payment, provider):
    return_url = resolve_payment_return_url(payment.id, settings.PAYMENT_RESULT_URL)
    gateway_url = f"{_frontend_origin(return_url)}/payment/local-gateway"
    query = urllib.parse.urlencode({
        "provider": provider,
        "payment_id": payment.id,
        "amount": int(payment.total_amount),
        "return_url": return_url,
    })
    return f"{gateway_url}?{query}"


def build_local_momo_create_response(payment):
    request_id = f"local-momo-{payment.id}-{uuid.uuid4().hex[:8]}"
    order_id = f"{payment.id}-{uuid.uuid4().hex[:8]}"
    return {
        "partnerCode": getattr(settings, "MOMO_PARTNER_CODE", "LOCAL"),
        "requestId": request_id,
        "orderId": order_id,
        "amount": int(payment.total_amount),
        "responseTime": int(time.time() * 1000),
        "message": "Local MoMo payment URL created.",
        "resultCode": 0,
        "payUrl": build_local_gateway_url(payment, Payment.PaymentMethod.MOMO),
        "shortLink": build_local_gateway_url(payment, Payment.PaymentMethod.MOMO),
    }


def build_local_vnpay_create_response(payment):
    return {
        "payment_url": build_local_gateway_url(payment, Payment.PaymentMethod.VNPAY),
        "payment_id": payment.id,
    }
