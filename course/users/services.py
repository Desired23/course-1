from rest_framework.exceptions import ValidationError
from .models import User, UserSettings
from .serializers import Userserializers, UserUpdateBySelfSerializer, UserSettingsSerializer
from config import settings
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime, timedelta, timezone as dt_timezone
from django.utils import timezone
from jwt import encode, decode, ExpiredSignatureError
from jwt.exceptions import DecodeError
import jwt
from utils.mailer.mailer import send_reset_password, send_verify_email
from django.db import transaction
import threading
import re
from activity_logs.services import log_activity
from urllib.parse import urlencode
import requests
import secrets
from .preferences import apply_privacy_to_user_payload
from django.db.models import Q
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 300
REFRESH_TOKEN_DAYS_DEFAULT = 3
REFRESH_TOKEN_DAYS_REMEMBER = 30
EMAIL_VERIFICATION_TOKEN_MINUTES = settings.EMAIL_VERIFICATION_TOKEN_MINUTES
EMAIL_VERIFICATION_TOKEN_TYPE = "email_verification"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def _build_email_verification_link(token):
    query = urlencode({"token": token})
    return f"{settings.FRONTEND_URL}/email-verification?{query}"


def _issue_email_verification_token(user_id):
    payload = {
        "user_id": user_id,
        "token_type": EMAIL_VERIFICATION_TOKEN_TYPE,
        "exp": datetime.now(dt_timezone.utc) + timedelta(minutes=EMAIL_VERIFICATION_TOKEN_MINUTES),
    }
    return encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _send_email_verification(user):
    token = _issue_email_verification_token(user.id)
    verify_link = _build_email_verification_link(token)
    threading.Thread(
        target=send_verify_email,
        args=(user.email, verify_link, EMAIL_VERIFICATION_TOKEN_MINUTES),
        daemon=True,
    ).start()

def create_user(data):
    serializer = Userserializers(data=data)
    if serializer.is_valid(raise_exception=True):
        user = serializer.save()
        return user
    raise ValidationError(serializer.errors)

def update_user_by_selfself(user_id, data):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    if 'password_hash' in data:
        raise ValidationError({"error": "Use change-password endpoint to update password."})
    serializer = UserUpdateBySelfSerializer(user, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_user = serializer.save()
        log_activity(
            user_id=user_id,
            action="PROFILE_UPDATED",
            entity_type="User",
            entity_id=user_id,
            description="Người dùng cập nhật thông tin cá nhân"
        )
        return updated_user
    raise ValidationError(serializer.errors)
def update_user_by_admin(user_id, data):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    serializer = Userserializers(user, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_user = serializer.save()
        return updated_user
    raise ValidationError(serializer.errors)


def delete_user(user_id, request=None):
    try:
        user = User.objects.get(id=user_id)
        if request and hasattr(request, 'user'):
            log_activity(
                user_id=request.user.id,
                action="DELETE_USER",
                entity_type="User",
                entity_id=user_id,
                description="Xóa tài khoản người dùng"
            )

        user.is_deleted = True
        user.deleted_at = timezone.now()
        if request and hasattr(request, 'user'):
            user.deleted_by = request.user
        user.status = User.StatusChoices.INACTIVE
        user.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'status'])
        return {"message": "User deleted successfully."}
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

def validate_user_data(data):
    serializer = Userserializers(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}
def get_users(filters=None):
    filters = filters or {}
    users = User.objects.select_related('instructor', 'admin').filter(is_deleted=False)

    search = (filters.get('search') or '').strip()
    if search:
        search_query = (
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(full_name__icontains=search) |
            Q(phone__icontains=search)
        )
        if search.isdigit():
            search_query |= Q(id=int(search))
        users = users.filter(search_query)

    status = (filters.get('status') or '').strip().lower()
    if status in {
        User.StatusChoices.ACTIVE,
        User.StatusChoices.INACTIVE,
        User.StatusChoices.BANNED,
    }:
        users = users.filter(status=status)

    user_type = (filters.get('user_type') or '').strip().lower()
    if user_type in {
        User.UserTypeChoices.STUDENT,
        User.UserTypeChoices.INSTRUCTOR,
        User.UserTypeChoices.ADMIN,
    }:
        users = users.filter(user_type=user_type)

    return users.order_by('-created_at', '-id')

