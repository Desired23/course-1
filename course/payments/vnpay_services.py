from rest_framework.exceptions import ValidationError
from .serializers import PaymentSerializer
from .models import Payment
from payment_details.models import Payment_Details
from datetime import datetime
from courses.models import Course
from django.db import IntegrityError
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
# from orders.models import Order
# VNPAY cấu hình

vnp_TmnCode = settings.VNPAY_TMN_CODE
vnp_HashSecret = settings.VNPAY_HASH_SECRET_KEY
vnp_Url =  settings.VNPAY_URL
# vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpc
vnp_ReturnUrl = settings.VNPAY_RETURN_URL


def get_payment_url(vnpay_payment_url, params, secret_key):
    # Sắp xếp các tham số theo thứ tự alphabet
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

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def create_vnpay_payment(request: HttpRequest):
    data = request.data if hasattr(request, 'data') else request.GET
    order_id = data.get('order_id') or datetime.now().strftime('%Y%m%d%H%M%S')
    order_desc = data.get('order_desc', f'Thanh toan don hang {order_id}')

    # Always read the amount from the stored payment — single source of truth
    # This eliminates FE/BE price mismatch entirely.
    try:
        payment = Payment.objects.get(id=order_id)
        amount = int(payment.total_amount) * 100   # VNPay expects VND * 100
    except Payment.DoesNotExist:
        amount = int(data.get('amount', 0)) * 100   # fallback for non-payment flows
    order_type = data.get('order_type', 'other')
    language = data.get('language', 'vn')
    bank_code = data.get('bank_code')
    ip_address = get_client_ip(request)

    # Lấy thời gian hiện tại theo múi giờ GMT+7
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
        'vnp_ReturnUrl': vnp_ReturnUrl,  # Bỏ order_id khỏi URL nếu trước đó có
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
    # print(f"Creating VNPAY payment with params: {params}")
    vn_payment_url = get_payment_url(vnp_Url, params, vnp_HashSecret)

    return JsonResponse({'payment_url': vn_payment_url})

def create_enrollments_from_payment(payment):
    """Create enrollments for all courses in a completed payment."""
    from enrollments.services import create_enrollment
    from enrollments.models import Enrollment
    details = Payment_Details.objects.filter(payment=payment, is_deleted=False).select_related('course')
    for detail in details:
        # Skip if already enrolled
        existing = Enrollment.objects.filter(
            user=payment.user, course=detail.course, is_deleted=False
        ).first()
        if existing:
            continue
        try:
            create_enrollment({
                'user_id': payment.user.id,
                'course_id': detail.course.id,
            })
        except Exception as e:
            print(f"[WARN] Failed to create enrollment for course {detail.course.id}: {e}")


def payment_return(request):
    """Handle VNPay browser redirect after payment. Redirects to FE result page."""
    from django.http import HttpResponseRedirect
    fe_url = settings.FRONTEND_URL

    try:
        inputData = request.GET
        if not inputData:
            return HttpResponseRedirect(f"{fe_url}/payment/result?status=error&message=No+data")

        vnp = vnpay()
        vnp.responseData = inputData.dict()
        order_id = inputData['vnp_TxnRef']
        # Use Decimal arithmetic to avoid float precision mismatch
        vnp_amount = Decimal(inputData['vnp_Amount']) / Decimal('100')
        amount = vnp_amount
        vnp_TransactionNo = inputData.get('vnp_TransactionNo', '')
        vnp_ResponseCode = inputData.get('vnp_ResponseCode', '')

        if not vnp.validate_response(settings.VNPAY_HASH_SECRET_KEY):
            return HttpResponseRedirect(
                f"{fe_url}/payment/result?status=error&payment_id={order_id}&message=Invalid+checksum"
            )

        try:
            payment = Payment.objects.get(id=order_id)
        except Payment.DoesNotExist:
            return HttpResponseRedirect(
                f"{fe_url}/payment/result?status=error&message=Payment+not+found"
            )

        if vnp_ResponseCode == "00":
            # Compare as integers (whole VND) to avoid any decimal precision issues
            stored_amount = int(Decimal(payment.total_amount).to_integral_value())
            vnp_amount_vnd = int(amount.to_integral_value())
            if stored_amount != vnp_amount_vnd:
                print(f"[VNPAY] Amount mismatch: DB={payment.total_amount}, VNPay={amount}")
                return HttpResponseRedirect(
                    f"{fe_url}/payment/result?status=error&payment_id={order_id}&message=Amount+mismatch"
                )

            with transaction.atomic():
                payment.payment_status = Payment.PaymentStatus.COMPLETED
                payment.transaction_id = vnp_TransactionNo
                payment.gateway_response = vnp_ResponseCode
                payment.payment_gateway = 'vnpay'
                payment.save()

                # Generate instructor earnings
                generate_instructor_earnings_from_payment(payment)

                # Create enrollments for purchased courses
                create_enrollments_from_payment(payment)

                log_activity(
                    user_id=payment.user.id,
                    action="PAYMENT_SUCCESS",
                    entity_type="Payment",
                    entity_id=payment.id,
                    description=f"Thanh toán thành công: {payment.total_amount} VND qua VNPay"
                )

            return HttpResponseRedirect(
                f"{fe_url}/payment/result?status=success&payment_id={order_id}&amount={amount}&transaction={vnp_TransactionNo}"
            )
        else:
            payment.payment_status = Payment.PaymentStatus.FAILED
            payment.transaction_id = vnp_TransactionNo
            payment.gateway_response = vnp_ResponseCode
            payment.save()

            return HttpResponseRedirect(
                f"{fe_url}/payment/result?status=failed&payment_id={order_id}&code={vnp_ResponseCode}"
            )

    except Exception as e:
        import urllib.parse
        return HttpResponseRedirect(
            f"{fe_url}/payment/result?status=error&message={urllib.parse.quote_plus(str(e))}"
        )



