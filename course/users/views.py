from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import Userserializers, UserUpdateBySelfSerializer
from .services import create_user, update_user_by_admin, delete_user, get_users, get_user_by_id, register, login, refresh_token, update_user_by_selfself
from utils.permissions import RolePermissionFactory
from .models import User
from utils.pagination import paginate_queryset
class UserManagementView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    throttle_scope = 'burst'
    def post(self, request):
        try:
            user = create_user(request.data)
            return Response(Userserializers(user).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def get(self, request):
        users = get_users()
        return paginate_queryset(users, request, Userserializers)
    def patch(self, request, user_id):
        try:
            user = update_user_by_admin (user_id,request.data)
            return Response(Userserializers(user).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, user_id):
        try:
            result = delete_user(user_id, request)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class UserDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, user_id):
        try:
            user = get_user_by_id(user_id=user_id)
            serializer = Userserializers(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class UserUpdateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def patch(self, request, user_id):
        # Only the user themselves or admin can update profile
        if request.user.id != user_id and not hasattr(request.user, 'admin'):
            return Response({"error": "Bạn không có quyền cập nhật thông tin người dùng khác."}, status=status.HTTP_403_FORBIDDEN)
        try:
            updated_user = update_user_by_selfself(user_id, request.data)
            return Response(UserUpdateBySelfSerializer(updated_user).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class UserRegisterView(APIView):
    throttle_scope = 'register'

    def post(self, request):
        try:
            user = register(request.data)
            return Response(Userserializers(user).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    throttle_scope = 'login'

    def post(self, request):
        try:
            user = login(request.data)
            return Response(user, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
