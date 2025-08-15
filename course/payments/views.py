from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .vnpay_services import create_vnpay_payment, send_vnpay_refund_request
from .vnpay_services import  payment_ipn
from .services import create_payment
from .refund_services import admin_update_refund_status, user_cancel_refund_request, get_refund_details, user_refund_request

class CreateVnpayPaymentView(APIView):
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
class CreatePaymentRecordView(APIView):
    def post(self, request):
        try:
            payment = create_payment(request.data)
            return Response(payment, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class VnpayReturnView(APIView):
    def get (self, request):
        try:
            refund_details = get_refund_details(request.data.get('payment_id'), request.data.get('payment_details_ids'))
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def post(self, request):
        try:
            returnData = user_refund_request(request)
            return Response(returnData, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def patch (self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            status = request.data.get('status')
            response_code = request.data.get('response_code')
            transaction_id = request.data.get('transaction_id')
            admin_update_refund_status(payment_id, payment_details_ids, status, response_code, transaction_id)
            return Response({"message": "Refund status updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def put (self, request):
        try:
            payment_id = request.data.get('payment_id')
            payment_details_ids = request.data.get('payment_details_ids')
            user_cancel_refund_request(payment_id, payment_details_ids)
            return Response({"message": "Refund request cancelled successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    