def payment_ipn(request):
    inputData = request.GET
    if inputData:
        vnp = vnpay()
        vnp.responseData = inputData.dict()
        order_id = inputData['vnp_TxnRef']
        amount = Decimal(inputData['vnp_Amount']) / Decimal(100)
        order_desc = inputData['vnp_OrderInfo']
        vnp_TransactionNo = inputData['vnp_TransactionNo']
        vnp_ResponseCode = inputData['vnp_ResponseCode']
        vnp_TmnCode = inputData['vnp_TmnCode']
        vnp_PayDate = inputData['vnp_PayDate']
        vnp_BankCode = inputData['vnp_BankCode']
        vnp_CardType = inputData['vnp_CardType']
        if vnp.validate_response(settings.VNPAY_HASH_SECRET_KEY):
            # Check & Update Order Status in your Database
            try:
                payment = Payment.objects.get(id=order_id)
            except Payment.DoesNotExist:
                return JsonResponse({'RspCode': '01', 'Message': 'Order not found'})

            # Verify amount matches
            if Decimal(payment.total_amount) != Decimal(amount):
                return JsonResponse({'RspCode': '04', 'Message': 'invalid amount'})

            # Check if already processed
            if payment.payment_status != Payment.PaymentStatus.PENDING:
                return JsonResponse({'RspCode': '02', 'Message': 'Order Already Update'})

            if vnp_ResponseCode == "00":
                with transaction.atomic():
                    payment.payment_status = Payment.PaymentStatus.COMPLETED
                    payment.transaction_id = vnp_TransactionNo
                    payment.gateway_response = vnp_ResponseCode
                    payment.payment_gateway = 'vnpay'
                    payment.save()

                    # Log payment success
                    log_activity(
                        user_id=payment.user.id,
                        action="PAYMENT_SUCCESS",
                        entity_type="Payment",
                        entity_id=payment.id,
                        description=f"Thanh toán thành công: {payment.total_amount} VND qua VNPay"
                    )

                    # Generate instructor earnings from the payment
                    generate_instructor_earnings_from_payment(payment.id)

                    # Create enrollments for purchased courses
                    create_enrollments_from_payment(payment)

                # Send invoice email (outside transaction - best effort)
                try:
                    details = payment.payment_details.all()
                    if details.exists():
                        send_payment_invoice(payment.user.email, payment)
                except Exception:
                    pass  # Email sending is best-effort

            else:
                # Payment failed at VNPAY
                payment.payment_status = Payment.PaymentStatus.FAILED
                payment.transaction_id = vnp_TransactionNo
                payment.gateway_response = vnp_ResponseCode
                payment.save()

            # Return VNPAY: Merchant update success
            result = JsonResponse({'RspCode': '00', 'Message': 'Confirm Success'})
        else:
            # Invalid Signature
            result = JsonResponse({'RspCode': '97', 'Message': 'Invalid Signature'})
    else:
        result = JsonResponse({'RspCode': '99', 'Message': 'Invalid request'})

    return result