def get_user_by_id(user_id, viewer_id=None, is_admin=False):
        try:
            user = User.objects.select_related('instructor', 'admin').get(id=user_id)
            serializer = Userserializers(user)
            return apply_privacy_to_user_payload(serializer.data, owner_id=user.id, viewer_id=viewer_id, is_admin=is_admin)
        except User.DoesNotExist:
            raise ValidationError({"error": "User not found."})
def register(data):
    with transaction.atomic():
        data['status'] = 'inactive'
        data['user_type'] = 'student'
        data['password_hash'] = make_password(data['password'])
        data['email'] = data['email'].strip().lower()
        serializer = Userserializers(data=data)
        serializer.is_valid(raise_exception=True)
        user  = serializer.save()
        assert isinstance(user, User)

        _send_email_verification(user)
        log_activity(
            user_id=user.id,
            action="REGISTER",
            entity_type="User",
            entity_id=user.id,
            description="Người dùng đăng ký tài khoản mới"
        )

    return serializer.data


def _build_user_types(user):
    user_type = ["student"]
    if hasattr(user, 'admin') and user.admin and not user.admin.is_deleted:
        user_type.append("admin")
    if hasattr(user, 'instructor') and user.instructor and not user.instructor.is_deleted:
        user_type.append("instructor")
    return user_type


def _issue_auth_tokens(user, remember_me=False):
    user_type = _build_user_types(user)
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'token_type': 'access',
        'exp': datetime.now(dt_timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.now(dt_timezone.utc)
    }
    access_token = encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    from .models import RefreshToken
    refresh_days = REFRESH_TOKEN_DAYS_REMEMBER if remember_me else REFRESH_TOKEN_DAYS_DEFAULT
    expires = datetime.now(dt_timezone.utc) + timedelta(days=refresh_days)
    rt = RefreshToken.objects.create(user=user, expires_at=expires)
    refresh_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'token_type': 'refresh',
        'remember_me': remember_me,
        'exp': expires,
        'jti': rt.jti,
        "iat": datetime.now(dt_timezone.utc)
    }
    refresh_token = encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user_type,
        }
    }


def _validate_google_credential(credential):
    if not credential:
        raise ValidationError({"error": "credential is required."})

    try:
        response = requests.get(
            GOOGLE_TOKENINFO_URL,
            params={"id_token": credential},
            timeout=10,
        )
    except requests.RequestException:
        raise ValidationError({"error": "Failed to validate Google credential."})

    if response.status_code != 200:
        raise ValidationError({"error": "Invalid Google credential."})

    payload = response.json()
    aud = payload.get("aud")
    if aud not in settings.GOOGLE_OAUTH_CLIENT_IDS:
        raise ValidationError({"error": "Google credential audience mismatch."})

    if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValidationError({"error": "Invalid Google issuer."})

    if payload.get("email_verified") not in ("true", True):
        raise ValidationError({"error": "Google account email is not verified."})

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise ValidationError({"error": "Google account has no email."})

    return {
        "email": email,
        "full_name": (payload.get("name") or "").strip(),
        "avatar": payload.get("picture"),
    }


def _generate_unique_google_username(base):
    slug = re.sub(r"[^a-z0-9_]", "", (base or "").lower())
    slug = slug.strip("_")
    if len(slug) < 3:
        slug = "user"
    slug = slug[:30]

    candidate = slug
    if not User.objects.filter(username=candidate).exists():
        return candidate

    for _ in range(10):
        suffix = secrets.token_hex(2)
        candidate = f"{slug[:25]}_{suffix}"
        if not User.objects.filter(username=candidate).exists():
            return candidate

    return f"user_{secrets.token_hex(4)}"


