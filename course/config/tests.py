from django.test import TestCase
from rest_framework.test import APIClient

from admins.models import Admin
from categories.models import Category
from instructors.models import Instructor
from registration_forms.models import FormQuestion, RegistrationForm
from users.models import User


class ResetDbApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_rejects_invalid_key(self):
        response = self.client.get("/api/reset-db/?key=wrong")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(User.objects.count(), 0)

    def test_resets_and_seeds_baseline(self):
        # Pre-existing data must be wiped by the reset.
        User.objects.create(username="stale", email="stale@example.com", password_hash="x", full_name="Stale")

        response = self.client.get("/api/reset-db/?key=demo-seed-2026")
        self.assertEqual(response.status_code, 200, response.content)

        # 3 blank accounts, one per role.
        self.assertEqual(User.objects.count(), 3)
        self.assertEqual(Admin.objects.count(), 1)
        self.assertEqual(Instructor.objects.count(), 1)
        self.assertEqual(User.objects.get(username="admin").user_type, User.UserTypeChoices.ADMIN)
        self.assertEqual(
            User.objects.get(username="instructor").user_type, User.UserTypeChoices.INSTRUCTOR
        )
        self.assertEqual(User.objects.get(username="student").user_type, User.UserTypeChoices.STUDENT)

        # Active instructor-application form with all questions.
        form = RegistrationForm.objects.get(type=RegistrationForm.FormType.INSTRUCTOR_APPLICATION)
        self.assertTrue(form.is_active)
        self.assertEqual(FormQuestion.objects.filter(form=form).count(), 7)

        # Categories with a parent/child tree.
        self.assertGreater(Category.objects.filter(parent_category__isnull=True).count(), 0)
        self.assertGreater(Category.objects.filter(parent_category__isnull=False).count(), 0)
