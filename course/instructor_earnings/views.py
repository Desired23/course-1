from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.permissions import RolePermissionFactory
from .services import update_instructor_earning_with_payout,generate_instructor_earnings_from_payment, get_instructor_earnings, get_instructor_earnings_by_instructor_id, update_instructor_earning_status
from .serializers import InstructorEarningSerializer
from utils.pagination import paginate_queryset


class InstructorEarningsView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]   
    # def post(self, request, payment_id):
    #     try:
    #         results = generate_instructor_earnings_from_payment(payment_id)
    #         return Response(results, status=status.HTTP_201_CREATED)
    #     except ValidationError as e:
    #         return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def get(self, request):
        status_param = request.query_params.get('status', None)
        instructor_id = request.query_params.get('instructor_id', None)
        earning_id = request.query_params.get('earning_id', None)
        try:
            if instructor_id:
                earnings = get_instructor_earnings_by_instructor_id(instructor_id, status_param)
                return paginate_queryset(earnings, request, InstructorEarningSerializer)
            else:
                earnings = get_instructor_earnings(status_param, earning_id)
                if not earning_id:
                    return paginate_queryset(earnings, request, InstructorEarningSerializer)
            return Response(earnings, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST) 
    def patch(self, request):
        try:
            earning_id = request.data.get('earning_id', None)
            status_param = request.data.get('status', None)
            if not status_param:
                raise ValidationError("Trạng thái không được để trống.")
            updated_earning = update_instructor_earning_status(earning_id, status_param)
            return Response(updated_earning, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)   
class InstructorEarningsByPayoutView(APIView):
    # permission_classes = [RolePermissionFactory(["admin", "instructor"])]   
    def patch(self, request, payout_id):
        try:
            earnings_qs = update_instructor_earning_with_payout(payout_id)
            earnings_data = InstructorEarningSerializer(earnings_qs, many=True).data
            return Response(earnings_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)