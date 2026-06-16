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
    get_admin_revenue_by_course,
    get_admin_revenue_by_category,
    get_admin_revenue_by_instructor,
    get_admin_earning_payout_metrics,
    get_admin_subscription_metrics,
    get_admin_promotion_stats,
    get_admin_creation_stats,
    get_admin_best_selling_courses,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from utils.export_helpers import export_to_csv, export_to_excel, export_sheets_to_zip_csv, export_workbook_to_excel


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


def _group_revenue_rows(rows, period):
    grouped = {}
    for row in rows:
        year = row['date'][:4]
        month = int(row['date'][5:7])
        if period == 'quarter':
            key = f"{year}-Q{((month - 1) // 3) + 1}"
        elif period == 'year':
            key = year
        else:
            key = row['date']
        target = grouped.setdefault(key, {
            'date': key,
            'retail': 0,
            'subscription': 0,
            'gross': 0,
            'refunded': 0,
            'net': 0,
            'transactions': 0,
            'estimated_revenue': 0,
            'realized_revenue': 0,
            'refunded_amount': 0,
            'transaction_count': 0,
            'refund_rate': 0,
        })
        for field in ['retail', 'subscription', 'gross', 'refunded', 'net', 'transactions', 'estimated_revenue', 'realized_revenue', 'refunded_amount', 'transaction_count']:
            target[field] += row.get(field, 0) or 0
        target['refund_rate'] = round((target['refunded_amount'] / target['gross'] * 100), 2) if target['gross'] else 0
    return [grouped[key] for key in sorted(grouped)]


def _refund_status_label(status_key):
    labels = {
        'pending': 'Chờ duyệt',
        'processing': 'Đang hoàn tiền',
        'approved': 'Đã duyệt',
        'success': 'Hoàn tiền thành công',
        'rejected': 'Bị từ chối',
        'failed': 'Hoàn tiền thất bại',
        'cancelled': 'Đã hủy',
    }
    return labels.get(status_key, status_key)


