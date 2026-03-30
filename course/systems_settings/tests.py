from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient
import jwt

from admins.models import Admin
from users.models import User
from .models import SystemsSetting


class SystemsSettingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        admin_user = User.objects.create(
            username="settings_admin",
            email="settings_admin@example.com",
            password_hash=make_password("Password123"),
            full_name="Settings Admin",
            user_type="admin",
            status="active",
        )
        Admin.objects.create(user=admin_user, department="IT", role="super_admin")

        payload = {
            'user_id': admin_user.id,
            'username': admin_user.username,
            'email': admin_user.email,
            'user_type': ['admin'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_create_accepts_key_value_payload(self):
        response = self.client.post('/api/systems_settings/create/', {
            'key': 'homepage_layout',
            'value': '{"hero":"v2"}',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertEqual(data['key'], 'homepage_layout')
        self.assertEqual(data['value'], '{"hero":"v2"}')
        self.assertEqual(data['setting_group'], 'general')

    def test_patch_accepts_value_alias(self):
        setting = SystemsSetting.objects.create(
            setting_group='general',
            setting_key='payment_gateways',
            setting_value='{"paypal":false}',
            description='payment gateways config',
        )

        response = self.client.patch(
            f'/api/systems_settings/{setting.id}/update/',
            {'value': '{"paypal":true}'},
            format='json'
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data['setting_key'], 'payment_gateways')
        self.assertEqual(data['setting_value'], '{"paypal":true}')
