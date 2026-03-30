import base64
import hashlib
import hmac
import json
import logging
import time
import uuid

import requests
from django.conf import settings
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.test.client import RequestFactory
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from activity_logs.services import log_activity
from instructor_earnings.services import generate_instructor_earnings_from_payment
from payments.models import Payment

from .services import ensure_payment_retryable
from .vnpay_services import create_enrollments_from_payment


logger = logging.getLogger(__name__)

MOMO_PENDING_CODES = {1000, 7000, 7002}
MOMO_SUCCESS_CODES = {0}
MOMO_FINAL_FAILED_CODES = {
    10, 11, 12, 13, 20, 21, 22, 40, 41, 42, 43, 45, 47, 98, 99,
    1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017, 1026, 2019, 4001, 4002, 4100,
}
MOMO_REFUND_RETRYABLE_CODES = {1080}
MOMO_REFUND_FINAL_FAILED_CODES = {1081, 1088}


def _momo_hmac(data: str) -> str:
    return hmac.new(
        settings.MOMO_SECRET_KEY.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _momo_create_signature(payload: dict) -> str:
    raw = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={payload['amount']}"
        f"&extraData={payload['extraData']}"
        f"&ipnUrl={payload['ipnUrl']}"
        f"&orderId={payload['orderId']}"
        f"&orderInfo={payload['orderInfo']}"
        f"&partnerCode={payload['partnerCode']}"
        f"&redirectUrl={payload['redirectUrl']}"
        f"&requestId={payload['requestId']}"
        f"&requestType={payload['requestType']}"
    )
    return _momo_hmac(raw)


def _momo_ipn_signature(payload: dict) -> str:
    raw = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={payload.get('amount', '')}"
        f"&extraData={payload.get('extraData', '')}"
        f"&message={payload.get('message', '')}"
        f"&orderId={payload.get('orderId', '')}"
        f"&orderInfo={payload.get('orderInfo', '')}"
        f"&orderType={payload.get('orderType', '')}"
        f"&partnerCode={payload.get('partnerCode', '')}"
        f"&payType={payload.get('payType', '')}"
        f"&requestId={payload.get('requestId', '')}"
        f"&responseTime={payload.get('responseTime', '')}"
        f"&resultCode={payload.get('resultCode', '')}"
        f"&transId={payload.get('transId', '')}"
    )
    return _momo_hmac(raw)


def _momo_create_response_signature(payload: dict) -> str:
    raw = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={payload.get('amount', '')}"
        f"&orderId={payload.get('orderId', '')}"
        f"&partnerCode={payload.get('partnerCode', '')}"
        f"&payUrl={payload.get('payUrl', '')}"
        f"&requestId={payload.get('requestId', '')}"
        f"&responseTime={payload.get('responseTime', '')}"
        f"&resultCode={payload.get('resultCode', '')}"
    )
    return _momo_hmac(raw)


def _encode_extra_data(payment: Payment) -> str:
    payload = {"payment_id": payment.id, "payment_type": payment.payment_type}
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def _sanitize_momo_text(value: str, max_length: int = 255) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    return " ".join(text.split())[:max_length]


def _momo_items(payment: Payment) -> list[dict]:
    items = []
    for detail in payment.payment_details.filter(is_deleted=False).select_related("course"):
        if not detail.course:
            continue
        items.append({
            "id": str(detail.course_id),
            "name": detail.course.title[:255],
            "description": (detail.course.shortdescription or detail.course.title or "")[:255],
            "category": getattr(detail.course, "level", "") or "course",
            "imageUrl": getattr(detail.course, "thumbnail", "") or "",
            "price": int(detail.final_price),
            "currency": "VND",
            "quantity": 1,
            "unit": "course",
            "totalPrice": int(detail.final_price),
            "taxAmount": 0,
        })
    return items


def _parse_momo_response(response):
    try:
        return response.json()
    except ValueError:
        return {"raw": response.text}


