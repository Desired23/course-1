from rest_framework.exceptions import ValidationError
from .serializers import PaymentSerializer
from .models import Payment
from payment_details.models import Payment_Details
from datetime import datetime
from courses.models import Course
from django.db import IntegrityError
import logging
import re
import unicodedata
import urllib.parse
from django.http import JsonResponse, HttpRequest
from django.utils import timezone
from datetime import timedelta
from payments.vnpay import vnpay
from django.conf import settings
from decimal import Decimal
from instructor_earnings.services import generate_instructor_earnings_from_payment
import pytz, uuid, hmac, hashlib, requests
from django.db import transaction
from instructor_earnings.models import InstructorEarning
from utils.mailer.mailer import send_payment_invoice
from activity_logs.services import log_activity
from .services import ensure_payment_retryable



vnp_TmnCode = settings.VNPAY_TMN_CODE
vnp_HashSecret = settings.VNPAY_HASH_SECRET_KEY
vnp_Url =  settings.VNPAY_URL

vnp_ReturnUrl = settings.VNPAY_RETURN_URL
logger = logging.getLogger(__name__)


def get_payment_url(vnpay_payment_url, params, secret_key):

    input_data = sorted(params.items())
    query_string = ''
    seq = 0
    for key, val in input_data:
        if seq == 1:
            query_string += "&" + key + '=' + urllib.parse.quote_plus(str(val))
        else:
            seq = 1
            query_string = key + '=' + urllib.parse.quote_plus(str(val))

    hash_value = hmacsha512(secret_key, query_string)
    return vnpay_payment_url + "?" + query_string + '&vnp_SecureHash=' + hash_value

def hmacsha512(key, data):
    byteKey = key.encode('utf-8')
    byteData = data.encode('utf-8')
    return hmac.new(byteKey, byteData, hashlib.sha512).hexdigest()


def _ascii_compact(value, max_length, fallback):
    normalized = unicodedata.normalize('NFKD', str(value or fallback)).encode('ascii', 'ignore').decode('ascii')
    normalized = re.sub(r'[^A-Za-z0-9 _.-]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    if not normalized:
        normalized = fallback
    return normalized[:max_length]


def _build_vnpay_refund_signature_data(request_data):
    fields = [
        "vnp_RequestId",
        "vnp_Version",
        "vnp_Command",
        "vnp_TmnCode",
        "vnp_TransactionType",
        "vnp_TxnRef",
        "vnp_Amount",
        "vnp_TransactionNo",
        "vnp_TransactionDate",
        "vnp_CreateBy",
        "vnp_CreateDate",
        "vnp_IpAddr",
        "vnp_OrderInfo",
    ]
    return "|".join(str(request_data.get(field, "")) for field in fields)


def _build_vnpay_refund_response_signature_data(response_data):
    fields = [
        "vnp_ResponseId",
        "vnp_Command",
        "vnp_ResponseCode",
        "vnp_Message",
        "vnp_TmnCode",
        "vnp_TxnRef",
        "vnp_Amount",
        "vnp_BankCode",
        "vnp_PayDate",
        "vnp_TransactionNo",
        "vnp_TransactionType",
        "vnp_TransactionStatus",
        "vnp_OrderInfo",
    ]
    return "|".join(str(response_data.get(field, "")) for field in fields)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def build_vnpay_payment_data(request: HttpRequest, payment: Payment = None, order_desc: str = None):
    data = request.data if hasattr(request, 'data') else request.GET

    if payment is not None:
        ensure_payment_retryable(payment)
        order_id = str(payment.id)
        amount = int(payment.total_amount) * 100
        order_desc = order_desc or f'Thanh toan don hang {order_id}'
    else:
        order_id = data.get('order_id') or datetime.now().strftime('%Y%m%d%H%M%S')
        order_desc = order_desc or data.get('order_desc', f'Thanh toan don hang {order_id}')

        try:
            payment = Payment.objects.get(id=order_id)
            ensure_payment_retryable(payment)
            amount = int(payment.total_amount) * 100
        except Payment.DoesNotExist:
            amount = int(data.get('amount', 0)) * 100

    order_type = data.get('order_type', 'other')
    language = data.get('language', 'vn')
    bank_code = data.get('bank_code')
    ip_address = get_client_ip(request)
    tz = pytz.timezone('Asia/Ho_Chi_Minh')

    params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': vnp_TmnCode,
        'vnp_Amount': str(amount),
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': order_id,
        'vnp_OrderInfo': order_desc,
        'vnp_OrderType': order_type,
        'vnp_ReturnUrl': vnp_ReturnUrl,
        'vnp_IpAddr': ip_address,
    }
    if language and language != '':
        params['vnp_Locale'] = language
    else:
        params['vnp_Locale'] = 'vn'

    if bank_code and bank_code != '':
        params['vnp_BankCode'] = bank_code
    params['vnp_CreateDate'] = datetime.now(tz).strftime('%Y%m%d%H%M%S')

    vn_payment_url = get_payment_url(vnp_Url, params, vnp_HashSecret)
    return {
        'payment_url': vn_payment_url,
        'payment_id': int(order_id) if str(order_id).isdigit() else order_id,
    }

