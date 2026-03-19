from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import Userserializers, UserUpdateBySelfSerializer, UserSettingsSerializer
from .services import create_user, update_user_by_admin, delete_user, get_users, get_user_by_id, register, login, google_login, refresh_token, user_reset_password, confirm_reset_password, user_confirm_email, resend_verification_email, update_user_by_selfself, get_or_create_user_settings, update_user_settings, deactivate_user_self, delete_user_self, change_password_self
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
            is_admin = bool(hasattr(request.user, 'admin') and getattr(request.user, 'admin', None))
            user_payload = get_user_by_id(user_id=user_id, viewer_id=request.user.id, is_admin=is_admin)
            if user_payload.get("is_private"):
                return Response(user_payload, status=status.HTTP_403_FORBIDDEN)
            return Response(user_payload, status=status.HTTP_200_OK)
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


class UserLogoutView(APIView):
    """Invalidate a refresh token (client should call on logout)."""
    throttle_scope = 'burst'

    def post(self, request):
        from .services import logout_user
        token = request.data.get('refresh_token')
        logout_user(token)
        return Response({"message": "Logged out."}, status=status.HTTP_200_OK)

class RefreshTokenView(APIView):
    throttle_scope = 'burst'

    def post(self, request):
        token = request.data.get('refresh_token')
        if not token:
            return Response({"errors": {"refresh_token": ["This field is required."]}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = refresh_token(token)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    throttle_scope = 'register'

    def post(self, request):
        try:
            result = user_reset_password(request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class ConfirmResetPasswordView(APIView):
    throttle_scope = 'register'

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        if not token or not new_password:
            return Response({"errors": {"error": "Token and new_password are required."}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = confirm_reset_password(token, new_password)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class ConfirmEmailView(APIView):
    throttle_scope = 'burst'

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"errors": {"token": ["This field is required."]}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = user_confirm_email(token)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserGoogleLoginView(APIView):
    throttle_scope = 'login'

    def post(self, request):
        try:
            user = google_login(request.data)
            return Response(user, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class ResendConfirmEmailView(APIView):
    throttle_scope = 'register'

    def post(self, request):
        try:
            result = resend_verification_email(request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserSettingsView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            settings_obj = get_or_create_user_settings(request.user.id)
            return Response(UserSettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            settings_obj = update_user_settings(request.user.id, request.data)
            return Response(UserSettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserDeactivateSelfView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            password = request.data.get('password')
            result = deactivate_user_self(request.user.id, password)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserDeleteSelfView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            password = request.data.get('password')
            result = delete_user_self(request.user.id, password)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserChangePasswordSelfView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            result = change_password_self(request.user.id, current_password, new_password)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
