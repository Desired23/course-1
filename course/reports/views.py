from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.pagination import paginate_queryset, StandardPagination
from utils.permissions import RolePermissionFactory

from .serializers import (
    AdminCopyrightActionSerializer,
    CopyrightCaseDetailSerializer,
    CopyrightCaseSerializer,
    CopyrightEvidenceSerializer,
    CreateReportSerializer,
    InstructorCopyrightResponseSerializer,
    ReportCaseSerializer,
    ReportCaseDetailSerializer,
    ResolveReportSerializer,
)
from .services import create_report, get_report_cases, get_report_case_detail, resolve_report_case, reopen_report_case
from .copyright_services import (
    admin_action,
    get_admin_case,
    get_case_for_report,
    get_instructor_case,
    get_reporter_case,
    list_admin_cases,
    list_instructor_cases,
    submit_instructor_fix,
    submit_instructor_response,
    submit_reporter_evidence,
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

        payload = {'message': 'Báo cáo đã được ghi nhận.', 'report_id': report.id}
        copyright_case = get_case_for_report(report)
        if copyright_case:
            payload['case_id'] = copyright_case.id
        return Response(payload, status=status.HTTP_201_CREATED)


class AdminReportListView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        cases = get_report_cases({
            'type': request.query_params.get('type'),
            'status': request.query_params.get('status', 'pending'),
            'priority': request.query_params.get('priority'),
            'search': request.query_params.get('search'),
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
        })
        paginator = StandardPagination()
        page = paginator.paginate_queryset(cases, request)
        serializer = ReportCaseSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


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


class ReporterCopyrightCaseDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, case_id):
        try:
            case, messages = get_reporter_case(case_id, request.user)
            return Response(
                CopyrightCaseDetailSerializer(case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


class ReporterCopyrightEvidenceView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, case_id):
        serializer = CopyrightEvidenceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        d = serializer.validated_data
        try:
            case = submit_reporter_evidence(
                case_id=case_id,
                user=request.user,
                message=d.get('message', ''),
                metadata=d.get('metadata') or {},
                attachments=d.get('attachments') or [],
            )
            visible_case, messages = get_reporter_case(case.id, request.user)
            return Response(
                CopyrightCaseDetailSerializer(visible_case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


class InstructorCopyrightCaseListView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            cases = list_instructor_cases(request.user)
            paginator = StandardPagination()
            page = paginator.paginate_queryset(cases, request)
            serializer = CopyrightCaseSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as exc:
            return _error_response(exc)


class InstructorCopyrightCaseDetailView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request, case_id):
        try:
            case, messages = get_instructor_case(case_id, request.user)
            return Response(
                CopyrightCaseDetailSerializer(case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


class InstructorCopyrightResponseView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def post(self, request, case_id):
        serializer = InstructorCopyrightResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        d = serializer.validated_data
        try:
            case = submit_instructor_response(
                case_id=case_id,
                user=request.user,
                response_type=d['response_type'],
                message=d.get('message', ''),
                metadata=d.get('metadata') or {},
                attachments=d.get('attachments') or [],
            )
            visible_case, messages = get_instructor_case(case.id, request.user)
            return Response(
                CopyrightCaseDetailSerializer(visible_case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


class InstructorCopyrightSubmitFixView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def post(self, request, case_id):
        try:
            case = submit_instructor_fix(
                case_id=case_id,
                user=request.user,
                message=request.data.get('message', ''),
            )
            visible_case, messages = get_instructor_case(case.id, request.user)
            return Response(
                CopyrightCaseDetailSerializer(visible_case, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)


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
                deadline_days=d.get('deadline_days') or 7,
                share_reporter_evidence=d.get('share_reporter_evidence', False),
            )
            refreshed, messages = get_admin_case(case.id)
            return Response(
                CopyrightCaseDetailSerializer(refreshed, context={'visible_messages': messages}).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return _error_response(exc)
