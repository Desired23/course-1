from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient
import jwt

from admins.models import Admin
from users.models import User


class UserManagementViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            username="adminroot",
            email="admin@example.com",
            password_hash=make_password("Password123"),
            full_name="Admin Root",
            user_type="admin",
            status="active",
        )
        Admin.objects.create(user=self.admin_user, department="IT", role="super_admin")

        payload = {
            'user_id': self.admin_user.id,
            'username': self.admin_user.username,
            'email': self.admin_user.email,
            'user_type': ['admin'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        self.student = User.objects.create(
            username="student_search",
            email="student.search@example.com",
            password_hash=make_password("Password123"),
            full_name="Student Search",
            user_type="student",
            status="active",
        )
        self.instructor = User.objects.create(
            username="instructor_demo",
            email="teacher@example.com",
            password_hash=make_password("Password123"),
            full_name="Teaching Demo",
            user_type="instructor",
            status="banned",
        )
        self.deleted_user = User.objects.create(
            username="deleted_user",
            email="deleted@example.com",
            password_hash=make_password("Password123"),
            full_name="Deleted User",
            user_type="student",
            status="inactive",
            is_deleted=True,
        )

    def test_list_users_supports_search(self):
        response = self.client.get('/api/users/', {'search': 'student search'})

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        result_ids = [item['id'] for item in data['results']]

        self.assertIn(self.student.id, result_ids)
        self.assertNotIn(self.instructor.id, result_ids)
        self.assertNotIn(self.deleted_user.id, result_ids)

    def test_list_users_supports_status_and_user_type_filters(self):
        response = self.client.get('/api/users/', {'status': 'banned', 'user_type': 'instructor'})

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()

        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['id'], self.instructor.id)
