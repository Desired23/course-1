import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from admins.models import Admin
from users.models import User
from .models import RegistrationForm


def build_access_token(user):
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


class RegistrationFormAdminActorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            username="rf-admin",
            email="rf-admin@example.com",
            password_hash="hashed",
            full_name="Registration Admin",
            user_type="admin",
            status="active",
        )
        self.admin = Admin.objects.create(user=self.admin_user, department="IT", role="super_admin")
        self.other_user = User.objects.create(
            username="rf-other",
            email="rf-other@example.com",
            password_hash="hashed",
            full_name="Other User",
            user_type="student",
            status="active",
        )
        token = build_access_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_create_form_uses_authenticated_admin_actor(self):
        response = self.client.post(
            "/api/registration-forms/",
            {
                "type": RegistrationForm.FormType.INSTRUCTOR_APPLICATION,
                "title": "Instructor Form",
                "description": "Apply now",
                "created_by": self.other_user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        form = RegistrationForm.objects.get(title="Instructor Form")
        self.assertEqual(form.created_by_id, self.admin.id)
        self.assertEqual(response.data["created_by"], self.admin_user.id)
        self.assertEqual(response.data["created_by_admin_id"], self.admin.id)