# def local_ipn()
def send_vnpay_refund_request(payment_detail_id, reason):
    try:
        from payments.vnpay import vnpay  # Nếu bạn có lớp vnpay helper thì dùng lại
        payment_detail = Payment_Details.objects.select_related('payment').get(id=payment_detail_id)
        if payment_detail.refund_status != Payment_Details.RefundStatus.APPROVED:
            raise ValidationError("Refund must be approved before processing.")

        payment = payment_detail.payment
        if payment.payment_status != Payment.PaymentStatus.COMPLETED:
            raise ValidationError("Only completed payments can be refunded.")

        # Thông tin cần thiết
        vnp_TmnCode = settings.VNPAY_TMN_CODE
        vnp_HashSecret = settings.VNPAY_HASH_SECRET_KEY
        vnp_Url = settings.VNPAY_REFUND_URL  # Dùng URL refund: https://sandbox.vnpayment.vn/merchant_webapi/api/transaction

        vnp_TxnRef = payment.id
        vnp_TransactionNo = payment.transaction_id
        vnp_Amount = int(payment_detail.refund_amount * 100)  # VNPAY yêu cầu nhân 100
        vnp_TransactionDate = payment.payment_date.strftime('%Y%m%d%H%M%S')  # Theo định dạng của VNPAY
        vnp_RequestId = str(uuid.uuid4())
        vnp_CreateBy = "admin"
        vnp_Command = "refund"
        vnp_CurrCode = "VND"
        vnp_RefundType = "02"  # 01 = full, 02 = partial
        vnp_IpAddr = "127.0.0.1"
        vnp_OrderInfo = f"Refund for transaction {vnp_TransactionNo}"

        request_data = {
            "vnp_RequestId": vnp_RequestId,
            "vnp_Version": "2.1.0",
            "vnp_Command": vnp_Command,
            "vnp_TmnCode": vnp_TmnCode,
            "vnp_TransactionType": vnp_RefundType,
            "vnp_TxnRef": vnp_TxnRef,
            "vnp_Amount": str(vnp_Amount),
            "vnp_TransactionNo": vnp_TransactionNo,
            "vnp_TransactionDate": vnp_TransactionDate,
            "vnp_CreateBy": vnp_CreateBy,
            "vnp_CreateDate": timezone.now().strftime("%Y%m%d%H%M%S"),
            "vnp_IpAddr": vnp_IpAddr,
            "vnp_OrderInfo": vnp_OrderInfo,
        }

        # Sắp xếp và ký
        sorted_data = sorted(request_data.items())
        query_string = '&'.join([f"{k}={v}" for k, v in sorted_data])
        secure_hash = hmacsha512(vnp_HashSecret, query_string)
        request_data["vnp_SecureHash"] = secure_hash

        # Gửi yêu cầu đến VNPAY
        response = requests.post(vnp_Url, json=request_data, headers={'Content-Type': 'application/json'})
        response_data = response.json()

        if response_data.get("vnp_ResponseCode") == "00":
            # Thành công
            with transaction.atomic():
                payment_detail.refund_status = Payment_Details.RefundStatus.SUCCESS
                payment_detail.refund_transaction_id = response_data.get("vnp_TransactionNo")
                payment_detail.refund_date = timezone.now()
                payment_detail.save()

                payment.refund_amount = (payment.refund_amount or Decimal(0)) + (payment_detail.refund_amount or Decimal(0))
                payment.save()

                earning = InstructorEarning.objects.filter(payment=payment, course=payment_detail.course).first()
                if earning:
                    earning.status = InstructorEarning.StatusChoices.CANCELLED
                    earning.save()

        else:
            # Thất bại
            payment_detail.refund_status = Payment_Details.RefundStatus.FAILED
            payment_detail.refund_response_code = response_data.get("vnp_ResponseCode")
            payment_detail.save()

            raise ValidationError(f"Refund failed: {response_data.get('vnp_Message')}")

        return response_data

    except Exception as e:
        raise ValidationError(f"Error sending refund to VNPAY: {str(e)}")
