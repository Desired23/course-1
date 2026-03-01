from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
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
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset


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
    """GET /api/admin/dashboard/stats/"""
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            data = get_admin_dashboard_stats()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRevenueAnalyticsView(APIView):
    """GET /api/admin/analytics/revenue/?months=6"""
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        months = int(request.query_params.get('months', 6))
        return Response(get_admin_revenue_analytics(months))


class AdminUserAnalyticsView(APIView):
    """GET /api/admin/analytics/users/?months=6"""
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        months = int(request.query_params.get('months', 6))
        return Response(get_admin_user_analytics(months))


class AdminCourseAnalyticsView(APIView):
    """GET /api/admin/analytics/courses/"""
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        return Response(get_admin_course_analytics())