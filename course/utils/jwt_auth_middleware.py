import jwt
from django.conf import settings
from users.models import User
from django.utils.timezone import now
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from channels.exceptions import DenyConnection

JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        scope["user"] = None

        if token:
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                user = await get_user(payload["user_id"])
                if user and user.status == "active":
                    user.is_authenticated = True
                    scope["user"] = user
                else:
                    raise DenyConnection()
            except jwt.ExpiredSignatureError:
                raise DenyConnection()
            except jwt.InvalidTokenError:
                raise DenyConnection()

        return await super().__call__(scope, receive, send)
