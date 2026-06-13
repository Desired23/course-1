from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.pagination import paginate_queryset, StandardPagination
from utils.permissions import RolePermissionFactory

from .serializers import (
    CreateReportSerializer,
    ReportCaseSerializer,
    ReportCaseDetailSerializer,
    ResolveReportSerializer,
)
from .services import create_report, get_report_cases, get_report_case_detail, resolve_report_case, reopen_report_case


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
            )
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Báo cáo đã được ghi nhận.', 'report_id': report.id}, status=status.HTTP_201_CREATED)


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
