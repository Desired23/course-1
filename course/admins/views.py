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
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset


class AdminManagementView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    def post(self, request,):
        try:
            admin = create_admin(request.data, request)
            print("Admin created successfully:", admin)
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
    def get(self, request):
        try:
            admins = get_admins()
            return paginate_queryset(admins, request, AdminSerializer)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

class AdminDetailView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    def get(self, request, admin_id):
        try:
            admin = get_admin_by_id(admin_id)
            return Response(admin, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)