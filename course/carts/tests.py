from decimal import Decimal

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient

from carts.models import Cart
from courses.models import Course
from users.models import User


class CartBulkDeleteApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.student = User.objects.create(
            username="cart_student",
            email="cart_student@example.com",
            password_hash=make_password("password123"),
            full_name="Cart Student",
            user_type="student",
            status="active",
        )
        self.other_user = User.objects.create(
            username="cart_other",
            email="cart_other@example.com",
            password_hash=make_password("password123"),
            full_name="Cart Other",
            user_type="student",
            status="active",
        )

        self.course_1 = Course.objects.create(
            title="Bulk Cart Course 1",
            shortdescription="desc",
            description="desc",
            instructor_id=None,
            category_id=None,
            subcategory_id=None,
            price=Decimal("100.00"),
            level="beginner",
            language="English",
            duration=120,
            total_lessons=10,
        )
        self.course_2 = Course.objects.create(
            title="Bulk Cart Course 2",
            shortdescription="desc",
            description="desc",
            instructor_id=None,
            category_id=None,
            subcategory_id=None,
            price=Decimal("200.00"),
            level="beginner",
            language="English",
            duration=120,
            total_lessons=10,
        )

        self.owned_cart = Cart.objects.create(user=self.student, course=self.course_1)
        self.other_cart = Cart.objects.create(user=self.other_user, course=self.course_2)

        payload = {
            "user_id": self.student.id,
            "username": self.student.username,
            "email": self.student.email,
            "user_type": ["student"],
            "token_type": "access",
            "exp": 9999999999,
            "iat": 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_bulk_delete_removes_only_owned_items(self):
        url = "/api/carts/bulk-delete/"
        payload = {
            "cart_ids": [self.owned_cart.id, self.other_cart.id, 999999],
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["deleted_count"], 1)
        self.assertEqual(data["deleted_ids"], [self.owned_cart.id])
        self.assertEqual(data["unauthorized_ids"], [self.other_cart.id])
        self.assertEqual(data["missing_ids"], [999999])
        self.assertFalse(Cart.objects.filter(id=self.owned_cart.id).exists())
        self.assertTrue(Cart.objects.filter(id=self.other_cart.id).exists())

    def test_bulk_delete_requires_non_empty_cart_ids(self):
        url = "/api/carts/bulk-delete/"

        response = self.client.post(url, {"cart_ids": []}, format="json")
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertIn("errors", body)