def google_login(data):
    credential = data.get("credential")
    remember_me = data.get('remember_me', False)
    remember_me = str(remember_me).lower() in ['true', '1', 'yes', 'on']
    google_profile = _validate_google_credential(credential)
    email = google_profile["email"]

    user = User.objects.filter(email=email).first()
    if user is None:
        full_name = google_profile["full_name"] or email.split("@")[0]
        username = _generate_unique_google_username(email.split("@")[0])
        user = User.objects.create(
            username=username,
            email=email,
            full_name=full_name,
            password_hash=make_password(None),
            user_type=User.UserTypeChoices.STUDENT,
            status=User.StatusChoices.ACTIVE,
            avatar=google_profile.get("avatar"),
        )
        log_activity(
            user_id=user.id,
            action="REGISTER",
            entity_type="User",
            entity_id=user.id,
            description="NgÆ°á»i dÃ¹ng Ä‘Äƒng kÃ½ tÃ i khoáº£n báº±ng Google"
        )
    else:
        updates = []
        if user.status != User.StatusChoices.ACTIVE:
            user.status = User.StatusChoices.ACTIVE
            updates.append("status")
        if (not user.avatar) and google_profile.get("avatar"):
            user.avatar = google_profile.get("avatar")
            updates.append("avatar")
        if updates:
            user.save(update_fields=updates)

    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    log_activity(
        user_id=user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description="NgÆ°á»i dÃ¹ng Ä‘Äƒng nháº­p báº±ng Google"
    )
    return _issue_auth_tokens(user, remember_me=remember_me)
def login(data):
    username = data.get('username')
    password = data.get('password')
    remember_me = data.get('remember_me', False)
    remember_me = str(remember_me).lower() in ['true', '1', 'yes', 'on']

    if not username or not password:
        raise ValidationError({"error": "Username and password are required."})
    try:
        user = User.objects.select_related('instructor', 'admin').get(username=username)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    if not check_password(data['password'], user.password_hash):
        raise ValidationError({"error": "Invalid password."})
    if user.status != 'active':
        raise ValidationError({"error": "User is not active."})
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    log_activity(
        user_id=user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description="Người dùng đăng nhập hệ thống"
    )
    return _issue_auth_tokens(user, remember_me=remember_me)

def refresh_token(token):
    from .models import RefreshToken
    try:
        payload = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        if payload.get('token_type') != 'refresh':
            raise ValidationError({"error": "Invalid token type. Expected refresh token."})
        jti = payload.get('jti')
        if not jti:
            raise ValidationError({"error": "Missing token identifier."})
        try:
            rt_obj = RefreshToken.objects.get(jti=jti)
        except RefreshToken.DoesNotExist:
            raise ValidationError({"error": "Refresh token invalid."})
        if not rt_obj.is_active():
            raise ValidationError({"error": "Refresh token expired or revoked."})
        user = rt_obj.user
    except ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except DecodeError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    user_type = ["student"]
    if hasattr(user, 'admin') and user.admin and not user.admin.is_deleted:
        user_type.append("admin")
    if hasattr(user, 'instructor') and user.instructor and not user.instructor.is_deleted:
        user_type.append("instructor")


    remember_me = bool(payload.get('remember_me', False))


    refresh_days = REFRESH_TOKEN_DAYS_REMEMBER if remember_me else REFRESH_TOKEN_DAYS_DEFAULT
    new_expires = datetime.now(dt_timezone.utc) + timedelta(days=refresh_days)
    rt_obj.revoked_at = datetime.now(dt_timezone.utc)
    rt_obj.save(update_fields=['revoked_at'])
    new_rt = RefreshToken.objects.create(user=user, expires_at=new_expires, replaced_by=rt_obj)

    new_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'token_type': 'access',
        'exp': datetime.now(dt_timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.now(dt_timezone.utc)
    }
    new_access = encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    refresh_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'token_type': 'refresh',
        'remember_me': remember_me,
        'exp': new_expires,
        'jti': new_rt.jti,
        "iat": datetime.now(dt_timezone.utc)
    }
    new_refresh = encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        'access_token': new_access,
        'refresh_token': new_refresh,
        'message': "Token refreshed successfully.",
    }
def active_user(user_id):
    try:
        user = User.objects.get(id=user_id)
        if user.status == 'active':
            raise ValidationError({"error": "User is already active."})
        user.status = 'active'
        user.save()
        return {"message": "User activated successfully."}
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

def revoke_refresh_token(jti):
    from .models import RefreshToken
    try:
        rt = RefreshToken.objects.get(jti=jti)
        rt.revoked_at = timezone.now()
        rt.save(update_fields=['revoked_at'])
    except RefreshToken.DoesNotExist:
        pass


