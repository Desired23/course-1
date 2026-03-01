from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.permissions import RolePermissionFactory
from .services import (
    update_instructor_earning_with_payout,
    generate_instructor_earnings_from_payment,
    get_instructor_earnings,
    get_instructor_earnings_by_instructor_id,
    update_instructor_earning_status,
    calculate_subscription_earnings_for_month,
    get_instructor_earnings_summary,
)
from .serializers import InstructorEarningSerializer
from utils.pagination import paginate_queryset


class InstructorEarningsView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'
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
        source = request.query_params.get('source', None)  # 'retail' | 'subscription'
        try:
            if instructor_id:
                earnings = get_instructor_earnings_by_instructor_id(instructor_id, status_param, source)
                return paginate_queryset(earnings, request, InstructorEarningSerializer)
            else:
                earnings = get_instructor_earnings(status_param, earning_id, source)
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
    throttle_scope = 'burst'
    def patch(self, request, payout_id):
        try:
            earnings_qs = update_instructor_earning_with_payout(payout_id)
            earnings_data = InstructorEarningSerializer(earnings_qs, many=True).data
            return Response(earnings_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionEarningsCalculationView(APIView):
    """
    POST /api/instructor-earnings/subscription-calc/
    Cron job (monthly): Tính và tạo InstructorEarning từ subscription revenue.
    Body: { year: int, month: int }
    """
    permission_classes = [RolePermissionFactory(["admin"])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            year = int(request.data.get('year', 0))
            month = int(request.data.get('month', 0))
            if not (1 <= month <= 12) or year < 2000:
                return Response(
                    {"error": "year và month không hợp lệ."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = calculate_subscription_earnings_for_month(year, month)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorEarningsSummaryView(APIView):
    """
    GET /api/instructor-earnings/summary/?instructor_id=<id>
    Tổng hợp thu nhập của instructor từ 2 nguồn: retail + subscription.
    """
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'

    def get(self, request):
        instructor_id = request.query_params.get('instructor_id')
        if not instructor_id:
            return Response(
                {"error": "instructor_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = get_instructor_earnings_summary(int(instructor_id))
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)