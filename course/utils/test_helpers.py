"""Shared test helpers.

Roles are derived from the related Admin/Instructor records (the legacy
``user_type`` column was removed), so tests build users via ``make_user`` which
creates the matching role record, and authenticate with ``auth_client``.
"""
import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from users.models import User


def make_user(role="student", *, username=None, email=None,
              password="Password123", full_name=None, status="active", **extra):
    """Create a User and, for admin/instructor, the role record that grants it."""
    role = role or "student"
    username = username or f"{role}_{User.objects.count() + 1}"
    email = email or f"{username}@example.com"
    full_name = full_name or username.replace("_", " ").title()

    user = User.objects.create(
        username=username,
        email=email,
        password_hash=make_password(password),
        full_name=full_name,
        status=status,
        **extra,
    )

    if role == "admin":
        from admins.models import Admin
        Admin.objects.create(user=user, department="", role="super_admin")
    elif role == "instructor":
        from instructors.models import Instructor
        Instructor.objects.create(user=user)

    return user


def auth_token(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "user_type": [user.user_type],
        "token_type": "access",
        "exp": 9999999999,
        "iat": 1,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_token(user)}")
    return client
