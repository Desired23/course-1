from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from forum_topics.serializers import ForumTopicSerializer
from qnas.serializers import QnASerializer
from realtime.serializers import MessageSerializer
from reviews.serializers import ReviewSerializer
from utils.pagination import StandardPagination
from utils.permissions import RolePermissionFactory

from .serializers import AdminReportSerializer
from .services import get_admin_reports, resolve_admin_report


class AdminReportListView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        reports = get_admin_reports({
            'type': request.query_params.get('type'),
            'status': request.query_params.get('status'),
            'priority': request.query_params.get('priority'),
            'search': request.query_params.get('search'),
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
        })
        paginator = StandardPagination()
        page = paginator.paginate_queryset(reports, request)
        serializer = AdminReportSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminReportResolveView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, reported_type, reported_id):
        action = request.data.get('action')
        reason = request.data.get('reason') or request.data.get('resolution_notes', '')

        try:
            result = resolve_admin_report(reported_type, reported_id, action, reason)
        except ValueError:
            return Response({'errors': 'Unsupported reported_type'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)

        if reported_type == 'forum_post':
            payload = ForumTopicSerializer(result).data if hasattr(result, 'pk') else result
        elif reported_type == 'qa_question':
            payload = QnASerializer(result).data if hasattr(result, 'pk') else result
        elif reported_type == 'message':
            payload = MessageSerializer(result).data if hasattr(result, 'pk') else result
        else:
            payload = ReviewSerializer(result).data if hasattr(result, 'pk') else result
        return Response(payload, status=status.HTTP_200_OK)