def create_vnpay_payment(request: HttpRequest):
    data = request.data if hasattr(request, 'data') else request.GET
    order_id = data.get('order_id') or datetime.now().strftime('%Y%m%d%H%M%S')
    order_desc = data.get('order_desc', f'Thanh toan don hang {order_id}')



    try:
        payment = Payment.objects.get(id=order_id)
        ensure_payment_retryable(payment)
        amount = int(payment.total_amount) * 100
    except Payment.DoesNotExist:
        amount = int(data.get('amount', 0)) * 100
    order_type = data.get('order_type', 'other')
    language = data.get('language', 'vn')
    bank_code = data.get('bank_code')
    ip_address = get_client_ip(request)


    tz = pytz.timezone('Asia/Ho_Chi_Minh')

    params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': vnp_TmnCode,
        'vnp_Amount': str(amount),
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': order_id,
        'vnp_OrderInfo': order_desc,
        'vnp_OrderType': order_type,
        'vnp_ReturnUrl': vnp_ReturnUrl,
        'vnp_IpAddr': ip_address,
    }
    if language and language != '':
        params['vnp_Locale'] = language
    else:
        params['vnp_Locale'] = 'vn'

    if bank_code and bank_code != '':
        params['vnp_BankCode'] = bank_code
    params['vnp_CreateDate'] = datetime.now().strftime('%Y%m%d%H%M%S')
    params['vnp_IpAddr'] = ip_address
    params['vnp_ReturnUrl'] = vnp_ReturnUrl
    params['vnp_CreateDate'] = datetime.now(tz).strftime('%Y%m%d%H%M%S')

    vn_payment_url = get_payment_url(vnp_Url, params, vnp_HashSecret)

    return JsonResponse({'payment_url': vn_payment_url})

def create_enrollments_from_payment(payment):
    """Finalize entitlement for a completed payment.

    - course_purchase: create course enrollments
    - subscription: create a UserSubscription linked to the payment
    """
    if payment.payment_type == Payment.PaymentType.SUBSCRIPTION:
        from subscription_plans.models import UserSubscription
        from subscription_plans.services import subscribe_to_plan

        if not payment.subscription_plan_id:
            print(f"[WARN] Payment {payment.id} is subscription type but has no subscription_plan, skipping")
            return

        existing_subscription = UserSubscription.objects.filter(
            payment=payment,
            is_deleted=False,
        ).first()
        if existing_subscription:
            return

        try:
            subscribe_to_plan(payment.user, payment.subscription_plan_id, payment.id)
        except Exception as e:
            print(f"[WARN] Failed to create subscription for payment {payment.id}: {e}")
        return

    from carts.models import Cart
    from enrollments.services import create_enrollment
    from enrollments.models import Enrollment
    details = Payment_Details.objects.filter(payment=payment, is_deleted=False).select_related('course')
    for detail in details:
        course_obj = detail.course
        if not course_obj:

            print(f"[WARN] PaymentDetail {detail.id} has no course, skipping enrollment")
            continue

        existing = Enrollment.objects.filter(
            user=payment.user, course=course_obj, is_deleted=False
        ).first()
        if existing:
            continue
        try:
            create_enrollment({
                'user_id': payment.user.id,
                'course_id': course_obj.id,
                'payment': payment.id,
                'source': Enrollment.Source.PURCHASE,
            })
        except Exception as e:
            print(f"[WARN] Failed to create enrollment for course {course_obj.id}: {e}")
    if payment.payment_type == Payment.PaymentType.COURSE_PURCHASE:
        Cart.objects.filter(user=payment.user).delete()


