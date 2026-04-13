from functools import wraps
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
import jwt
from django.conf import settings



def role_required(roles, methods=None):
    """
    Decorator kiểm tra token và vai trò người dùng.
    - roles: str hoặc list
    - methods: list các method HTTP cần áp dụng (optional). VD: ['POST', 'PUT']
    """
    if isinstance(roles, str):
        roles = [roles]

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):

            if methods and request.method.upper() not in [m.upper() for m in methods]:
                return view_func(request, *args, **kwargs)


            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise AuthenticationFailed("Thiếu token hoặc sai định dạng.")

            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed("Token đã hết hạn.")
            except jwt.InvalidTokenError:
                raise AuthenticationFailed("Token không hợp lệ.")

            if payload.get("role") not in roles:
                raise PermissionDenied(f"Bạn không có quyền ({roles}) để dùng phương thức {request.method}.")

            request.jwt_payload = payload
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
