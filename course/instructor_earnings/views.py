from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.dateparse import parse_date

from utils.list_params import get_int_param, get_search_param, get_sort_param
from utils.pagination import paginate_queryset
from utils.permissions import RolePermissionFactory
from utils.roles import is_active_admin, is_active_instructor
from utils.export_helpers import export_to_csv, export_to_excel
from .serializers import InstructorEarningSerializer, SubscriptionRevenueBreakdownSerializer
from .services import (
    calculate_subscription_earnings_for_month,
    generate_instructor_earnings_from_payment,
    get_instructor_earnings,
    get_instructor_earnings_by_instructor_id,
    get_instructor_earnings_by_month,
    get_instructor_earnings_summary,
    get_subscription_revenue_breakdown_by_course,
    update_instructor_earning_status,
    update_instructor_earning_with_payout,
)


class InstructorEarningsView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'

    def get(self, request):
        status_param = request.query_params.get('status', None)
        instructor_id_raw = request.query_params.get('instructor_id', None)
        earning_id = request.query_params.get('earning_id', None)
        source = request.query_params.get('source', None)
        search = get_search_param(request)
        sort_by = get_sort_param(
            request,
            allowed_values=['newest', 'oldest', 'earnings_desc', 'earnings_asc', 'course_asc', 'course_desc'],
            default='newest',
        )

        try:
            requested_instructor_id = get_int_param(request, 'instructor_id')
            user = request.user
            admin = is_active_admin(user)
            user_instructor = getattr(user, 'instructor', None)

            scoped_instructor_id = instructor_id_raw
            if not admin:
                if not is_active_instructor(user):
                    return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
                scoped_instructor_id = str(user_instructor.id)
                if requested_instructor_id is not None and requested_instructor_id != user_instructor.id:
                    return Response({"error": "Ban khong co quyen xem earnings cua instructor khac."}, status=status.HTTP_403_FORBIDDEN)
            elif requested_instructor_id is not None:
                scoped_instructor_id = str(requested_instructor_id)

            if scoped_instructor_id:
                earnings = get_instructor_earnings_by_instructor_id(scoped_instructor_id, status_param, source)
            else:
                earnings = get_instructor_earnings(status_param, earning_id, source)

            if earning_id:
                return Response(earnings, status=status.HTTP_200_OK)

            if search:
                earnings = earnings.filter(
                    Q(course__title__icontains=search)
                    | Q(instructor__user__full_name__icontains=search)
                    | Q(user_subscription__plan__name__icontains=search)
                )

            ordering_map = {
                'newest': '-earning_date',
                'oldest': 'earning_date',
                'earnings_desc': '-net_amount',
                'earnings_asc': 'net_amount',
                'course_asc': 'course__title',
                'course_desc': '-course__title',
            }
            earnings = earnings.order_by(ordering_map.get(sort_by, '-earning_date'), '-id')

            return paginate_queryset(earnings, request, InstructorEarningSerializer)
        except ValueError:
            return Response({"error": "instructor_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            earning_id = request.data.get('earning_id', None)
            status_param = request.data.get('status', None)
            if not status_param:
                raise ValidationError("Trang thai khong duoc de trong.")
            updated_earning = update_instructor_earning_status(earning_id, status_param)
            return Response(updated_earning, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InstructorEarningsByPayoutView(APIView):
    throttle_scope = 'burst'

    def patch(self, request, payout_id):
        try:
            earnings_qs = update_instructor_earning_with_payout(payout_id)
            earnings_data = InstructorEarningSerializer(earnings_qs, many=True).data
            return Response(earnings_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionEarningsCalculationView(APIView):
    permission_classes = [RolePermissionFactory(["admin"])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            year = int(request.data.get('year', 0))
            month = int(request.data.get('month', 0))
            if not (1 <= month <= 12) or year < 2000:
                return Response(
                    {"error": "year va month khong hop le."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = calculate_subscription_earnings_for_month(year, month)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorEarningsSummaryView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = is_active_admin(user)
        user_instructor = getattr(user, 'instructor', None)

        try:
            requested_instructor_id = get_int_param(request, 'instructor_id')
        except ValueError:
            return Response({"error": "instructor_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if admin:
            if requested_instructor_id is None:
                return Response(
                    {"error": "instructor_id is required for admin."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instructor_id = requested_instructor_id
        else:
            if not is_active_instructor(user):
                return Response(
                    {"error": "Instructor profile not found."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if requested_instructor_id is not None and requested_instructor_id != user_instructor.id:
                return Response(
                    {"error": "Ban khong co quyen xem summary cua instructor khac."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            instructor_id = user_instructor.id

        try:
            result = get_instructor_earnings_summary(int(instructor_id))
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorSubscriptionRevenueBreakdownView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        admin = is_active_admin(user)
        user_instructor = getattr(user, 'instructor', None)
        search = get_search_param(request)
        sort_by = get_sort_param(
            request,
            allowed_values=['earnings_desc', 'earnings_asc', 'course_asc', 'course_desc', 'share_desc', 'share_asc'],
            default='earnings_desc',
        )

        try:
            requested_instructor_id = get_int_param(request, 'instructor_id')
        except ValueError:
            return Response({"error": "instructor_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if admin:
            if requested_instructor_id is None:
                return Response(
                    {"error": "instructor_id is required for admin."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instructor_id = requested_instructor_id
        else:
            if not is_active_instructor(user):
                return Response(
                    {"error": "Instructor profile not found."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if requested_instructor_id is not None and requested_instructor_id != user_instructor.id:
                return Response(
                    {"error": "Ban khong co quyen xem revenue breakdown cua instructor khac."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            instructor_id = user_instructor.id

        try:
            queryset, total_earnings = get_subscription_revenue_breakdown_by_course(
                int(instructor_id),
                search=search,
                sort_by=sort_by,
            )
            return paginate_queryset(
                queryset,
                request,
                SubscriptionRevenueBreakdownSerializer,
                context={'total_earnings': total_earnings},
            )
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InstructorEarningsMonthlyView(APIView):
    permission_classes = [RolePermissionFactory(["admin", "instructor"])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            months = max(1, min(int(request.query_params.get('months', 12)), 36))
            user = request.user
            admin = is_active_admin(user)
            user_instructor = getattr(user, 'instructor', None)
            if admin:
                instructor_id = get_int_param(request, 'instructor_id')
                if not instructor_id:
                    return Response({'error': 'instructor_id is required for admin.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                if not is_active_instructor(user):
                    return Response({'error': 'Instructor profile not found.'}, status=status.HTTP_403_FORBIDDEN)
                instructor_id = user_instructor.id
            return Response(get_instructor_earnings_by_month(instructor_id, months))
        except ValueError:
            return Response({'error': 'Invalid parameters.'}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({'error': e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorEarningsExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        fmt = request.query_params.get('format', 'csv')
        if fmt not in {'csv', 'excel'}:
            return Response({'error': 'format must be csv or excel.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        admin = is_active_admin(user)
        user_instructor = getattr(user, 'instructor', None)
        try:
            if admin:
                instructor_id = get_int_param(request, 'instructor_id')
                if not instructor_id:
                    return Response({'error': 'instructor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                if not is_active_instructor(user):
                    return Response({'error': 'Instructor profile not found.'}, status=status.HTTP_403_FORBIDDEN)
                instructor_id = user_instructor.id
        except ValueError:
            return Response({'error': 'instructor_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qs = get_instructor_earnings_by_instructor_id(instructor_id)
        except ValidationError as e:
            return Response({'error': e.detail}, status=status.HTTP_400_BAD_REQUEST)

        date_from = parse_date(request.query_params.get('date_from') or '')
        date_to = parse_date(request.query_params.get('date_to') or '')
        if request.query_params.get('date_from') and date_from is None:
            return Response({'error': 'date_from must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.query_params.get('date_to') and date_to is None:
            return Response({'error': 'date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if date_from:
            qs = qs.filter(earning_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(earning_date__date__lte=date_to)

        qs = qs.order_by('-earning_date').select_related('course', 'instructor__user')
        headers = ['ID', 'Date', 'Course', 'Source', 'Gross (VND)', 'Net (VND)', 'Platform Fee Rate', 'Instructor Share Rate', 'Usage Share Rate', 'Status']
        rows = []
        for earning in qs:
            if earning.platform_commission_rate is not None:
                platform_fee = str(earning.platform_commission_rate)
                share_rate = str(earning.instructor_share_rate) if earning.instructor_share_rate is not None else 'Legacy'
            elif earning.payment_id and earning.amount:
                from decimal import Decimal as _D
                amt = _D(str(earning.amount))
                platform_fee = f"{((amt - _D(str(earning.net_amount or 0))) / amt * 100):.2f}" if amt else 'Legacy'
                share_rate = 'Legacy'
            else:
                platform_fee = 'Legacy'
                share_rate = 'Legacy'
            rows.append([
                earning.id,
                earning.earning_date.strftime('%Y-%m-%d') if earning.earning_date else '',
                earning.course.title if earning.course else '',
                'subscription' if earning.user_subscription_id else 'retail',
                float(earning.amount or 0),
                float(earning.net_amount or 0),
                platform_fee,
                share_rate,
                str(earning.usage_share_rate) if earning.usage_share_rate is not None else '',
                earning.status,
            ])

        if fmt == 'excel':
            return export_to_excel(headers, rows, 'instructor_earnings', 'Instructor Earnings')
        return export_to_csv(headers, rows, 'instructor_earnings')
