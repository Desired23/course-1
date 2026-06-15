"""Main-flow tests for authentication and role derivation.

Roles are derived from Admin/Instructor records (no legacy user_type column);
these tests lock in that contract plus the core auth service flows.
"""
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core import mail
from django.test import TestCase, override_settings
from jwt import encode
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from unittest.mock import patch

from admins.models import Admin
from instructors.models import Instructor
from users.models import User
from users.services import confirm_reset_password, login, refresh_token, register, get_users, user_reset_password
from utils.mailer.mailer import send_reset_password
from utils.test_helpers import make_user


class RoleDerivationTests(TestCase):
    def test_plain_user_is_student(self):
        user = make_user("student")
        self.assertEqual(user.user_type, User.UserTypeChoices.STUDENT)

    def test_instructor_record_grants_instructor_role(self):
        user = make_user("student")
        Instructor.objects.create(user=user)
        user.refresh_from_db()
        self.assertEqual(user.user_type, User.UserTypeChoices.INSTRUCTOR)

    def test_admin_takes_precedence_over_instructor(self):
        user = make_user("instructor")
        Admin.objects.create(user=user, department="", role="super_admin")
        user.refresh_from_db()
        self.assertEqual(user.user_type, User.UserTypeChoices.ADMIN)

    def test_soft_deleted_role_reverts_to_student(self):
        user = make_user("instructor")
        instr = user.instructor
        instr.is_deleted = True
        instr.save(update_fields=["is_deleted"])
        user.refresh_from_db()
        self.assertEqual(user.user_type, User.UserTypeChoices.STUDENT)


class AuthFlowTests(TestCase):
    def test_register_creates_inactive_student(self):
        register({
            "username": "newbie",
            "email": "newbie@example.com",
            "full_name": "New Bie",
            "password": "Password123",
        })
        user = User.objects.get(username="newbie")
        self.assertEqual(user.status, "inactive")
        self.assertEqual(user.user_type, User.UserTypeChoices.STUDENT)

    @patch("users.services.send_verify_email", return_value=False)
    def test_register_rolls_back_when_verification_email_fails(self, _send_verify_email):
        with self.assertRaises(ValidationError):
            register({
                "username": "mail_fail_user",
                "email": "mail_fail_user@example.com",
                "full_name": "Mail Fail",
                "password": "Password123",
            })

        self.assertFalse(User.objects.filter(username="mail_fail_user").exists())

    @patch("users.services._send_email_verification")
    def test_register_endpoint_returns_created_user(self, _send_email_verification):
        client = APIClient()
        response = client.post("/api/users/register", {
            "username": "api_newbie",
            "email": "Api_Newbie@Example.com",
            "full_name": "API Newbie",
            "password": "Password123",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "api_newbie")
        self.assertEqual(response.data["email"], "api_newbie@example.com")
        self.assertEqual(User.objects.filter(username="api_newbie").count(), 1)

    def test_login_then_refresh_issues_tokens(self):
        make_user("student", username="loginer", password="Password123")
        result = login({"username": "loginer", "password": "Password123"})
        self.assertIn("access_token", result)
        self.assertIn("refresh_token", result)
        self.assertEqual(result["user"]["roles"], ["student"])

        refreshed = refresh_token(result["refresh_token"])
        self.assertIn("access_token", refreshed)
        self.assertIn("refresh_token", refreshed)

    def test_google_user_can_login_with_email_after_password_reset(self):
        user = User.objects.create(
            username="google_learner",
            email="google_learner@example.com",
            full_name="Google Learner",
            password_hash=make_password(None),
            status=User.StatusChoices.ACTIVE,
        )
        reset_token = encode(
            {'user_id': user.id, 'exp': datetime.now(dt_timezone.utc) + timedelta(minutes=30)},
            settings.SECRET_KEY,
            algorithm="HS256",
        )

        confirm_reset_password(reset_token, "Password123")
        result = login({"username": "google_learner@example.com", "password": "Password123"})

        self.assertEqual(result["user"]["email"], "google_learner@example.com")

    @patch("users.services.send_reset_password", return_value=False)
    def test_reset_password_reports_email_send_failure(self, _send_reset_password):
        make_user("student", username="reset_fail", email="reset_fail@example.com")

        with self.assertRaises(ValidationError) as raised:
            user_reset_password({"email": "reset_fail@example.com"})

        self.assertIn("Failed to send reset password email", str(raised.exception.detail))

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="Online Course <no-reply@example.com>",
    )
    def test_reset_password_email_button_uses_reset_link(self):
        if hasattr(mail, "outbox"):
            mail.outbox.clear()
        reset_link = "http://localhost:5173/reset-password?token=abc123"

        self.assertTrue(send_reset_password("learner@example.com", reset_link))

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(f'href="{reset_link}"', mail.outbox[0].body)

class GetUsersFilterTests(TestCase):
    def test_filter_by_role_uses_role_records(self):
        make_user("admin", username="a1")
        make_user("instructor", username="i1")
        make_user("student", username="s1")
        make_user("student", username="s2")

        self.assertEqual(get_users({"user_type": "admin"}).count(), 1)
        self.assertEqual(get_users({"user_type": "instructor"}).count(), 1)
        self.assertEqual(get_users({"user_type": "student"}).count(), 2)
