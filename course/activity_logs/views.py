from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .services import delete_old_logs, get_activity_logs, log_activity
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import ActivityLogSerializer
from datetime import datetime


class ActivityLogView(APIView):
    permission_classes = [RolePermissionFactory(roles=["admin", "instructor", "student"])]
    throttle_scope = 'burst'

    def get(self, request):
        filters = {}
        user_id = request.query_params.get('user_id')
        action = request.query_params.get('action')
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        if not request.user.user_type == 'admin':
            user_id = request.user.id
        if user_id:
            filters['user_id'] = user_id
        if action:
            filters['action'] = action
        if entity_type:
            filters['entity_type__icontains'] = entity_type
        if entity_id:
            filters['entity_id'] = entity_id
        try:
            logs = get_activity_logs(filters)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return paginate_queryset(logs, request, ActivityLogSerializer)

    def delete(self, request):
        before_str = request.query_params.get("before")
        if not before_str:
            return Response({"error": "Thiếu tham số 'before'. Định dạng yêu cầu: YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cutoff_date = datetime.strptime(before_str, "%Y-%m-%d")
        except ValueError:
            return Response({"error": "Định dạng ngày không hợp lệ. Dùng định dạng: YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count = delete_old_logs(cutoff_date)
        return Response({"message": f"Đã xóa {deleted_count} log trước ngày {before_str}"}, status=status.HTTP_200_OK)