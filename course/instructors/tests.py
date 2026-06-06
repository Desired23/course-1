"""Main-flow test: promoting a user to instructor via create_instructor."""
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from instructors.models import Instructor
from instructors.services import create_instructor
from users.models import User
from utils.test_helpers import make_user


class CreateInstructorTests(TestCase):
    def test_create_instructor_creates_record_and_grants_role(self):
        user = make_user("student", username="to_be_instructor")

        create_instructor({"user_id": user.id})

        self.assertTrue(Instructor.objects.filter(user=user, is_deleted=False).exists())
        user.refresh_from_db()
        self.assertEqual(user.user_type, User.UserTypeChoices.INSTRUCTOR)

    def test_create_instructor_rejects_existing_instructor(self):
        user = make_user("instructor", username="already_instructor")
        with self.assertRaises(ValidationError):
            create_instructor({"user_id": user.id})
