from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date as _parse_date
from .models import Admin
from .services import (
    create_admin,
    update_admin,
    delete_admin,
    get_admins,
    get_admin_by_id
    )
from .serializers import AdminSerializer
from .dashboard_services import (
    get_admin_dashboard_stats,
    get_admin_revenue_analytics,
    get_admin_user_analytics,
    get_admin_course_analytics,
    get_admin_revenue_breakdown,
    get_admin_revenue_monthly_breakdown,
    get_admin_commission_analytics,
    get_admin_refund_analytics,
    get_admin_top_courses_by_revenue,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from utils.export_helpers import export_to_csv, export_to_excel


def parse_date_param(raw, end_of_day=False):
    if not raw:
        return None
    parsed = _parse_date(raw)
    if parsed is None:
        raise ValueError(f'Invalid date: {raw}')
    if end_of_day:
        return timezone.datetime(
            parsed.year, parsed.month, parsed.day, 23, 59, 59, 999999,
            tzinfo=timezone.get_current_timezone(),
        )
    return timezone.datetime(parsed.year, parsed.month, parsed.day, tzinfo=timezone.get_current_timezone())


def _clamped_int(raw, default, minimum=1, maximum=100):
    value = int(raw or default)
    return max(minimum, min(value, maximum))


class AdminManagementView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    throttle_scope = 'burst'
    def post(self, request,):
        try:
            admin = create_admin(request.data, request)
            return Response(admin, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, admin_id):
        try:
            updated_admin = update_admin(admin_id, request.data, request)
            return Response(updated_admin, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, admin_id):
        try:
            result = delete_admin(admin_id, request)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class AdminListView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            admins = get_admins()
            return paginate_queryset(admins, request, AdminSerializer)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

class AdminDetailView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    throttle_scope = 'burst'
    def get(self, request, admin_id):
        try:
            admin = get_admin_by_id(admin_id)
            return Response(admin, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)


class AdminDashboardStatsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            data = get_admin_dashboard_stats()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRevenueAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        months = int(request.query_params.get('months', 6))
        return Response(get_admin_revenue_analytics(months))


class AdminUserAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        months = int(request.query_params.get('months', 6))
        return Response(get_admin_user_analytics(months))


class AdminCourseAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        return Response(get_admin_course_analytics())


class AdminRevenueBreakdownView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_breakdown(date_from, date_to))


class AdminRevenueMonthlyBreakdownView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            months = _clamped_int(request.query_params.get('months'), 12, maximum=36)
        except ValueError:
            return Response({'error': 'months must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_monthly_breakdown(months))


class AdminCommissionAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_commission_analytics(date_from, date_to))


class AdminRefundAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_refund_analytics(date_from, date_to))


class AdminTopCoursesByRevenueView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 10, maximum=50)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_top_courses_by_revenue(limit, date_from, date_to))


class AdminRevenueExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from payments.models import Payment

        fmt = request.query_params.get('format', 'csv')
        if fmt not in {'csv', 'excel'}:
            return Response({'error': 'format must be csv or excel.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = (
            Payment.objects
            .filter(payment_status=Payment.PaymentStatus.COMPLETED, is_deleted=False)
            .select_related('user')
            .prefetch_related('payment_details__course')
            .order_by('-payment_date')
        )
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)

        headers = [
            'Payment ID', 'Date', 'User', 'Email', 'Type',
            'Gross (VND)', 'Discount (VND)', 'Net (VND)', 'Method', 'Courses',
        ]
        rows = []
        for payment in qs:
            courses = ', '.join(
                detail.course.title for detail in payment.payment_details.all() if detail.course
            )
            rows.append([
                payment.id,
                payment.payment_date.strftime('%Y-%m-%d %H:%M') if payment.payment_date else '',
                payment.user.full_name if payment.user else '',
                payment.user.email if payment.user else '',
                payment.payment_type,
                float(payment.total_amount or 0),
                float(payment.discount_amount or 0),
                float((payment.total_amount or 0) - (payment.discount_amount or 0)),
                payment.payment_method or '',
                courses,
            ])

        if fmt == 'excel':
            return export_to_excel(headers, rows, 'revenue_report', 'Revenue Report')
        return export_to_csv(headers, rows, 'revenue_report')


class AdminImportSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from .import_services import generate_subscription_import_template

        response = HttpResponse(
            generate_subscription_import_template(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="subscription_import_template.xlsx"'
        return response

    def post(self, request):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from .import_services import import_subscription_plans

        file_obj = request.FILES.get('file')
        plan_id = request.data.get('plan_id')
        if not file_obj:
            return Response({'error': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not plan_id:
            return Response({'error': 'plan_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file_obj.name.lower().endswith('.xlsx'):
            return Response({'error': 'Only .xlsx files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            return Response(import_subscription_plans(file_obj.read(), int(plan_id), request.user))
        except (ValueError, DRFValidationError) as e:
            detail = getattr(e, 'detail', str(e))
            return Response({'error': detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminImportUsersView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from .import_services import generate_users_import_template

        response = HttpResponse(
            generate_users_import_template(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="users_import_template.xlsx"'
        return response

    def post(self, request):
        from .import_services import import_users_bulk

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file_obj.name.lower().endswith('.xlsx'):
            return Response({'error': 'Only .xlsx files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            return Response(import_users_bulk(file_obj.read(), request.user))
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminImportCourseGrantsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from .import_services import generate_course_grants_template

        response = HttpResponse(
            generate_course_grants_template(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="course_grants_template.xlsx"'
        return response

    def post(self, request):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from .import_services import import_course_grants

        file_obj = request.FILES.get('file')
        course_ids_raw = request.data.get('course_ids', '')
        if not file_obj:
            return Response({'error': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not course_ids_raw:
            return Response({'error': 'course_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file_obj.name.lower().endswith('.xlsx'):
            return Response({'error': 'Only .xlsx files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course_ids = [int(x.strip()) for x in str(course_ids_raw).split(',') if x.strip()]
        except ValueError:
            return Response({'error': 'course_ids must be comma-separated integers.'}, status=status.HTTP_400_BAD_REQUEST)

        if not course_ids:
            return Response({'error': 'Select at least one course.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            return Response(import_course_grants(file_obj.read(), course_ids, request.user))
        except (ValueError, DRFValidationError) as e:
            detail = getattr(e, 'detail', str(e))
            return Response({'error': detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
