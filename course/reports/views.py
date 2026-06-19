from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.pagination import StandardPagination
from utils.permissions import RolePermissionFactory
from utils.export_helpers import export_content_disposition

from .serializers import (
    AdminCopyrightActionSerializer,
    CopyrightCaseDetailSerializer,
    CopyrightCaseSerializer,
    CreateReportSerializer,
    ReportCaseSerializer,
    ReportCaseDetailSerializer,
    ReportItemDetailSerializer,
    ResolveReportSerializer,
)
from django.http import HttpResponse

from .services import (
    create_report,
    get_report_cases,
    get_report_case_detail,
    get_report_item_detail,
    mark_report_processed,
    mark_report_unprocessed,
    resolve_report_case,
    reopen_report_case,
)
from .stats_services import export_copyright_cases_csv, export_reports_csv, get_report_statistics
from .copyright_services import (
    admin_action,
    get_admin_case,
    list_admin_cases,
)


class ReportCreateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        serializer = CreateReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        try:
            report = create_report(
                reporter=request.user,
                target_type=d['target_type'],
                target_id=d['target_id'],
                reason=d['reason'],
                description=d.get('description', ''),
                metadata=d.get('metadata') or {},
                attachments=d.get('attachments') or [],
            )
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {'message': 'Báo cáo đã được ghi nhận.', 'report_id': report.id},
            status=status.HTTP_201_CREATED,
        )


class AdminReportListView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        cases = get_report_cases({
            'type': request.query_params.get('type'),
            'status': request.query_params.get('status', 'open'),
            'reason': request.query_params.get('reason'),
            'priority': request.query_params.get('priority'),
            'search': request.query_params.get('search'),
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
        })
        paginator = StandardPagination()
        page = paginator.paginate_queryset(cases, request)
        serializer = ReportCaseSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminReportItemDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, report_id):
        try:
            detail = get_report_item_detail(report_id)
        except Exception as exc:
            detail_msg = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReportItemDetailSerializer(detail).data)


class AdminReportMarkProcessedView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, report_id):
        try:
            detail = mark_report_processed(report_id, admin=request.user)
        except Exception as exc:
            detail_msg = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReportItemDetailSerializer(detail).data, status=status.HTTP_200_OK)


class AdminReportMarkUnprocessedView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, report_id):
        try:
            detail = mark_report_unprocessed(report_id, admin=request.user)
        except Exception as exc:
            detail_msg = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReportItemDetailSerializer(detail).data, status=status.HTTP_200_OK)


class AdminReportCaseDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, target_type, target_id):
        try:
            detail = get_report_case_detail(target_type, target_id)
        except Exception as exc:
            detail_msg = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReportCaseDetailSerializer(detail).data)


class AdminReportResolveView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, target_type, target_id):
        serializer = ResolveReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        try:
            resolve_report_case(
                target_type=target_type,
                target_id=target_id,
                action=d['action'],
                notes=d.get('resolution_notes', ''),
                admin=request.user,
            )
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Đã xử lý báo cáo thành công.'}, status=status.HTTP_200_OK)


class AdminReportReopenView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, target_type, target_id):
        try:
            result = reopen_report_case(target_type=target_type, target_id=target_id, admin=request.user)
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


def _error_response(exc):
    detail = getattr(exc, 'detail', str(exc))
    response_status = status.HTTP_403_FORBIDDEN if exc.__class__.__name__ == 'PermissionDenied' else status.HTTP_400_BAD_REQUEST
    return Response({'errors': detail}, status=response_status)


def _collect_report_filters(request):
    keys = [
        'date_from', 'date_to', 'type', 'reason', 'status',
        'copyright_status', 'severity', 'instructor_id', 'course_id', 'group_by',
    ]
    return {k: request.query_params.get(k) for k in keys if request.query_params.get(k)}


class AdminReportStatsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        return Response(get_report_statistics(_collect_report_filters(request)), status=status.HTTP_200_OK)


class AdminReportExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        csv_data = export_reports_csv(_collect_report_filters(request))
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = export_content_disposition('reports', 'csv')
        return response


class AdminCopyrightCaseExportView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        csv_data = export_copyright_cases_csv(_collect_report_filters(request))
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = export_content_disposition('copyright_cases', 'csv')
        return response


class AdminCopyrightCaseListView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        cases = list_admin_cases({
            'status': request.query_params.get('status'),
            'severity': request.query_params.get('severity'),
            'search': request.query_params.get('search'),
        })
        paginator = StandardPagination()
        page = paginator.paginate_queryset(cases, request)
        serializer = CopyrightCaseSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminCopyrightCaseDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, case_id):
        try:
            case, messages = get_admin_case(case_id)
            return Response(
                CopyrightCaseDetailSerializer(case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


class AdminCopyrightActionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, case_id):
        serializer = AdminCopyrightActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        d = serializer.validated_data
        try:
            case = admin_action(
                case_id=case_id,
                actor=request.user,
                action=d['action'],
                message=d.get('message', ''),
                severity=d.get('severity') or None,
                count_as_strike=d.get('count_as_strike', True),
                with_refund=d.get('with_refund', True),
                with_hold=d.get('with_hold', True),
            )
            refreshed, messages = get_admin_case(case.id)
            return Response(
                CopyrightCaseDetailSerializer(refreshed, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)