def _report_sheet(report_key, date_from=None, date_to=None):
    if report_key in {'revenue_monthly', 'revenue_quarterly', 'revenue_yearly'}:
        period = {
            'revenue_monthly': 'month',
            'revenue_quarterly': 'quarter',
            'revenue_yearly': 'year',
        }[report_key]
        rows = get_admin_revenue_monthly_breakdown(36, date_from, date_to, period)
        rows = _group_revenue_rows(rows, period)
        label = {'month': 'Tháng', 'quarter': 'Quý', 'year': 'Năm'}[period]
        return {
            'title': f'Doanh thu theo {label.lower()}',
            'headers': [label, 'Doanh thu bán lẻ', 'Doanh thu gói đăng ký', 'Doanh thu gộp', 'Đã hoàn tiền', 'Doanh thu thuần', 'Giao dịch'],
            'rows': [[r['date'], r['retail'], r['subscription'], r['gross'], r['refunded'], r['net'], r['transactions']] for r in rows],
        }

    if report_key == 'realized_revenue':
        rows = get_admin_revenue_monthly_breakdown(36, date_from, date_to, 'month')
        return {
            'title': 'Doanh thu tam tinh va thuc',
            'headers': ['Thoi gian', 'Doanh thu tam tinh', 'Doanh thu thuc', 'Hoan tien', 'Giao dich', 'Ty le hoan tien'],
            'rows': [[r['date'], r['estimated_revenue'], r['realized_revenue'], r['refunded_amount'], r['transaction_count'], r['refund_rate']] for r in rows],
        }

    if report_key == 'revenue_instructor':
        rows = get_admin_revenue_by_instructor(100, date_from, date_to)
        return {
            'title': 'Doanh thu theo giảng viên',
            'headers': ['Giảng viên', 'Doanh thu gộp', 'Thu nhập giảng viên', 'Doanh thu nền tảng', 'Doanh thu bán lẻ', 'Doanh thu gói đăng ký', 'Đang chờ', 'Đã thanh toán', 'Giao dịch'],
            'rows': [[r['instructor_name'], r['gross'], r['instructor_earnings'], r['platform_revenue'], r['retail_revenue'], r['subscription_revenue'], r['pending'], r['paid'], r['transactions']] for r in rows],
        }

    if report_key == 'revenue_course':
        rows = get_admin_revenue_by_course(100, date_from, date_to)
        return {
            'title': 'Doanh thu theo khóa học',
            'headers': ['Khóa học', 'Giảng viên', 'Danh mục', 'Doanh thu', 'Hoàn tiền', 'Doanh thu thuần', 'Giao dịch', 'Ghi danh'],
            'rows': [[r['title'], r['instructor_name'], r['category_name'], r['revenue'], r['refunded'], r['net_revenue'], r['transactions'], r['enrollments']] for r in rows],
        }

    if report_key == 'revenue_category':
        rows = get_admin_revenue_by_category(100, date_from, date_to)
        return {
            'title': 'Doanh thu theo danh mục',
            'headers': ['Danh mục', 'Số khóa học', 'Doanh thu gộp', 'Hoàn tiền', 'Doanh thu thuần', 'Giao dịch'],
            'rows': [[r['category_name'], r['course_count'], r['revenue'], r['refunded'], r['net_revenue'], r['transactions']] for r in rows],
        }

    if report_key in {'subscription_plan', 'subscription_metrics'}:
        data = get_admin_subscription_metrics(date_from, date_to)
        return {
            'title': 'Doanh thu theo gói đăng ký',
            'headers': ['Gói', 'Doanh thu', 'Thanh toán', 'Người đăng ký mới', 'Đang hoạt động', 'Đã hủy', 'Hết hạn', 'Tỷ lệ rời bỏ'],
            'rows': [[r['plan_name'], r['revenue'], r['payments'], r['new_subscribers'], r['active_subscribers'], r['cancelled_subscribers'], r['expired_subscribers'], r['churn_rate']] for r in data['per_plan']],
        }

    if report_key == 'earning_payout':
        data = get_admin_earning_payout_metrics(100, date_from, date_to)
        return {
            'title': 'Thu nhập và chi trả theo giảng viên',
            'headers': ['Giảng viên', 'Thu nhập gộp', 'Thu nhập giảng viên', 'Thu nhập bán lẻ', 'Thu nhập từ gói đăng ký', 'Thu nhập chờ xử lý', 'Thu nhập khả dụng', 'Cần chi trả', 'Thu nhập đã thanh toán', 'Yêu cầu chi trả', 'Chi trả đã xử lý (gộp)', 'Chi trả đã xử lý (thuần)', 'Chi trả đang chờ', 'Chênh lệch đã trả - đã xử lý thuần'],
            'rows': [[r['instructor_name'], r['gross'], r['instructor_earnings'], r['retail_earnings'], r['subscription_earnings'], r['pending_earnings'], r['available_earnings'], r['payable_earnings'], r['paid_earnings'], r['payout_requested'], r['payout_processed'], r['payout_processed_net'], r['payout_pending'], r['settlement_gap']] for r in data['per_instructor']],
        }

    if report_key == 'refunds':
        data = get_admin_refund_analytics(date_from, date_to)
        return {
            'title': 'Hoàn tiền theo trạng thái',
            'headers': ['Trạng thái', 'Số lượng', 'Số tiền'],
            'rows': [[_refund_status_label(status_key), row['count'], row['amount']] for status_key, row in data['breakdown'].items()],
        }

    if report_key == 'promotion_stats':
        rows = get_admin_promotion_stats(date_from, date_to, 500)
        return {
            'title': 'Promotion stats',
            'headers': ['Code', 'Used count', 'Discount amount', 'Revenue after discount', 'Status'],
            'rows': [[r['code'], r['used_count'], r['discount_amount'], r['revenue_after_discount'], r['status']] for r in rows],
        }

    if report_key == 'creation_stats':
        rows = get_admin_creation_stats(date_from, date_to, 'month')
        return {
            'title': 'Creation stats',
            'headers': ['Period', 'New users', 'New instructors', 'New orders', 'New refunds', 'New payouts'],
            'rows': [[r['period'], r['new_users'], r['new_instructors'], r['new_orders'], r['new_refunds'], r['new_payouts']] for r in rows],
        }

    if report_key == 'best_selling_courses':
        rows = get_admin_best_selling_courses(200, date_from, date_to)
        return {
            'title': 'Best-selling courses',
            'headers': ['Course', 'Instructor', 'Paid enrollments', 'Revenue', 'Refunded', 'Rating'],
            'rows': [[r['title'], r['instructor_name'], r['enrollment_count'], r['revenue'], r['refunded'], r['rating']] for r in rows],
        }

    raise ValueError(f'Unsupported report: {report_key}')


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
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
            data = get_admin_dashboard_stats(date_from, date_to)
            return Response(data)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRevenueAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            months = _clamped_int(request.query_params.get('months'), 6, maximum=36)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'months must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_analytics(months, date_from, date_to))


class AdminUserAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            months = _clamped_int(request.query_params.get('months'), 6, maximum=36)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'months must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_user_analytics(months, date_from, date_to))


class AdminCourseAnalyticsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_course_analytics(date_from, date_to))


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
            group_by = request.query_params.get('group_by', 'month')
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'months must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_monthly_breakdown(months, date_from, date_to, group_by))


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


