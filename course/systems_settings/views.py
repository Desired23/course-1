from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import AllowAny
from utils.permissions import RolePermissionFactory
from utils.admin_actors import resolve_admin_actor
from .serializers import PlatformConfigSerializer, PolicyDocumentsSerializer
from .services import (
    get_systems_setting_by_key,
    update_systems_setting,
    create_systems_setting,
    delete_systems_setting,
    get_platform_setting,
    get_public_branding_payload,
    get_public_home_settings_payload,
    list_systems_settings_payload,
)
from utils.pagination import StandardPagination


def paginate_payload(payload, request):
    paginator = StandardPagination()
    result_page = paginator.paginate_queryset(payload, request)
    return paginator.get_paginated_response(result_page)

class PlatformSettingsView(APIView):
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
                settings = list_systems_settings_payload(admin_id=admin_id)
                return paginate_payload(settings, request)
            else:
                settings = list_systems_settings_payload()
                return paginate_payload(settings, request)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        try:
            settings = create_systems_setting(request.data, admin_actor=request.user)
            return Response(settings, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, setting_id):
        try:
            updated_settings = update_systems_setting(setting_id, request.data, admin_actor=request.user)
            return Response(updated_settings, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, setting_id):
        try:
            result = delete_systems_setting(setting_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PlatformConfigView(APIView):
    # Structured read/write of the curated platform settings that admins actually
    # configure (branding + automation), operating directly on the PlatformSetting
    # singleton instead of the legacy key/value emulation.
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        instance = get_platform_setting()
        return Response(PlatformConfigSerializer(instance).data, status=status.HTTP_200_OK)

    def patch(self, request):
        instance = get_platform_setting()
        serializer = PlatformConfigSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=resolve_admin_actor(request.user))
        return Response(serializer.data, status=status.HTTP_200_OK)


class PolicyDocumentsView(APIView):
    # Admin read/write of the platform legal policy documents (terms/privacy/refund/community)
    # stored as rich-text HTML on the PlatformSetting singleton.
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        instance = get_platform_setting()
        return Response(PolicyDocumentsSerializer(instance).data, status=status.HTTP_200_OK)

    def patch(self, request):
        instance = get_platform_setting()
        serializer = PolicyDocumentsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=resolve_admin_actor(request.user))
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicPoliciesView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            instance = get_platform_setting()
            return Response(PolicyDocumentsSerializer(instance).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayoutSettingsView(APIView):
    # Exposes the non-sensitive payout threshold so the instructor UI can validate
    # against the live value instead of a hardcoded mirror. Backend remains the
    # authoritative enforcer in request_instructor_payout.
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        from .services import get_decimal_setting
        from decimal import Decimal
        min_payout = get_decimal_setting('min_payout', default=Decimal('500000'))
        return Response({'min_payout': str(min_payout)}, status=status.HTTP_200_OK)


class PublicHomeSettingsView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            return Response(get_public_home_settings_payload(), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicBrandingView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            return Response(get_public_branding_payload(), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
