import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from admins.models import Admin
from registration_forms.models import RegistrationForm
from users.models import User
from .models import Application


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


class ApplicationReviewAdminActorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            username="app-admin",
            email="app-admin@example.com",
            password_hash="hashed",
            full_name="Application Admin",
            user_type="admin",
            status="active",
        )
        self.admin = Admin.objects.create(user=self.admin_user, department="IT", role="super_admin")
        self.student = User.objects.create(
            username="app-student",
            email="app-student@example.com",
            password_hash="hashed",
            full_name="Application Student",
            user_type="student",
            status="active",
        )
        self.other_user = User.objects.create(
            username="app-other",
            email="app-other@example.com",
            password_hash="hashed",
            full_name="Other User",
            user_type="student",
            status="active",
        )
        self.form = RegistrationForm.objects.create(
            type=RegistrationForm.FormType.INSTRUCTOR_APPLICATION,
            title="Instructor Application",
            created_by=self.admin,
        )
        self.application = Application.objects.create(user=self.student, form=self.form, status=Application.Status.PENDING)

        token = build_access_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_review_application_uses_authenticated_admin_actor(self):
        response = self.client.post(
            f"/api/applications/{self.application.id}/review/",
            {
                "action": "approve",
                "reviewed_by": self.other_user.id,
                "admin_notes": "Approved",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.application.refresh_from_db()
        self.assertEqual(self.application.reviewed_by_id, self.admin.id)
        self.assertEqual(response.data["reviewed_by"], self.admin_user.id)
        self.assertEqual(response.data["reviewed_by_admin_id"], self.admin.id)


