"""Token-version based session invalidation.

Bumping ``auth_token_version`` must reject every access token issued before the
bump, even though those tokens have not yet expired.
"""
import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from users.models import User, RefreshToken
from users.services import (
    _issue_auth_tokens,
    ban_user,
    change_password_self,
    deactivate_user_self,
    delete_user,
    delete_user_self,
    invalidate_all_sessions,
    update_user_by_admin,
)
from users.token_utils import is_token_version_current
from utils.permissions import RolePermissionFactory
from utils.test_helpers import make_user


def _decode(token):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


class TokenVersionTests(TestCase):
    def setUp(self):
        self.user = make_user("student", username="tv_user")

    def test_issued_access_token_carries_current_version(self):
        tokens = _issue_auth_tokens(self.user)
        payload = _decode(tokens["access_token"])
        self.assertEqual(payload["token_version"], self.user.auth_token_version)

    def test_invalidate_bumps_version_and_revokes_refresh(self):
        tokens = _issue_auth_tokens(self.user)
        refresh_jti = _decode(tokens["refresh_token"])["jti"]

        invalidate_all_sessions(self.user.id)
        self.user.refresh_from_db()

        self.assertEqual(self.user.auth_token_version, 1)
        self.assertIsNotNone(RefreshToken.objects.get(jti=refresh_jti).revoked_at)

    def test_is_token_version_current_detects_stale_token(self):
        old_payload = _decode(_issue_auth_tokens(self.user)["access_token"])
        invalidate_all_sessions(self.user.id)
        self.user.refresh_from_db()

        self.assertFalse(is_token_version_current(self.user, old_payload))
        fresh_payload = _decode(_issue_auth_tokens(self.user)["access_token"])
        self.assertTrue(is_token_version_current(self.user, fresh_payload))


class PermissionLayerTokenVersionTests(TestCase):
    def setUp(self):
        self.user = make_user("student", username="tv_perm_user")
        self.factory = APIRequestFactory()
        self.permission = RolePermissionFactory(["student"])()

    def _check(self, access_token):
        request = self.factory.get("/", HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return self.permission.has_permission(request, None)

    def test_current_token_is_accepted(self):
        token = _issue_auth_tokens(self.user)["access_token"]
        self.assertTrue(self._check(token))

    def test_stale_token_is_rejected_after_invalidation(self):
        stale_token = _issue_auth_tokens(self.user)["access_token"]
        invalidate_all_sessions(self.user.id)
        with self.assertRaises(AuthenticationFailed):
            self._check(stale_token)

    def test_token_issued_after_invalidation_is_accepted(self):
        _issue_auth_tokens(self.user)
        invalidate_all_sessions(self.user.id)
        self.user.refresh_from_db()
        fresh_token = _issue_auth_tokens(self.user)["access_token"]
        self.assertTrue(self._check(fresh_token))


class SessionInvalidationTriggerTests(TestCase):
    def test_change_password_invalidates_old_sessions(self):
        user = make_user("student", username="tv_pw_user", password="OldPass123")
        old_token = _issue_auth_tokens(user)["access_token"]

        result = change_password_self(user.id, "OldPass123", "NewPass456")
        user.refresh_from_db()
        permission = RolePermissionFactory(["student"])()
        factory = APIRequestFactory()

        # Old token rejected.
        old_request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {old_token}")
        with self.assertRaises(AuthenticationFailed):
            permission.has_permission(old_request, None)

        # Freshly issued token from the password change still works.
        new_request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {result['access_token']}")
        self.assertTrue(permission.has_permission(new_request, None))

    def test_ban_invalidates_sessions(self):
        user = make_user("student", username="tv_ban_user")
        _issue_auth_tokens(user)
        ban_user(user.id)
        user.refresh_from_db()
        self.assertEqual(user.auth_token_version, 1)
        self.assertEqual(user.status, User.StatusChoices.BANNED)

    def test_admin_status_update_invalidates_sessions(self):
        user = make_user("student", username="tv_admin_status")
        _issue_auth_tokens(user)
        update_user_by_admin(user.id, {"status": User.StatusChoices.BANNED})
        user.refresh_from_db()
        self.assertEqual(user.auth_token_version, 1)

    def test_admin_delete_invalidates_sessions(self):
        user = make_user("student", username="tv_admin_delete")
        _issue_auth_tokens(user)
        delete_user(user.id)
        user.refresh_from_db()
        self.assertEqual(user.auth_token_version, 1)

    def test_self_deactivate_invalidates_sessions(self):
        user = make_user("student", username="tv_self_deactivate", password="Password123")
        _issue_auth_tokens(user)
        deactivate_user_self(user.id, "Password123")
        user.refresh_from_db()
        self.assertEqual(user.auth_token_version, 1)

    def test_self_delete_invalidates_sessions(self):
        user = make_user("student", username="tv_self_delete", password="Password123")
        _issue_auth_tokens(user)
        delete_user_self(user.id, "Password123")
        user.refresh_from_db()
        self.assertEqual(user.auth_token_version, 1)
