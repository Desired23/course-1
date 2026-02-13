# utils/permissions.py
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from django.conf import settings
import jwt
from users.models import User
JWT_SECRET = settings.SECRET_KEY
def RolePermissionFactory(roles):
    class _RolePermission(BasePermission):
        def has_permission(self, request, view):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise AuthenticationFailed("Thiếu token hoặc sai định dạng.")
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                user = User.objects.select_related('instructor','admin').get(id=payload["user_id"])
                # user = User.objects.get(id=payload["user_id"])
                print("User:", user)
                if user.status == User.StatusChoices.BANNED:
                    raise AuthenticationFailed("Tài khoản bị cấm.")
                if user.status == User.StatusChoices.INACTIVE:
                    raise AuthenticationFailed("Tài khoản chưa kích hoạt.")
            except User.DoesNotExist:
                raise AuthenticationFailed("Người dùng không tồn tại.")
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed("Token hết hạn.")
            except jwt.InvalidTokenError:
                raise AuthenticationFailed("Token không hợp lệ.")
            user_type = ["student"]
            admin = getattr(user, "admin", None)
            instructor = getattr(user, "instructor", None)
            if admin:
                user_type.append("admin")
            if instructor:
                user_type.append("instructor")
            if not any(role in roles for role in user_type):
                raise PermissionDenied("Bạn không có quyền truy cập.")
            request.jwt_payload = payload
            request.user = user
            return True

    return _RolePermission
