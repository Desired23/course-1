from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .vnpay_services import create_vnpay_payment, send_vnpay_refund_request
from .vnpay_services import payment_ipn, payment_return
from .services import create_payment, get_payment_status, check_enrollment_by_course
from .refund_services import (
    admin_update_refund_status,
    user_cancel_refund_request,
    get_refund_details,
    user_refund_request,
    get_user_refunds,
)
from utils.permissions import RolePermissionFactory

class CreateVnpayPaymentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'
    def post(self, request):
        try:
            return create_vnpay_payment(request)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VnpayIPNView(APIView):
    def get(self, request):
        try:
            returnData = payment_ipn(request)
            
            # Assuming payment_return is a function that handles the return logic
            return returnData
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class VnpayPaymentReturnView(APIView):
    """Handle VNPay redirect after user completes payment.
    No auth required — VNPay redirects the browser here.
    Validates via VNPay checksum, then redirects to FE result page.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            return payment_return(request)
        except Exception as e:
            from django.conf import settings
            from django.http import HttpResponseRedirect
            import urllib.parse
            fe_url = settings.FRONTEND_URL
            redirect_url = f"{fe_url}/payment/result?status=error&message={urllib.parse.quote_plus(str(e))}"
            return HttpResponseRedirect(redirect_url)

class CreatePaymentRecordView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def post(self, request):
        try:
            data = request.data.copy()
            data['user_id'] = request.user.id  # enforce from token, prevent IDOR
            payment = create_payment(data)
            return Response(payment, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class RefundDetailView(APIView):
    """Refund detail management (previously at vnpay/return/)"""
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'payment'

    def get(self, request):
        try:
            payment_id = request.query_params.get('payment_id')
            payment_details_ids = request.query_params.getlist('payment_details_ids')
            payment_details_ids = [int(pid) for pid in payment_details_ids]
            refund_details = get_refund_details(payment_id, payment_details_ids, request.user)
            return Response(refund_details, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def post(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            reason = request.data.get('reason')
            returnData = user_refund_request(payment_id, payment_details_ids, request.user, reason)
            return Response(returnData, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def put(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            user_cancel_refund_request(payment_id, payment_details_ids, request.user)
            return Response({"message": "Refund request cancelled successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminRefundUpdateView(APIView):
    """Admin-only endpoint for updating refund status."""
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'payment'

    def patch(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            refund_status = request.data.get('status')
            response_code = request.data.get('response_code')
            transaction_id = request.data.get('transaction_id')
            admin_update_refund_status(payment_id, payment_details_ids, refund_status, response_code, transaction_id)
            return Response({"message": "Refund status updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentStatusView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, payment_id):
        try:
            data = get_payment_status(payment_id, request.user)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CheckEnrollmentView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, course_id):
        try:
            data = check_enrollment_by_course(course_id, request.user)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserRefundListView(APIView):
    """
    GET /api/refunds/           - list my refund requests (optionally ?status=pending)
    POST /api/refunds/request/  - alias: submit refund (same as VnpayReturnView POST but cleaner URL)
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'payment'

    def get(self, request):
        try:
            refund_status_filter = request.query_params.get('status')
            data = get_user_refunds(request.user, refund_status_filter)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            reason = request.data.get('reason')
            result = user_refund_request(payment_id, payment_details_ids, request.user, reason)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