def payment_return(request):
    """Handle VNPay browser redirect after payment. Redirects to FE result page."""
    from django.http import HttpResponseRedirect
    result_url = settings.VNPAY_FE_RETURN_URL

    try:
        inputData = request.GET
        if not inputData:
            return HttpResponseRedirect(f"{result_url}?status=error&message=No+data")

        vnp = vnpay()
        vnp.responseData = inputData.dict()
        order_id = inputData['vnp_TxnRef']

        vnp_amount = Decimal(inputData['vnp_Amount']) / Decimal('100')
        amount = vnp_amount
        vnp_TransactionNo = inputData.get('vnp_TransactionNo', '')
        vnp_ResponseCode = inputData.get('vnp_ResponseCode', '')

        if not vnp.validate_response(settings.VNPAY_HASH_SECRET_KEY):
            return HttpResponseRedirect(
                f"{result_url}?status=error&payment_id={order_id}&message=Invalid+checksum"
            )



        if vnp_ResponseCode == "00":
            return HttpResponseRedirect(
                f"{result_url}?status=success&payment_id={order_id}&amount={amount}&transaction={vnp_TransactionNo}"
            )
        else:
            return HttpResponseRedirect(
                f"{result_url}?status=failed&payment_id={order_id}&code={vnp_ResponseCode}"
            )

    except Exception as e:
        import urllib.parse
        return HttpResponseRedirect(
            f"{result_url}?status=error&message={urllib.parse.quote_plus(str(e))}"
        )



def payment_ipn(request):
    """Handle VNPay IPN callback. Always return a JSON response with
    `RspCode` so VNPay knows whether to retry.

    The entire processing is wrapped in a broad try/except; if anything
    raises an exception we log the stack trace and return `'99'` so the
    gateway will retry later.  Transactional updates and enrollment/earning
    generation are performed inside an atomic block to ensure consistency.
    """
    try:
        inputData = request.GET
        if not inputData:
            return JsonResponse({'RspCode': '99', 'Message': 'Invalid request'})

        vnp = vnpay()
        vnp.responseData = inputData.dict()
        order_id = inputData.get('vnp_TxnRef')
        amount = Decimal(inputData.get('vnp_Amount', '0')) / Decimal(100)
        vnp_TransactionNo = inputData.get('vnp_TransactionNo', '')
        vnp_ResponseCode = inputData.get('vnp_ResponseCode', '')


        if not vnp.validate_response(settings.VNPAY_HASH_SECRET_KEY):
            return JsonResponse({'RspCode': '97', 'Message': 'Invalid Signature'})


        try:
            payment = Payment.objects.get(id=order_id)
        except Payment.DoesNotExist:
            return JsonResponse({'RspCode': '01', 'Message': 'Order not found'})

        if Decimal(payment.total_amount) != Decimal(amount):
            return JsonResponse({'RspCode': '04', 'Message': 'invalid amount'})

        if payment.payment_status != Payment.PaymentStatus.PENDING:
            return JsonResponse({'RspCode': '02', 'Message': 'Order Already Update'})

        if vnp_ResponseCode == "00":
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(id=payment.id)
                payment.payment_status = Payment.PaymentStatus.COMPLETED
                payment.transaction_id = vnp_TransactionNo
                payment.gateway_response = vnp_ResponseCode
                payment.payment_gateway = 'vnpay'
                payment.save()

                log_activity(
                    user_id=payment.user.id,
                    action="PAYMENT_SUCCESS",
                    entity_type="Payment",
                    entity_id=payment.id,
                    description=f"Thanh toán thành công: {payment.total_amount} VND qua VNPay"
                )

                from instructor_earnings.models import InstructorEarning
                if not InstructorEarning.objects.filter(payment=payment).exists():
                    generate_instructor_earnings_from_payment(payment.id)

                create_enrollments_from_payment(payment)

            try:
                details = payment.payment_details.all()
                if details.exists():
                    send_payment_invoice(payment.user.email, payment)
            except Exception:
                pass

        else:
            payment.payment_status = Payment.PaymentStatus.FAILED
            payment.transaction_id = vnp_TransactionNo
            payment.gateway_response = vnp_ResponseCode
            payment.save()

        return JsonResponse({'RspCode': '00', 'Message': 'Confirm Success'})

    except Exception as e:
        import logging, traceback
        logging.error(f"IPN error for order {locals().get('order_id')} : {e}\n" + traceback.format_exc())
        return JsonResponse({'RspCode': '99', 'Message': 'Internal error'})