class AdminRevenueByCourseView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 50, maximum=100)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_by_course(limit, date_from, date_to))


class AdminRevenueByCategoryView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 20, maximum=100)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_by_category(limit, date_from, date_to))


class AdminRevenueByInstructorView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 20, maximum=100)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_revenue_by_instructor(limit, date_from, date_to))


class AdminSubscriptionMetricsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_subscription_metrics(date_from, date_to))


class AdminEarningPayoutMetricsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 100, maximum=200)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_earning_payout_metrics(limit, date_from, date_to))


class AdminPromotionStatsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 100, maximum=500)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_promotion_stats(date_from, date_to, limit))


class AdminCreationStatsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            group_by = request.query_params.get('group_by', 'month')
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'date_from/date_to must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_creation_stats(date_from, date_to, group_by))


class AdminBestSellingCoursesView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            limit = _clamped_int(request.query_params.get('limit'), 20, maximum=200)
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
        except ValueError:
            return Response({'error': 'limit must be an integer and dates must be YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_admin_best_selling_courses(limit, date_from, date_to))


class AdminBulkReportExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        fmt = request.query_params.get('format', 'excel')
        if fmt not in {'csv', 'excel'}:
            return Response({'error': 'format must be csv or excel.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_reports = request.query_params.get('reports', '')
        report_keys = [r.strip() for r in raw_reports.split(',') if r.strip()]
        if not report_keys:
            return Response({'error': 'reports is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            date_from = parse_date_param(request.query_params.get('date_from'))
            date_to = parse_date_param(request.query_params.get('date_to'), end_of_day=True)
            sheets = [_report_sheet(key, date_from, date_to) for key in report_keys]
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if fmt == 'csv':
            return export_sheets_to_zip_csv(sheets, 'statistics_reports')
        return export_workbook_to_excel(sheets, 'statistics_reports')


class AdminRevenueExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from payments.models import Payment
        from payment_details.models import Payment_Details

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
            'Gross (VND)', 'Discount (VND)', 'Refunded (VND)', 'Net (VND)', 'Method', 'Courses',
        ]
        rows = []
        for payment in qs:
            details = list(payment.payment_details.all())
            courses = ', '.join(detail.course.title for detail in details if detail.course)
            refunded = sum(
                (detail.refund_amount or 0)
                for detail in details
                if detail.refund_status == Payment_Details.RefundStatus.SUCCESS and not detail.is_deleted
            )
            gross = float(payment.total_amount or 0)
            rows.append([
                payment.id,
                payment.payment_date.strftime('%Y-%m-%d %H:%M') if payment.payment_date else '',
                payment.user.full_name if payment.user else '',
                payment.user.email if payment.user else '',
                payment.payment_type,
                gross,
                float(payment.discount_amount or 0),
                float(refunded),
                gross - float(refunded),
                payment.payment_method or '',
                courses,
            ])

        if fmt == 'excel':
            return export_to_excel(headers, rows, 'revenue_report', 'Revenue Report')
        return export_to_csv(headers, rows, 'revenue_report')


class AdminUserExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from users.models import User

        fmt = request.query_params.get('format', 'csv')
        if fmt not in {'csv', 'excel'}:
            return Response({'error': 'format must be csv or excel.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = User.objects.select_related('instructor', 'admin').filter(is_deleted=False)

        user_status = request.query_params.get('status')
        role = request.query_params.get('role')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if user_status:
            qs = qs.filter(status=user_status)
        if role == 'admin':
            qs = qs.filter(admin__isnull=False, admin__is_deleted=False)
        elif role == 'instructor':
            qs = qs.filter(instructor__isnull=False, instructor__is_deleted=False)
        elif role == 'student':
            qs = qs.filter(admin__isnull=True, instructor__isnull=True)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        headers = ['ID', 'Username', 'Email', 'Full Name', 'Phone', 'Status', 'Role', 'Created At', 'Last Login']
        rows = []
        for u in qs:
            admin_obj = getattr(u, 'admin', None)
            instructor_obj = getattr(u, 'instructor', None)
            if admin_obj and not admin_obj.is_deleted:
                user_role = 'admin'
            elif instructor_obj and not instructor_obj.is_deleted:
                user_role = 'instructor'
            else:
                user_role = 'student'
            rows.append([
                u.id,
                u.username,
                u.email,
                u.full_name or '',
                u.phone or '',
                u.status,
                user_role,
                u.created_at.strftime('%Y-%m-%d') if u.created_at else '',
                u.last_login.strftime('%Y-%m-%d') if u.last_login else '',
            ])

        if fmt == 'excel':
            return export_to_excel(headers, rows, 'users_export', 'Users')
        return export_to_csv(headers, rows, 'users_export')


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
