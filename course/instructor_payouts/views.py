from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.permissions import RolePermissionFactory
from utils.roles import is_active_admin, is_active_instructor
from instructor_payouts.services import (
    get_payouts_for_instructor,
    get_all_payouts_as_admin,
    delete_instructor_payout,
    get_payout_detail_by_id,
    auto_create_instructor_payouts,
)
from instructor_payouts.serializers import InstructorPayoutSerializer
from utils.pagination import paginate_queryset
from utils.export_helpers import export_to_csv, export_to_excel
class InstructorPayoutView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        user = request.user
        instructor = getattr(user, "instructor", None)
        is_instructor = is_active_instructor(user)
        admin = is_active_admin(user)

        status_payout = request.query_params.get("status")
        period = request.query_params.get("period")
        processed_by = request.query_params.get("processed_by")
        instructor_id = request.query_params.get("instructor_id")
        payout_id = request.query_params.get("payout_id")

        try:
            if payout_id:
                payouts = get_payout_detail_by_id(payout_id=payout_id)

            elif instructor_id and admin:

                payouts = get_payouts_for_instructor(
                    instructor_id=instructor_id,
                    status=status_payout,
                    period=period
                )
                return paginate_queryset(payouts, request, InstructorPayoutSerializer)

            elif admin:
                payouts = get_all_payouts_as_admin(
                    status=status_payout,
                    period=period,
                    processed_by=processed_by
                )
                return paginate_queryset(payouts, request, InstructorPayoutSerializer)

            elif is_instructor:
                payouts = get_payouts_for_instructor(
                    instructor_id=instructor.id,
                    status=status_payout,
                    period=period
                )
                return paginate_queryset(payouts, request, InstructorPayoutSerializer)

            else:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, payout_id):
        admin = getattr(request.user, 'admin', None)
        if not is_active_admin(request.user):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        if not payout_id:
            return Response({"detail": "Payout ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            delete_instructor_payout(payout_id=payout_id, admin_id=admin.id)
            return Response({"detail": "Payout deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminMonthlyPayoutRunView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        admin = getattr(request.user, 'admin', None)
        if not is_active_admin(request.user):
            return Response({"error": "Admin profile not found."}, status=status.HTTP_403_FORBIDDEN)

        settle_first = str(request.data.get('settle_first', 'true')).lower() not in ('false', '0', 'no')

        try:
            result = auto_create_instructor_payouts(
                processed_by=admin,
                notes=request.data.get('notes', ''),
                settle_first=settle_first,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorPayoutExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        from instructor_payouts.models import InstructorPayout

        fmt = request.query_params.get('format', 'csv')
        if fmt not in {'csv', 'excel'}:
            return Response({'error': 'format must be csv or excel.'}, status=status.HTTP_400_BAD_REQUEST)

        if is_active_admin(request.user):
            instructor_id = request.query_params.get('instructor_id')
            qs = InstructorPayout.objects.filter(is_deleted=False)
            if instructor_id:
                qs = qs.filter(instructor_id=instructor_id)
        elif is_active_instructor(request.user):
            qs = InstructorPayout.objects.filter(
                instructor=request.user.instructor, is_deleted=False
            )
        else:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(request_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(request_date__date__lte=date_to)

        payout_status = request.query_params.get('status')
        if payout_status:
            qs = qs.filter(status=payout_status)

        qs = qs.select_related('instructor__user', 'processed_by__user').order_by('-request_date')

        headers = [
            'ID', 'Instructor', 'Email', 'Amount (VND)', 'Fee (VND)',
            'Net Amount (VND)', 'Payment Method', 'Transaction ID',
            'Status', 'Period', 'Request Date', 'Processed Date',
        ]
        rows = [
            [
                p.id,
                p.instructor.user.full_name if p.instructor and p.instructor.user else '',
                p.instructor.user.email if p.instructor and p.instructor.user else '',
                float(p.amount),
                float(p.fee or 0),
                float(p.net_amount or 0),
                p.payment_method or '',
                p.transaction_id or '',
                p.status,
                p.period or '',
                p.request_date.strftime('%Y-%m-%d') if p.request_date else '',
                p.processed_date.strftime('%Y-%m-%d') if p.processed_date else '',
            ]
            for p in qs
        ]

        if fmt == 'excel':
            return export_to_excel(headers, rows, 'instructor_payouts', 'Payouts')
        return export_to_csv(headers, rows, 'instructor_payouts')