def revoke_all_refresh_tokens_for_user(user_id):
    from .models import RefreshToken
    RefreshToken.objects.filter(user_id=user_id, revoked_at__isnull=True).update(revoked_at=timezone.now())



def logout_user(refresh_token: str):
    """Decode a refresh token, revoke it in the database.
    Returns True if token was invalidated or False if token was missing/invalid.
    """
    if not refresh_token:
        return False
    try:
        payload = decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        jti = payload.get('jti')
        if jti:
            revoke_refresh_token(jti)
            return True
    except Exception:
        pass
    return False
def user_reset_password(data):
    try:
        email_raw = data.get('email', '')
        email = email_raw.strip().lower()
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    reset_token = encode(
        {'user_id': user.id, 'exp': datetime.now(dt_timezone.utc) + timedelta(minutes=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    reset_link = f"https://example.com/reset-password?token={reset_token}"
    try:
        send_reset_password(user.email, reset_link)
        return {"message": "Reset password email sent."}
    except Exception as e:
        raise ValidationError({"error": f"Failed to send email: {str(e)}"})

def confirm_reset_password(token, new_password):
    try:
        payload = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.objects.get(id=payload['user_id'])
    except ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except DecodeError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    user.password_hash = make_password(new_password)
    user.save()
    log_activity(
        user_id=user.id,
        action="PASSWORD_CHANGED",
        entity_type="User",
        entity_id=user.id,
        description="Người dùng đặt lại mật khẩu"
    )
    return {"message": "Password reset successfully."}

def user_confirm_email(token):
    try:
        payload = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.objects.get(id=payload['user_id'])
    except ExpiredSignatureError:
        try:
            expired_payload = decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM],
                options={"verify_exp": False},
            )
            user_id = expired_payload.get("user_id")
            user = User.objects.get(id=user_id)
            if user.status == 'active':
                return {
                    "message": "Email already verified.",
                    "status": "already_verified",
                }
        except Exception:
            pass
        raise ValidationError({
            "error": "Verification link has expired.",
            "code": "email_verification_expired",
            "action": "request_new_verification_email",
        })
    except DecodeError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    if payload.get("token_type") not in [None, EMAIL_VERIFICATION_TOKEN_TYPE]:
        raise ValidationError({"error": "Invalid token type."})

    if user.status == 'active':
        return {
            "message": "Email already verified.",
            "status": "already_verified",
        }

    user.status = 'active'
    user.save()
    log_activity(
        user_id=user.id,
        action="EMAIL_VERIFIED",
        entity_type="User",
        entity_id=user.id,
        description="Người dùng xác minh email thành công"
    )
    return {
        "message": "Email confirmed successfully. User is now active.",
        "status": "verified",
    }


def resend_verification_email(data):
    email_raw = data.get('email', '')
    email = email_raw.strip().lower()
    if not email:
        raise ValidationError({"email": ["This field is required."]})

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return {"message": "If the account exists, a verification email has been sent."}

    if user.status == 'active':
        return {
            "message": "Email already verified.",
            "status": "already_verified",
        }

    _send_email_verification(user)
    return {
        "message": f"Verification email sent. The link expires in {EMAIL_VERIFICATION_TOKEN_MINUTES} minutes.",
        "status": "verification_sent",
        "expires_in_minutes": EMAIL_VERIFICATION_TOKEN_MINUTES,
    }

def ban_user(user_id, admin_id=None):
    try:
        user = User.objects.get(id=user_id)
        if user.status == 'banned':
            raise ValidationError({"error": "User is already banned."})
        user.status = 'banned'
        user.save()
        log_activity(
            user_id=admin_id,
            action="USER_BANNED",
            entity_type="User",
            entity_id=user_id,
            description=f"Admin khóa tài khoản: {user.username}"
        )
        return {"message": "User banned successfully."}
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

def unban_user(user_id, admin_id=None):
    try:
        user = User.objects.get(id=user_id)
        if user.status != 'banned':
            raise ValidationError({"error": "User is not banned."})
        user.status = 'active'
        user.save()
        log_activity(
            user_id=admin_id,
            action="USER_UNBANNED",
            entity_type="User",
            entity_id=user_id,
            description=f"Admin mở khóa tài khoản: {user.username}"
        )
        return {"message": "User unbanned successfully."}
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})


