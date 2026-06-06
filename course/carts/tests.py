"""Main-flow test: cart bulk-delete only removes the caller's own items."""
from decimal import Decimal

from django.test import TestCase

from carts.models import Cart
from courses.models import Course
from utils.test_helpers import auth_client, make_user


class CartBulkDeleteApiTests(TestCase):
    def setUp(self):
        self.student = make_user("student", username="cart_student")
        self.other_user = make_user("student", username="cart_other")
        self.client = auth_client(self.student)

        self.course_1 = Course.objects.create(
            title="Bulk Cart Course 1", shortdescription="desc", description="desc",
            instructor_id=None, category_id=None, subcategory_id=None,
            price=Decimal("100.00"), level="beginner", language="English",
            duration=120, total_lessons=10,
        )
        self.course_2 = Course.objects.create(
            title="Bulk Cart Course 2", shortdescription="desc", description="desc",
            instructor_id=None, category_id=None, subcategory_id=None,
            price=Decimal("200.00"), level="beginner", language="English",
            duration=120, total_lessons=10,
        )
        self.owned_cart = Cart.objects.create(user=self.student, course=self.course_1)
        self.other_cart = Cart.objects.create(user=self.other_user, course=self.course_2)

    def test_bulk_delete_removes_only_owned_items(self):
        response = self.client.post(
            "/api/carts/bulk-delete/",
            {"cart_ids": [self.owned_cart.id, self.other_cart.id, 999999]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["deleted_count"], 1)
        self.assertEqual(data["deleted_ids"], [self.owned_cart.id])
        self.assertEqual(data["unauthorized_ids"], [self.other_cart.id])
        self.assertEqual(data["missing_ids"], [999999])
        self.assertFalse(Cart.objects.filter(id=self.owned_cart.id).exists())
        self.assertTrue(Cart.objects.filter(id=self.other_cart.id).exists())

    def test_bulk_delete_requires_non_empty_cart_ids(self):
        response = self.client.post("/api/carts/bulk-delete/", {"cart_ids": []}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.json())