def create_momo_payment(payment: Payment) -> dict:
    if payment.payment_method != Payment.PaymentMethod.MOMO:
        raise ValidationError("Payment method must be MoMo.")
    ensure_payment_retryable(payment)

    request_id = f"momo-{payment.id}-{uuid.uuid4().hex[:12]}"
    order_id = str(payment.id)
    payload = {
        "partnerCode": settings.MOMO_PARTNER_CODE,
        "partnerName": settings.MOMO_PARTNER_NAME,
        "storeId": settings.MOMO_STORE_ID,
        "requestType": "payWithMethod",
        "ipnUrl": settings.MOMO_IPN_URL,
        "redirectUrl": settings.MOMO_REDIRECT_URL,
        "orderId": order_id,
        "amount": int(payment.total_amount),
        "lang": "vi",
        "orderInfo": f"Thanh toán đơn hàng {order_id}",
        "requestId": request_id,
        "extraData": _encode_extra_data(payment),
        "items": _momo_items(payment),
        "autoCapture": True,
    }
    payload["signature"] = _momo_create_signature(payload)

    logger.info("MoMo create payment request payment_id=%s request_id=%s amount=%s", payment.id, request_id, payload["amount"])
    logger.debug("MoMo create payment payload=%s", {k: v for k, v in payload.items() if k != "signature"})

    response = requests.post(
        settings.MOMO_CREATE_URL,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    response_data = _parse_momo_response(response)
    if response.status_code >= 400:
        logger.warning(
            "MoMo create payment HTTP error payment_id=%s status_code=%s body=%s",
            payment.id,
            response.status_code,
            response_data,
        )
        raise ValidationError(response_data.get("message") or response_data.get("localMessage") or response_data)
    logger.info(
        "MoMo create payment response payment_id=%s result_code=%s message=%s",
        payment.id,
        response_data.get("resultCode"),
        response_data.get("message"),
    )
    logger.debug("MoMo create payment response payload=%s", response_data)
    response_signature = response_data.get("signature")
    if response_signature:
        expected_signature = _momo_create_response_signature(response_data)
        logger.debug("MoMo create payment response signature_data_valid=%s", response_signature == expected_signature)
        if response_signature != expected_signature:
            logger.warning("MoMo create payment invalid signature payment_id=%s payload=%s", payment.id, response_data)
            raise ValidationError("Invalid MoMo response signature.")
    if int(response_data.get("resultCode", -1)) != 0:
        raise ValidationError(response_data.get("message") or "MoMo create payment failed.")
    return response_data


def send_momo_refund_request(detail, reason=None, timeout_seconds=30):
    payment = detail.payment
    if payment.payment_method != Payment.PaymentMethod.MOMO:
        raise ValidationError("Payment method must be MoMo.")
    if not payment.transaction_id:
        raise ValidationError("MoMo transaction id is required for refund.")
    try:
        trans_id = int(str(payment.transaction_id))
    except (TypeError, ValueError) as exc:
        raise ValidationError("MoMo transaction id must be numeric.") from exc

    refund_order_id = f"refund-{detail.id}-{uuid.uuid4().hex[:10]}"
    request_id = f"refund-req-{detail.id}-{uuid.uuid4().hex[:10]}"
    description = _sanitize_momo_text(reason or detail.refund_reason or f"Refund payment detail {detail.id}")
    payload = {
        "partnerCode": settings.MOMO_PARTNER_CODE,
        "orderId": refund_order_id,
        "requestId": request_id,
        "amount": int(detail.refund_amount or detail.final_price),
        "transId": trans_id,
        "lang": "vi",
        "description": description,
    }
    signature_data = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={payload['amount']}"
        f"&description={payload['description']}"
        f"&orderId={payload['orderId']}"
        f"&partnerCode={payload['partnerCode']}"
        f"&requestId={payload['requestId']}"
        f"&transId={payload['transId']}"
    )
    payload["signature"] = _momo_hmac(signature_data)

    logger.info(
        "MoMo refund request prepared payment_id=%s payment_detail_id=%s request_id=%s amount=%s trans_id=%s",
        payment.id,
        detail.id,
        request_id,
        payload["amount"],
        payload["transId"],
    )
    logger.debug("MoMo refund request signature_data=%s", signature_data)
    logger.debug("MoMo refund request payload=%s", {k: v for k, v in payload.items() if k != "signature"})

    try:
        response = requests.post(
            settings.MOMO_REFUND_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout_seconds,
        )
        response_data = _parse_momo_response(response)
        if response.status_code >= 400:
            logger.warning(
                "MoMo refund HTTP error payment_id=%s payment_detail_id=%s status_code=%s body=%s",
                payment.id,
                detail.id,
                response.status_code,
                response_data,
            )
            return {
                "status": "failed",
                "message": str(response_data.get("message") or response_data.get("localMessage") or response_data),
                "response_code": str(response_data.get("resultCode") or response.status_code),
            }
    except requests.Timeout:
        logger.warning("MoMo refund timeout payment_id=%s payment_detail_id=%s", payment.id, detail.id)
        return {"status": "processing", "message": "MoMo refund request timed out."}
    except (requests.RequestException, ValueError) as exc:
        logger.warning("MoMo refund request error payment_id=%s payment_detail_id=%s error=%s", payment.id, detail.id, exc)
        return {"status": "processing", "message": str(exc)}

    result_code = int(response_data.get("resultCode", -1))
    message = response_data.get("message") or "MoMo refund response received."
    logger.info(
        "MoMo refund response payment_id=%s payment_detail_id=%s result_code=%s trans_id=%s",
        payment.id,
        detail.id,
        result_code,
        response_data.get("transId"),
    )
    logger.debug("MoMo refund response payload=%s", response_data)

    return map_momo_refund_result(response_data)


def map_momo_refund_result(response_data: dict) -> dict:
    result_code = int(response_data.get("resultCode", -1))
    message = response_data.get("message") or "MoMo refund response received."
    if result_code in MOMO_SUCCESS_CODES:
        return {
            "status": "success",
            "message": message,
            "transaction_id": str(response_data.get("transId")),
            "response_code": str(result_code),
        }
    if result_code in MOMO_PENDING_CODES:
        return {"status": "processing", "message": message, "response_code": str(result_code)}
    if result_code in MOMO_REFUND_RETRYABLE_CODES:
        return {"status": "failed", "message": message, "response_code": str(result_code)}
    if result_code in MOMO_REFUND_FINAL_FAILED_CODES or result_code in MOMO_FINAL_FAILED_CODES:
        return {"status": "failed", "message": message, "response_code": str(result_code)}
    return {"status": "failed", "message": message, "response_code": str(result_code)}


