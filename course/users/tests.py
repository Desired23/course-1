"""Main-flow tests for authentication and role derivation.

Roles are derived from Admin/Instructor records (no legacy user_type column);
these tests lock in that contract plus the core auth service flows.
"""
from django.test import TestCase

from admins.models import Admin
from instructors.models import Instructor
from users.models import User
from users.services import login, refresh_token, register, get_users
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

    def test_login_then_refresh_issues_tokens(self):
        make_user("student", username="loginer", password="Password123")
        result = login({"username": "loginer", "password": "Password123"})
        self.assertIn("access_token", result)
        self.assertIn("refresh_token", result)
        self.assertEqual(result["user"]["roles"], ["student"])

        refreshed = refresh_token(result["refresh_token"])
        self.assertIn("access_token", refreshed)
        self.assertIn("refresh_token", refreshed)


class GetUsersFilterTests(TestCase):
    def test_filter_by_role_uses_role_records(self):
        make_user("admin", username="a1")
        make_user("instructor", username="i1")
        make_user("student", username="s1")
        make_user("student", username="s2")

        self.assertEqual(get_users({"user_type": "admin"}).count(), 1)
        self.assertEqual(get_users({"user_type": "instructor"}).count(), 1)
        self.assertEqual(get_users({"user_type": "student"}).count(), 2)
