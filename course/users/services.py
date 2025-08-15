from rest_framework.exceptions import ValidationError
from .models import User
from .serializers import Userserializers, UserUpdateBySelfSerializer
from config import settings
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime, timedelta
from django.utils import timezone
import jwt
from utils.mailer.mailer import send_reset_password, send_verify_email
from django.db import transaction
import threading
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
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    if 'password_hash' in data:
        data['password_hash'] = make_password(data['password_hash'])
    serializer = UserUpdateBySelfSerializer(user, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_user = serializer.save()
        return updated_user
    raise ValidationError(serializer.errors)
def update_user_by_admin(user_id, data):
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    serializer = Userserializers(user, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_user = serializer.save()
        return updated_user
    raise ValidationError(serializer.errors)


def delete_user(user_id):
    try:
        user = User.objects.get(user_id=user_id)
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
        users = User.objects.all()
        if not users.exists():
            raise ValidationError({"error": "No users found."})
        serializer = Userserializers(users, many=True)
        return serializer.data
    
def get_user_by_id(user_id):
        try:
            user = User.objects.get(user_id=user_id)
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
        user = serializer.save()
        # Gửi email xác nhận
        token = jwt.encode(
            {'user_id': user.user_id, 'exp': datetime.utcnow() + timedelta(minutes=30)},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )
        verify_link = f"https://example.com/verify?token={token}"
        # Token trả về từ jwt.encode có thể là bytes
        # Token trả về từ jwt.encode có thể là bytes
        # Token trả về từ jwt.encode có thể là bytes
        # Token trả về từ jwt.encode có thể là bytes
        # Token trả về từ jwt.encode có thể là bytes

        threading.Thread(target=send_verify_email, args=(user.email, verify_link)).start()
        
    return serializer.data
def login(data):
    try:
        if data['username'] and data['password']:
            user = User.objects.select_related('instructor', 'admin').get(username=data['username'])
            # print(f"User found: {user}")
    except User.DoesNotExist:
         raise ValidationError({"error": "User not found."})
    if not check_password(data['password'], user.password_hash):
        raise ValidationError({"error": "Invalid password."})
    if user.status != 'active':
        raise ValidationError({"error": "User is not active."})
    user.last_login = timezone.now()
    user.save()
    user_type = []

    admin = getattr(user, "admin", None)
    instructor = getattr(user, "instructor", None)

    if admin:
        user_type.append("admin")
    if instructor:
        user_type.append("instructor")
    payload = {
        'user_id': user.user_id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(minutes=300),
        "iat": datetime.utcnow()
    }
    access_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    refresh_payload = {
        'user_id': user.user_id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(days=3),
        "iat": datetime.utcnow()
    }
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'user_type': user_type,
        }
    }
def refresh_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=JWT_ALGORITHM)
        user = User.objects.select_related('instructor', 'admin').get(user_id=payload["user_id"])
    except jwt.ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except jwt.InvalidTokenError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    user_type = []
    admin = getattr(user, "admin", None)
    instructor = getattr(user, "instructor", None)

    if admin:
        user_type.append("admin")
    if instructor:
        user_type.append("instructor")
    new_payload = {
        'user_id': user.user_id,
        'username': user.username,
        'email': user.email,
        'user_type': user_type,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30),
        "iat": datetime.utcnow()
    }
    new_token = jwt.encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        'access_token': new_token,
        'message': "Token refreshed successfully.",
    }
def active_user(user_id):
    try:
        user = User.objects.get(user_id=user_id)
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
        user = User.objects.get(email=data['email'])
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    reset_token = jwt.encode(
        {'user_id': user.user_id, 'exp': datetime.utcnow() + timedelta(minutes=30)},
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
        payload = jwt.decode(token, JWT_SECRET, algorithms=JWT_ALGORITHM)
        user = User.objects.get(user_id=payload['user_id'])
    except jwt.ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except jwt.InvalidTokenError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    user.password_hash = make_password(new_password)
    user.save()
    return {"message": "Password reset successfully."}
def user_confirm_email(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=JWT_ALGORITHM)
        user = User.objects.get(user_id=payload['user_id'])
    except jwt.ExpiredSignatureError:
        raise ValidationError({"error": "Token has expired."})
    except jwt.InvalidTokenError:
        raise ValidationError({"error": "Invalid token."})
    except User.DoesNotExist:
        raise ValidationError({"error": "User not found."})
    
    if user.status == 'active':
        return {"message": "User is already active."}
    
    user.status = 'active'
    user.save()
    return {"message": "Email confirmed successfully. User is now active."}