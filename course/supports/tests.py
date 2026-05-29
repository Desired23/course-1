import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from admins.models import Admin
from support_replies.models import SupportReply
from .models import Support
from users.models import User


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


class SupportSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create(
            username="support-student",
            email="support-student@example.com",
            password_hash="hashed",
            full_name="Support Student",
            user_type="student",
            status="active",
        )
        self.other_student = User.objects.create(
            username="support-other",
            email="support-other@example.com",
            password_hash="hashed",
            full_name="Other Student",
            user_type="student",
            status="active",
        )
        self.admin_user = User.objects.create(
            username="support-admin",
            email="support-admin@example.com",
            password_hash="hashed",
            full_name="Support Admin",
            user_type="admin",
            status="active",
        )
        self.admin = Admin.objects.create(user=self.admin_user, department="IT", role="super_admin")

    def _auth(self, user):
        token = build_access_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_support_create_ignores_client_user_and_admin(self):
        self._auth(self.student)
        response = self.client.post(
            "/api/supports/create/",
            {
                "user": self.other_student.id,
                "admin": self.admin.id,
                "name": "Injected",
                "email": "fake@example.com",
                "subject": "Need help",
                "message": "Support body",
                "priority": "high",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        support = Support.objects.get(subject="Need help")
        self.assertEqual(support.user_id, self.student.id)
        self.assertIsNone(support.admin_id)

    def test_student_cannot_view_other_users_support(self):
        support = Support.objects.create(
            user=self.other_student,
            name=self.other_student.full_name,
            email=self.other_student.email,
            subject="Other ticket",
            message="Body",
        )
        self._auth(self.student)

        response = self.client.get(f"/api/supports/?support_id={support.id}")
        self.assertNotEqual(response.status_code, 200, response.content)

    def test_admin_reply_uses_authenticated_actor(self):
        support = Support.objects.create(
            user=self.student,
            name=self.student.full_name,
            email=self.student.email,
            subject="Ticket",
            message="Body",
        )
        self._auth(self.admin_user)

        response = self.client.post(
            "/api/replies/",
            {
                "support": support.id,
                "user": self.other_student.id,
                "admin": None,
                "message": "Admin reply",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        reply = SupportReply.objects.get(support=support)
        self.assertEqual(reply.user_id, self.admin_user.id)
        self.assertEqual(reply.admin_id, self.admin.id)
