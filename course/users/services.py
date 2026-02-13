from rest_framework.exceptions import ValidationError
from .models import User
from .serializers import Userserializers, UserUpdateBySelfSerializer
from config import settings
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime, timedelta
from django.utils import timezone
from jwt import encode, decode, ExpiredSignatureError
from jwt.exceptions import DecodeError
import jwt
from utils.mailer.mailer import send_reset_password, send_verify_email
from django.db import transaction
import threading
from activity_logs.services import log_activity
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"

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
        data['password_hash'] = make_password(data['password_hash'])
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
        user.delete()
        return {"message": "User deleted successfully."}
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})

def validate_user_data(data):
    serializer = Userserializers(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}
def get_users():
        users = User.objects.select_related('instructor', 'admin').all()
        if not users.exists():
            raise ValidationError({"error": "No users found."})
        serializer = Userserializers(users, many=True)
        return serializer.data
    
def get_user_by_id(user_id):
        try:
            user = User.objects.select_related('instructor', 'admin').get(id=user_id)
            serializer = Userserializers(user)
            return serializer.data
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
        # Gửi email xác nhận
        token = encode(
            {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(minutes=30)},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )
        verify_link = f"https://example.com/verify?token={token}"
        threading.Thread(target=send_verify_email, args=(user.email, verify_link)).start()
        log_activity(
            user_id=user.id,
            action="REGISTER",
            entity_type="User",
            entity_id=user.id,
            description="Người dùng đăng ký tài khoản mới"
        )
        
    return serializer.data
def login(data):
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        raise ValidationError({"error": "Username and password are required."})
    try:
            user = User.objects.select_related('instructor', 'admin').get(username=username)
                
            # print(f"User found: {user}")
    except User.DoesNotExist:
         raise ValidationError({"error": "User not found."})
    if not check_password(data['password'], user.password_hash):
        raise ValidationError({"error": "Invalid password."})
    if user.status != 'active':
        raise ValidationError({"error": "User is not active."})
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])  # Only update last_login field to reduce DB overhead
    user_type = ["student"]  


    if hasattr(user, 'admin') and user.admin and not user.admin.is_deleted:  # type: ignore
        user_type.append("admin")
    
    if hasattr(user, 'instructor') and user.instructor and not user.instructor.is_deleted:  # type: ignore
        user_type.append("instructor")
    
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(minutes=300),
        "iat": datetime.utcnow()
    }
    access_token = encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    refresh_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(days=3),
        "iat": datetime.utcnow()
    }
    refresh_token = encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    log_activity(
        user_id=user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description="Người dùng đăng nhập hệ thống"
    )
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
def refresh_token(token):
    try:
        payload = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = User.objects.select_related('instructor', 'admin').get(id=payload["user_id"])
    except ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except DecodeError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    user_type = ["student"]  # Mặc định luôn có student
    
    # select_related đã load sẵn, không tốn thêm query
    if hasattr(user, 'admin') and user.admin and not user.admin.is_deleted:  # type: ignore
        user_type.append("admin")
    
    if hasattr(user, 'instructor') and user.instructor and not user.instructor.is_deleted:  # type: ignore
        user_type.append("instructor")
    
    new_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(minutes=30),
        "iat": datetime.utcnow()
    }
    new_token = encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        'access_token': new_token,
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
def user_reset_password(data):
    try:
        email_raw = data.get('email', '')
        email = email_raw.strip().lower()
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    reset_token = encode(
        {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(minutes=30)},
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
        raise ValidationError({"error": "Token has expired."})
    except DecodeError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    if user.status == 'active':
        return {"message": "User is already active."}
    
    user.status = 'active'
    user.save()
    log_activity(
        user_id=user.id,
        action="EMAIL_VERIFIED",
        entity_type="User",
        entity_id=user.id,
        description="Người dùng xác minh email thành công"
    )
    return {"message": "Email confirmed successfully. User is now active."}

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