def get_or_create_user_settings(user_id):
    settings_obj, _ = UserSettings.objects.get_or_create(user_id=user_id)
    return settings_obj


def update_user_settings(user_id, data):
    settings_obj = get_or_create_user_settings(user_id)
    merged_data = dict(data)
    if 'account_preferences' in merged_data:
        existing = settings_obj.account_preferences or {}
        incoming = merged_data.get('account_preferences') or {}
        merged_data['account_preferences'] = {**existing, **incoming}
    if 'notification_preferences' in merged_data:
        existing = settings_obj.notification_preferences or {}
        incoming = merged_data.get('notification_preferences') or {}
        merged_data['notification_preferences'] = {**existing, **incoming}
    if 'privacy_preferences' in merged_data:
        existing = settings_obj.privacy_preferences or {}
        incoming = merged_data.get('privacy_preferences') or {}
        merged_data['privacy_preferences'] = {**existing, **incoming}
    serializer = UserSettingsSerializer(settings_obj, data=merged_data, partial=True)
    if serializer.is_valid(raise_exception=True):
        return serializer.save()
    raise ValidationError(serializer.errors)


def _validate_new_password_policy(new_password):
    if not new_password:
        raise ValidationError({"error": "New password is required."})
    if len(new_password) < 8:
        raise ValidationError({"error": "Password must be at least 8 characters."})
    if not re.search(r"[A-Z]", new_password):
        raise ValidationError({"error": "Password must contain at least one uppercase letter."})
    if not re.search(r"[a-z]", new_password):
        raise ValidationError({"error": "Password must contain at least one lowercase letter."})
    if not re.search(r"[0-9]", new_password):
        raise ValidationError({"error": "Password must contain at least one number."})


def change_password_self(user_id, current_password, new_password):
    if not current_password:
        raise ValidationError({"error": "Current password is required."})
    _validate_new_password_policy(new_password)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    if not check_password(current_password, user.password_hash):
        raise ValidationError({"error": "Current password is incorrect."})
    if check_password(new_password, user.password_hash):
        raise ValidationError({"error": "New password must be different from current password."})

    user.password_hash = make_password(new_password)
    user.save(update_fields=['password_hash'])
    revoke_all_refresh_tokens_for_user(user_id)
    log_activity(
        user_id=user_id,
        action="PASSWORD_CHANGED",
        entity_type="User",
        entity_id=user_id,
        description="NgÆ°á»i dÃ¹ng Ä‘á»•i máº­t kháº©u táº¡i trang cÃ i Ä‘áº·t"
    )
    return {"message": "Password changed successfully."}


def deactivate_user_self(user_id, password):
    if not password:
        raise ValidationError({"error": "Password is required."})
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    if not check_password(password, user.password_hash):
        raise ValidationError({"error": "Invalid password."})

    if user.status == User.StatusChoices.INACTIVE and not user.is_deleted:
        return {"message": "Account is already deactivated."}

    user.status = User.StatusChoices.INACTIVE
    user.save(update_fields=['status'])
    revoke_all_refresh_tokens_for_user(user_id)
    log_activity(
        user_id=user_id,
        action="ACCOUNT_DEACTIVATED",
        entity_type="User",
        entity_id=user_id,
        description="Người dùng tự vô hiệu hóa tài khoản"
    )
    return {"message": "Account deactivated successfully."}


def delete_user_self(user_id, password):
    if not password:
        raise ValidationError({"error": "Password is required."})
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

    if not check_password(password, user.password_hash):
        raise ValidationError({"error": "Invalid password."})

    if user.is_deleted:
        return {"message": "Account is already deleted."}

    user.is_deleted = True
    user.deleted_at = timezone.now()
    user.deleted_by = user
    user.status = User.StatusChoices.INACTIVE
    user.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'status'])
    revoke_all_refresh_tokens_for_user(user_id)
    log_activity(
        user_id=user_id,
        action="ACCOUNT_DELETED",
        entity_type="User",
        entity_id=user_id,
        description="Người dùng tự xóa tài khoản"
    )
    return {"message": "Account deleted successfully."}

