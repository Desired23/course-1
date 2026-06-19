import logging

from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.pagination import StandardPagination
from utils.permissions import RolePermissionFactory

from .refund_services import (
    DELETED_STATUS,
    admin_create_refund,
    admin_update_refund_status,
    admin_refund_action,
    get_admin_refunds,
    user_cancel_refund_request,
    get_refund_details,
    user_refund_request,
    get_user_refunds,
)
from .services import (
    can_retry_payment,
    cancel_payment,
    create_payment,
    get_payment_retry_deadline,
    get_payment_status,
    check_enrollment_by_course,
    fix_payment,
    list_admin_payments,
    get_payment_admin_config,
    update_payment_admin_config,
)
logger = logging.getLogger(__name__)

from .momo_services import create_momo_payment, momo_ipn, momo_payment_return
from .finalization_services import finalize_local_payment_callback
from .local_gateway import is_local_payment_mode
from .return_url import (
    store_payment_return_url,
    validate_and_normalize_return_url,
)
from .vnpay_services import build_vnpay_payment_data, create_vnpay_payment, send_vnpay_refund_request
from .vnpay_services import payment_ipn, payment_return


class CreateVnpayPaymentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            order_id = request.data.get("order_id") or request.data.get("payment_id")
            return_url = request.data.get("return_url")
            if order_id and return_url:
                normalized_return_url = validate_and_normalize_return_url(return_url)
                store_payment_return_url(order_id, normalized_return_url)
            return create_vnpay_payment(request)
        except ValidationError as e:
            return Response({"message": e.detail if isinstance(e.detail, str) else str(e.detail), "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("CreateVnpayPayment error")
            return Response({"message": "Không thể tạo thanh toán. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateMomoPaymentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            payment_id = request.data.get("payment_id") or request.data.get("order_id")
            return_url = request.data.get("return_url")
            from .models import Payment
            payment = Payment.objects.get(id=payment_id, user=request.user, is_deleted=False)
            if return_url:
                normalized_return_url = validate_and_normalize_return_url(return_url)
                store_payment_return_url(payment.id, normalized_return_url)
            return Response(create_momo_payment(payment), status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            raise NotFound("Không tìm thấy đơn hàng.")
        except ValidationError as e:
            return Response({"message": e.detail if isinstance(e.detail, str) else str(e.detail), "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("CreateMomoPayment error")
            return Response({"message": "Không thể tạo thanh toán. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class VnpayIPNView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            return payment_ipn(request)
        except Exception:
            logger.exception("VNPay IPN unexpected error")
            from django.http import JsonResponse
            return JsonResponse({"RspCode": "99", "Message": "Unknown error"})


@method_decorator(csrf_exempt, name='dispatch')
class MomoIPNView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            return momo_ipn(request)
        except Exception:
            logger.exception("MoMo IPN unexpected error")
            from django.http import JsonResponse
            return JsonResponse({"resultCode": 99, "message": "Unknown error"})


@method_decorator(csrf_exempt, name='dispatch')
class VnpayPaymentReturnView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            return payment_return(request)
        except Exception:
            from django.conf import settings
            from django.http import HttpResponseRedirect
            import urllib.parse

            logger.exception("VNPay payment return error")
            redirect_url = f"{settings.VNPAY_FE_RETURN_URL}?status=error&message={urllib.parse.quote_plus('payment_processing_error')}"
            return HttpResponseRedirect(redirect_url)


@method_decorator(csrf_exempt, name='dispatch')
class MomoPaymentReturnView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            return momo_payment_return(request)
        except Exception:
            from django.conf import settings
            from django.http import HttpResponseRedirect
            import urllib.parse

            logger.exception("MoMo payment return error")
            redirect_url = f"{settings.MOMO_FE_RETURN_URL}?status=error&message={urllib.parse.quote_plus('payment_processing_error')}"
            return HttpResponseRedirect(redirect_url)


class CreatePaymentRecordView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            data = request.data.copy()
            data['user_id'] = request.user.id
            return_url = data.get('return_url')
            payment_result = create_payment(data)
            payment_id = payment_result['payment']['id']

            if return_url:
                normalized_return_url = validate_and_normalize_return_url(return_url)
                store_payment_return_url(payment_id, normalized_return_url)

            if data.get('payment_method') == 'momo':
                from .models import Payment

                payment_obj = Payment.objects.get(
                    id=payment_id,
                    user=request.user,
                    is_deleted=False,
                )
                from .momo_services import MOMO_REQUEST_TYPES
                momo_request_type = data.get('momo_request_type')
                if momo_request_type in MOMO_REQUEST_TYPES:
                    payment_obj.momo_request_type = momo_request_type
                    payment_obj.save(update_fields=['momo_request_type'])
                momo_payment = create_momo_payment(payment_obj)
                payment_result['gateway_payment'] = {
                    'provider': 'momo',
                    'url': momo_payment.get('payUrl'),
                    'payload': momo_payment,
                }
            elif data.get('payment_method') == 'vnpay':
                from .models import Payment

                payment_obj = Payment.objects.get(
                    id=payment_id,
                    user=request.user,
                    is_deleted=False,
                )
                vnpay_payment = build_vnpay_payment_data(request, payment=payment_obj)
                payment_result['gateway_payment'] = {
                    'provider': 'vnpay',
                    'url': vnpay_payment.get('payment_url'),
                    'payload': vnpay_payment,
                }

            return Response(payment_result, status=status.HTTP_201_CREATED)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("CreatePaymentRecord error")
            return Response({"message": "Không thể tạo đơn thanh toán. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelPaymentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            payment_id = request.data.get('payment_id') or request.data.get('order_id')
            cancel_payment(payment_id, request.user)
            return Response({"message": "Đã hủy giao dịch."}, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied):
            raise
        except Exception:
            logger.exception("CancelPayment error")
            return Response({"message": "Không thể hủy giao dịch. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LocalPaymentCallbackView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        if not is_local_payment_mode():
            return Response({"message": "Local payment callback is disabled."}, status=status.HTTP_404_NOT_FOUND)
        try:
            payment = finalize_local_payment_callback(request.user, request.data)
            return Response({
                "payment_id": payment.id,
                "payment_status": payment.payment_status,
                "transaction_id": payment.transaction_id,
                "gateway_response": payment.gateway_response,
            }, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied):
            raise
        except Exception:
            logger.exception("LocalPaymentCallback error")
            return Response({"message": "Khong the cap nhat ket qua thanh toan local."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RefundDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def get(self, request):
        try:
            payment_id = request.query_params.get('payment_id')
            raw_ids = request.query_params.getlist('payment_details_ids')
            try:
                payment_details_ids = [int(pid) for pid in raw_ids]
            except (ValueError, TypeError):
                return Response({"message": "payment_details_ids phải là danh sách số nguyên."}, status=status.HTTP_400_BAD_REQUEST)
            refund_details = get_refund_details(payment_id, payment_details_ids, request.user)
            return Response(refund_details, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("RefundDetail GET error")
            return Response({"message": "Lỗi hệ thống. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            reason = request.data.get('reason')
            return_data = user_refund_request(payment_id, payment_details_ids, request.user, reason)
            return Response(return_data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("RefundDetail POST error")
            return Response({"message": "Lỗi hệ thống. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            user_cancel_refund_request(payment_id, payment_details_ids, request.user)
            return Response({"message": "Refund request cancelled successfully"}, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("RefundDetail PUT error")
            return Response({"message": "Lỗi hệ thống. Vui lòng thử lại."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundUpdateView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'payment'

    def get(self, request):
        try:
            refund_status_filter = request.query_params.get('status')
            search = (request.query_params.get('search') or '').strip()
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            include_deleted = request.query_params.get('include_deleted') == 'true'
            retryable = request.query_params.get('retryable') == 'true'

            data = get_admin_refunds(
                refund_status_filter=refund_status_filter,
                search=search,
                date_from=date_from,
                date_to=date_to,
                include_deleted=include_deleted,
                retryable=retryable,
            )

            paginator = StandardPagination()
            paged_result = paginator.paginate_queryset(data, request, view=self)
            return paginator.get_paginated_response(paged_result)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminRefundUpdate GET error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            refund_status = request.data.get('status')
            response_code = request.data.get('response_code')
            transaction_id = request.data.get('transaction_id')
            result = admin_update_refund_status(
                payment_id,
                payment_details_ids,
                refund_status,
                response_code,
                transaction_id,
                admin_user=request.user.admin,
            )
            return Response(result, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminRefundUpdate PATCH error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminCreateRefundView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            reason = request.data.get('reason')
            result = admin_create_refund(payment_id, payment_details_ids, request.user.admin, reason)
            return Response(result, status=status.HTTP_201_CREATED)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminCreateRefund error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundActionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            action = request.data.get('action')
            refund_ids = request.data.get('refund_ids') or []
            note = request.data.get('note')
            override_status = request.data.get('override_status')
            result = admin_refund_action(action, refund_ids, request.user.admin, note=note, override_status=override_status)
            return Response(result, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminRefundAction error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentStatusView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, payment_id):
        try:
            from utils.roles import is_active_admin
            is_admin = is_active_admin(request.user)
            data = get_payment_status(payment_id, request.user, admin_override=is_admin)
            return Response(data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("PaymentStatus GET error payment_id=%s", payment_id)
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminPaymentFixView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'payment'

    def post(self, request):
        payment_id = request.data.get('payment_id')
        if not payment_id:
            return Response({"message": "payment_id là bắt buộc."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = fix_payment(payment_id)
            return Response({"message": "Fix applied", "result": result}, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminPaymentFix error payment_id=%s", payment_id)
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminPaymentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        problematic_flag = request.query_params.get('problematic') == 'true'
        data = list_admin_payments(problematic=problematic_flag)
        return Response(data, status=status.HTTP_200_OK)


class AdminPaymentExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from utils.export_helpers import export_to_csv, export_to_excel
        payments = list_admin_payments()
        headers = ['Payment ID', 'User ID', 'User Name', 'User Email', 'Status', 'Total Amount', 'Course(s)', 'Created At']
        rows = [
            [
                p['payment_id'],
                p['user_id'],
                p['user_name'],
                p['user_email'],
                p['payment_status'],
                p['total_amount'],
                ', '.join(c['course_title'] or '' for c in p.get('courses', [])),
                p['created_at'].isoformat() if p['created_at'] else '',
            ]
            for p in payments
        ]
        fmt = request.query_params.get('format', 'csv')
        if fmt == 'excel':
            return export_to_excel(headers, rows, 'payments_export', 'Payments')
        return export_to_csv(headers, rows, 'payments_export')


class AdminPaymentConfigView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, config_key):
        try:
            data = get_payment_admin_config(config_key)
            return Response(data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminPaymentConfig GET error key=%s", config_key)
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request, config_key):
        try:
            value = request.data.get('value')
            admin = getattr(request.user, 'admin', None)
            data = update_payment_admin_config(config_key, value, admin=admin)
            return Response(data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("AdminPaymentConfig PATCH error key=%s", config_key)
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckEnrollmentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, course_id):
        try:
            data = check_enrollment_by_course(course_id, request.user)
            return Response(data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("CheckEnrollment error course_id=%s", course_id)
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserPaymentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            from .models import Payment
            from enrollments.models import Enrollment

            payments = Payment.objects.filter(
                user=request.user.id,
                is_deleted=False,
            ).prefetch_related(
                'payment_details__course',
                'enrollments__course',
            ).order_by('-payment_date')

            payment_status_filter = request.query_params.get('payment_status')
            payment_type_filter = request.query_params.get('payment_type')
            search = (request.query_params.get('search') or '').strip()
            refund_eligibility = request.query_params.get('refund_eligibility')

            if payment_status_filter:
                payments = payments.filter(payment_status=payment_status_filter)
            if payment_type_filter:
                payments = payments.filter(payment_type=payment_type_filter)
            if search:
                payments = payments.filter(
                    Q(payment_details__course__title__icontains=search)
                    | Q(transaction_id__icontains=search)
                ).distinct()

            result = []
            for payment in payments:
                details = [d for d in payment.payment_details.all() if not d.is_deleted]
                enrollments_by_course = {
                    e.course_id: e
                    for e in payment.enrollments.all()
                    if e.course_id and not e.is_deleted
                }

                payment_data = {
                    'id': payment.id,
                    'payment_type': payment.payment_type,
                    'amount': str(payment.amount),
                    'discount_amount': str(payment.discount_amount),
                    'total_amount': str(payment.total_amount),
                    'transaction_id': payment.transaction_id,
                    'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                    'payment_status': payment.payment_status,
                    'payment_method': payment.payment_method,
                    'refund_amount': str(payment.refund_amount),
                    'created_at': payment.created_at.isoformat() if payment.created_at else None,
                    'retryable_until': get_payment_retry_deadline(payment).isoformat() if get_payment_retry_deadline(payment) else None,
                    'can_retry_payment': can_retry_payment(payment),
                    'gateway_response': payment.gateway_response,
                    'payment_gateway': payment.payment_gateway,
                    'ipn_attempts': payment.ipn_attempts,
                    'items': [],
                }

                for detail in details:
                    course_obj = detail.course
                    enrollment = enrollments_by_course.get(detail.course_id)
                    is_refund_locked = (
                        bool(detail.refund_request_time)
                        or detail.refund_status in ['approved', 'processing', 'success', 'rejected', 'failed', 'cancelled']
                    )

                    refund_eligible = True
                    refund_disabled_reason = None

                    if payment.payment_type != 'course_purchase':
                        refund_eligible = False
                        refund_disabled_reason = 'Chỉ hỗ trợ hoàn tiền cho khóa học mua lẻ.'
                    elif payment.payment_status != Payment.PaymentStatus.COMPLETED:
                        refund_eligible = False
                        refund_disabled_reason = 'Giao dịch chưa hoàn tất.'
                    elif not detail.course_id:
                        refund_eligible = False
                        refund_disabled_reason = 'Không tìm thấy khóa học.'
                    elif is_refund_locked:
                        refund_eligible = False
                        if detail.refund_status == 'pending':
                            refund_disabled_reason = 'Đã gửi yêu cầu hoàn tiền.'
                        elif detail.refund_status == 'success':
                            refund_disabled_reason = 'Khóa học đã được hoàn tiền.'
                        elif detail.refund_status == 'processing':
                            refund_disabled_reason = 'Yêu cầu hoàn tiền đang được xử lý với cổng thanh toán.'
                        elif detail.refund_status == 'cancelled':
                            refund_disabled_reason = 'Yêu cầu hoàn tiền đã bị hủy.'
                        elif detail.refund_status == 'rejected':
                            refund_disabled_reason = 'Yêu cầu hoàn tiền đã bị từ chối.'
                        elif detail.refund_status == 'approved':
                            refund_disabled_reason = 'Yêu cầu đã được duyệt, đang chờ xử lý.'
                        elif detail.refund_status == 'failed':
                            refund_disabled_reason = 'Yêu cầu hoàn tiền trước đó thất bại.'
                        else:
                            refund_disabled_reason = 'Không đủ điều kiện hoàn tiền.'
                    elif not enrollment:
                        refund_eligible = False
                        refund_disabled_reason = 'Không tìm thấy thông tin ghi danh.'
                    elif enrollment.status != Enrollment.Status.Active:
                        refund_eligible = False
                        refund_disabled_reason = 'Khóa học không còn ở trạng thái đang học.'
                    elif enrollment.progress > 50:
                        refund_eligible = False
                        refund_disabled_reason = 'Đã học quá 50%, không thể hoàn tiền.'
                    elif enrollment.expiry_date and enrollment.expiry_date < timezone.now():
                        refund_eligible = False
                        refund_disabled_reason = 'Khóa học đã hết hạn hoàn tiền.'

                    thumbnail = getattr(course_obj, 'thumbnail', None) if course_obj else None
                    slug = getattr(course_obj, 'slug', None) if course_obj else None
                    instructor_name = None
                    level = None
                    duration = None
                    total_lessons = None
                    if course_obj and hasattr(course_obj, 'instructor') and course_obj.instructor:
                        instructor_name = course_obj.instructor.user.full_name
                    if course_obj:
                        level = getattr(course_obj, 'level', None)
                        duration = getattr(course_obj, 'duration', None)
                        total_lessons = getattr(course_obj, 'total_lessons', None)

                    payment_data['items'].append({
                        'id': detail.id,
                        'course_id': course_obj.id if course_obj else None,
                        'course_title': course_obj.title if course_obj else 'N/A',
                        'course_thumbnail': thumbnail,
                        'course_slug': slug,
                        'instructor_name': instructor_name,
                        'level': level,
                        'duration': duration,
                        'total_lessons': total_lessons,
                        'price': str(detail.price),
                        'discount': str(detail.discount),
                        'final_price': str(detail.final_price),
                        'refund_status': detail.refund_status,
                        'refund_request_time': detail.refund_request_time.isoformat() if detail.refund_request_time else None,
                        'refund_amount': str(detail.refund_amount) if detail.refund_amount else None,
                        'refund_reason': detail.refund_reason,
                        'gateway_attempt_count': detail.gateway_attempt_count,
                        'last_gateway_attempt_at': detail.last_gateway_attempt_at.isoformat() if detail.last_gateway_attempt_at else None,
                        'next_retry_at': detail.next_retry_at.isoformat() if detail.next_retry_at else None,
                        'last_gateway_error': detail.last_gateway_error,
                        'internal_note_summary': (detail.internal_note[:120] if detail.internal_note else None),
                        'is_deleted': detail.is_deleted,
                        'deleted_at': detail.deleted_at.isoformat() if detail.deleted_at else None,
                        'refund_eligible': refund_eligible,
                        'refund_disabled_reason': refund_disabled_reason,
                        'enrollment_status': enrollment.status if enrollment else None,
                        'enrollment_progress': str(enrollment.progress) if enrollment else None,
                        'enrollment_expiry_date': enrollment.expiry_date.isoformat() if enrollment and enrollment.expiry_date else None,
                        'refund_transaction_id': detail.refund_transaction_id,
                        'refund_response_code': detail.refund_response_code,
                        'refund_timeline': detail.refund_timeline or [],
                    })

                if refund_eligibility == 'eligible':
                    payment_data['items'] = [item for item in payment_data['items'] if item['refund_eligible']]
                elif refund_eligibility == 'ineligible':
                    payment_data['items'] = [item for item in payment_data['items'] if not item['refund_eligible']]

                if not payment_data['items'] and refund_eligibility in ['eligible', 'ineligible']:
                    continue

                result.append(payment_data)

            paginator = StandardPagination()
            paged_result = paginator.paginate_queryset(result, request, view=self)
            return paginator.get_paginated_response(paged_result)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("UserPaymentList GET error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserRefundListView(APIView):
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'payment'

    def get(self, request):
        try:
            refund_status_filter = request.query_params.get('status')
            search = (request.query_params.get('search') or '').strip()
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            include_deleted = request.query_params.get('include_deleted') == 'true'

            data = get_user_refunds(
                request.user,
                refund_status_filter,
                search=search,
                date_from=date_from,
                date_to=date_to,
            )

            if include_deleted:
                deleted_data = get_user_refunds(
                    request.user,
                    DELETED_STATUS if not refund_status_filter else refund_status_filter,
                    search=search,
                    date_from=date_from,
                    date_to=date_to,
                )
                if refund_status_filter in [None, '', 'all']:
                    data = data + deleted_data

            paginator = StandardPagination()
            paged_result = paginator.paginate_queryset(data, request, view=self)
            return paginator.get_paginated_response(paged_result)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("UserRefundList GET error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            reason = request.data.get('reason')
            result = user_refund_request(payment_id, payment_details_ids, request.user, reason)
            return Response(result, status=status.HTTP_201_CREATED)
        except (ValidationError, PermissionDenied) as e:
            raise
        except Exception:
            logger.exception("UserRefundList POST error")
            return Response({"message": "Lỗi hệ thống."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