def send_vnpay_refund_request(payment_detail, reason=None, create_by="system", timeout_seconds=15):
    try:
        payment = payment_detail.payment
        if payment.payment_status not in [Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]:
            raise ValidationError("Only completed or partially refunded payments can be refunded.")
        if not payment.transaction_id:
            raise ValidationError("Payment is missing the VNPay transaction number.")
        if not payment.payment_date:
            raise ValidationError("Payment is missing the original payment date.")

        vnp_Url = settings.VNPAY_REFUND_URL
        vnp_TxnRef = str(payment.id)
        vnp_TransactionNo = str(payment.transaction_id)
        vnp_Amount = int((payment_detail.refund_amount or Decimal("0.00")) * 100)
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        vnp_TransactionDate = timezone.localtime(payment.payment_date, tz).strftime('%Y%m%d%H%M%S')
        vnp_RequestId = uuid.uuid4().hex[:32]
        vnp_CreateBy = _ascii_compact(create_by, 245, "system")
        vnp_OrderInfo = _ascii_compact(reason or f"Refund for transaction {vnp_TransactionNo}", 255, f"Refund {vnp_TxnRef}")
        refund_type = "02" if Decimal(payment.total_amount or Decimal("0.00")) <= Decimal(payment_detail.refund_amount or Decimal("0.00")) else "03"

        request_data = {
            "vnp_RequestId": vnp_RequestId,
            "vnp_Version": "2.1.0",
            "vnp_Command": "refund",
            "vnp_TmnCode": settings.VNPAY_TMN_CODE,
            "vnp_TransactionType": refund_type,
            "vnp_TxnRef": vnp_TxnRef,
            "vnp_Amount": str(vnp_Amount),
            "vnp_TransactionNo": vnp_TransactionNo,
            "vnp_TransactionDate": vnp_TransactionDate,
            "vnp_CreateBy": vnp_CreateBy,
            "vnp_CreateDate": timezone.localtime(timezone.now(), tz).strftime("%Y%m%d%H%M%S"),
            "vnp_IpAddr": "127.0.0.1",
            "vnp_OrderInfo": vnp_OrderInfo,
        }

        signature_data = _build_vnpay_refund_signature_data(request_data)
        request_data["vnp_SecureHash"] = hmacsha512(settings.VNPAY_HASH_SECRET_KEY, signature_data)
        logger.info(
            "VNPay refund request prepared request_id=%s payment_id=%s payment_detail_id=%s txn_ref=%s transaction_no=%s amount=%s transaction_type=%s create_date=%s",
            vnp_RequestId,
            payment.id,
            payment_detail.id,
            vnp_TxnRef,
            vnp_TransactionNo,
            vnp_Amount,
            refund_type,
            request_data["vnp_CreateDate"],
        )
        logger.debug("VNPay refund request signature_data=%s", signature_data)
        logger.debug(
            "VNPay refund request payload=%s",
            {k: v for k, v in request_data.items() if k != "vnp_SecureHash"},
        )

        try:
            response = requests.post(
                vnp_Url,
                json=request_data,
                headers={'Content-Type': 'application/json'},
                timeout=timeout_seconds,
            )
        except requests.Timeout:
            logger.warning("VNPay refund timeout request_id=%s payment_detail_id=%s", vnp_RequestId, payment_detail.id)
            return {
                "status": "processing",
                "response_code": None,
                "transaction_id": None,
                "message": "VNPay refund request timed out. Final state is unknown.",
                "request_id": vnp_RequestId,
                "raw": None,
            }
        except requests.RequestException as exc:
            logger.warning(
                "VNPay refund request exception request_id=%s payment_detail_id=%s error=%s",
                vnp_RequestId,
                payment_detail.id,
                exc,
            )
            return {
                "status": "processing",
                "response_code": None,
                "transaction_id": None,
                "message": f"VNPay refund request did not complete: {exc}",
                "request_id": vnp_RequestId,
                "raw": None,
            }

        try:
            response_data = response.json()
        except ValueError:
            logger.warning(
                "VNPay refund returned non-JSON request_id=%s payment_detail_id=%s body=%s",
                vnp_RequestId,
                payment_detail.id,
                response.text,
            )
            return {
                "status": "processing",
                "response_code": None,
                "transaction_id": None,
                "message": "VNPay returned a non-JSON response.",
                "request_id": vnp_RequestId,
                "raw": response.text,
            }

        logger.info(
            "VNPay refund response request_id=%s payment_detail_id=%s status_code=%s response_code=%s transaction_no=%s",
            vnp_RequestId,
            payment_detail.id,
            response.status_code,
            response_data.get("vnp_ResponseCode"),
            response_data.get("vnp_TransactionNo"),
        )
        logger.debug("VNPay refund response payload=%s", response_data)

        response_signature = response_data.get("vnp_SecureHash")
        if response_signature:
            response_signature_data = _build_vnpay_refund_response_signature_data(response_data)
            expected_signature = hmacsha512(
                settings.VNPAY_HASH_SECRET_KEY,
                response_signature_data,
            )
            logger.debug("VNPay refund response signature_data=%s", response_signature_data)
            if response_signature.lower() != expected_signature.lower():
                logger.warning(
                    "VNPay refund invalid response signature request_id=%s payment_detail_id=%s expected=%s actual=%s",
                    vnp_RequestId,
                    payment_detail.id,
                    expected_signature,
                    response_signature,
                )
                return {
                    "status": "failed",
                    "response_code": "97",
                    "transaction_id": response_data.get("vnp_TransactionNo"),
                    "message": "Invalid VNPay response signature.",
                    "request_id": vnp_RequestId,
                    "raw": response_data,
                }

        response_code = response_data.get("vnp_ResponseCode")
        if response.ok and response_code == "00":
            return {
                "status": "success",
                "response_code": response_code,
                "transaction_id": response_data.get("vnp_TransactionNo"),
                "message": response_data.get("vnp_Message") or "Refund completed successfully.",
                "request_id": vnp_RequestId,
                "raw": response_data,
            }

        return {
            "status": "failed",
            "response_code": response_code,
            "transaction_id": response_data.get("vnp_TransactionNo"),
            "message": response_data.get("vnp_Message") or "Refund failed.",
            "request_id": vnp_RequestId,
            "raw": response_data,
        }
    except Exception as e:
        raise ValidationError(f"Error sending refund to VNPAY: {str(e)}")