def _finalize_momo_success(payment: Payment, payload: dict):
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(id=payment.id)
        if payment.payment_status == Payment.PaymentStatus.COMPLETED:
            return payment
        payment.payment_status = Payment.PaymentStatus.COMPLETED
        payment.transaction_id = str(payload.get("transId"))
        payment.gateway_response = str(payload.get("resultCode"))
        payment.payment_gateway = "momo"
        payment.save(update_fields=["payment_status", "transaction_id", "gateway_response", "payment_gateway", "updated_at"])

        log_activity(
            user_id=payment.user.id,
            action="PAYMENT_SUCCESS",
            entity_type="Payment",
            entity_id=payment.id,
            description=f"Thanh toán thành công: {payment.total_amount} VND qua MoMo",
        )
        generate_instructor_earnings_from_payment(payment.id)
        create_enrollments_from_payment(payment)
        return payment


def _finalize_momo_failure(payment: Payment, payload: dict):
    if payment.payment_status != Payment.PaymentStatus.PENDING:
        return payment
    payment.payment_status = Payment.PaymentStatus.FAILED
    payment.transaction_id = str(payload.get("transId") or payment.transaction_id or "")
    payment.gateway_response = str(payload.get("resultCode"))
    payment.payment_gateway = "momo"
    payment.save(update_fields=["payment_status", "transaction_id", "gateway_response", "payment_gateway", "updated_at"])
    return payment


def momo_payment_return(request):
    params = request.GET
    order_id = params.get("orderId")
    result_code = int(params.get("resultCode", "-1"))
    message = params.get("message") or "MoMo payment result"
    trans_id = params.get("transId")
    fe_url = settings.FRONTEND_URL
    if result_code in MOMO_SUCCESS_CODES:
        return HttpResponseRedirect(
            f"{fe_url}/payment/result?status=success&payment_id={order_id}&transaction={trans_id}"
        )
    if result_code in MOMO_PENDING_CODES:
        return HttpResponseRedirect(
            f"{fe_url}/payment/result?status=error&payment_id={order_id}&message={message}"
        )
    return HttpResponseRedirect(
        f"{fe_url}/payment/result?status=failed&payment_id={order_id}&code={result_code}&message={message}"
    )


def momo_ipn(request):
    payload = request.data if hasattr(request, "data") else request.POST
    if hasattr(payload, "dict"):
        payload = payload.dict()
    elif not isinstance(payload, dict):
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            payload = {}

    if not payload:
        return JsonResponse({"resultCode": 20, "message": "Invalid request"})

    signature = payload.get("signature")
    expected_signature = _momo_ipn_signature(payload)
    logger.info(
        "MoMo IPN received order_id=%s request_id=%s result_code=%s trans_id=%s",
        payload.get("orderId"),
        payload.get("requestId"),
        payload.get("resultCode"),
        payload.get("transId"),
    )
    logger.debug("MoMo IPN payload=%s", payload)
    if not signature or signature != expected_signature:
        logger.warning("MoMo IPN invalid signature payload=%s", payload)
        return JsonResponse({"resultCode": 13, "message": "Invalid signature"})

    try:
        payment = Payment.objects.get(id=payload.get("orderId"))
    except Payment.DoesNotExist:
        return JsonResponse({"resultCode": 42, "message": "OrderId not found"})

    result_code = int(payload.get("resultCode", -1))
    if result_code in MOMO_SUCCESS_CODES:
        _finalize_momo_success(payment, payload)
    elif result_code in MOMO_FINAL_FAILED_CODES:
        _finalize_momo_failure(payment, payload)

    return JsonResponse({"resultCode": 0, "message": "Confirm Success"})


def simulate_momo_ipn_payload(payment: Payment, trans_id: int, result_code: int = 0, message: str = "Successful.") -> dict:
    payload = {
        "partnerCode": settings.MOMO_PARTNER_CODE,
        "orderId": str(payment.id),
        "requestId": f"sim-{payment.id}-{uuid.uuid4().hex[:8]}",
        "amount": int(payment.total_amount),
        "orderInfo": f"Thanh toán đơn hàng {payment.id}",
        "orderType": "momo_wallet",
        "transId": int(trans_id),
        "resultCode": int(result_code),
        "message": message,
        "payType": "qr",
        "responseTime": int(time.time() * 1000),
        "extraData": _encode_extra_data(payment),
    }
    payload["signature"] = _momo_ipn_signature(payload)
    return payload


def simulate_momo_ipn(payment: Payment, trans_id: int, result_code: int = 0, message: str = "Successful."):
    payload = simulate_momo_ipn_payload(payment, trans_id=trans_id, result_code=result_code, message=message)
    request = RequestFactory().post(
        "/api/momo/ipn/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    request.data = payload
    return momo_ipn(request)
