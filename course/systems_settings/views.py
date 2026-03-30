from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import AllowAny
from utils.permissions import RolePermissionFactory
from .models import SystemsSetting
from .services import (
    get_systems_settings,
    get_systems_setting_by_key,
    get_systems_setting_by_admin_id,
    update_systems_setting,
    create_systems_setting,
    delete_systems_setting,
)
from utils.pagination import paginate_queryset
from .serializers import SystemsSettingSerializer

class SystemsSettingsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            if 'setting_key' in request.query_params:
                setting_key = request.query_params.get('setting_key')
                settings = get_systems_setting_by_key(setting_key)
                return Response(settings, status=status.HTTP_200_OK)
            elif 'admin_id' in request.query_params:
                admin_id = request.query_params.get('admin_id')
                settings = get_systems_setting_by_admin_id(admin_id)
                return paginate_queryset(settings, request, SystemsSettingSerializer)
            else:
                settings = get_systems_settings()
                return paginate_queryset(settings, request, SystemsSettingSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        try:
            settings = create_systems_setting(request.data)
            return Response(settings, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, setting_id):
        try:
            updated_settings = update_systems_setting(setting_id, request.data)
            return Response(updated_settings, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, setting_id):
        try:
            result = delete_systems_setting(setting_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PublicHomeSettingsView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            keys = ['homepage_schema_v2', 'homepage_layout', 'homepage_config']
            rows = (
                SystemsSetting.objects
                .filter(setting_key__in=keys, is_deleted=False)
                .values('setting_key', 'setting_value')
            )
            payload = {row['setting_key']: row['setting_value'] for row in rows}
            return Response(payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
