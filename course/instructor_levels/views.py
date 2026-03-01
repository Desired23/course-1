from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.permissions import RolePermissionFactory
from .serializers import InstructorLevelSerializer
from .services import (
    list_instructor_levels,
    create_instructor_level,
    update_instructor_level,
    delete_instructor_level,
    check_and_upgrade_instructor_levels,
)


class InstructorLevelListCreateView(APIView):
    """
    GET  /api/instructor-levels/         — list tất cả level (public / admin)
    POST /api/instructor-levels/         — tạo level mới (admin)
    """
    throttle_scope = 'burst'
    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [RolePermissionFactory(['admin'])()]

    def get(self, request):
        levels = list_instructor_levels()
        serializer = InstructorLevelSerializer(levels, many=True)
        return Response(serializer.data)

    def post(self, request):
        try:
            level = create_instructor_level(request.data)
            return Response(InstructorLevelSerializer(level).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorLevelDetailView(APIView):
    """
    GET    /api/instructor-levels/<id>/  — chi tiết level
    PATCH  /api/instructor-levels/<id>/  — cập nhật (admin)
    DELETE /api/instructor-levels/<id>/  — xóa mềm (admin)
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request, level_id):
        from .models import InstructorLevel
        try:
            level = InstructorLevel.objects.get(id=level_id, is_deleted=False)
        except InstructorLevel.DoesNotExist:
            return Response({"error": "Không tìm thấy level."}, status=status.HTTP_404_NOT_FOUND)
        return Response(InstructorLevelSerializer(level).data)

    def patch(self, request, level_id):
        try:
            level = update_instructor_level(level_id, request.data)
            return Response(InstructorLevelSerializer(level).data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, level_id):
        try:
            result = delete_instructor_level(level_id, request.user)
            return Response(result)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorLevelUpgradeCheckView(APIView):
    """
    POST /api/instructor-levels/upgrade-check/
    Trigger kiểm tra và nâng level tự động cho tất cả instructor
    dựa trên tổng số phút học qua subscription plan.
    (Admin job — gọi thủ công hoặc từ cron)
    """
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request):
        result = check_and_upgrade_instructor_levels()
        return Response(result)
