from django.test import TestCase

from activity_logs.models import ActivityLog
from activity_logs.serializers import ActivityLogSerializer
from users.models import User


class ActivityLogSerializerTests(TestCase):
    def test_includes_user_display_fields(self):
        user = User.objects.create(
            username="learner",
            email="learner@example.com",
            full_name="Learner One",
            password_hash="hash",
            avatar="https://example.com/avatar.png",
        )
        log = ActivityLog.objects.create(
            user=user,
            action="LOGIN",
            description="User logged in",
        )

        data = ActivityLogSerializer(log).data

        self.assertEqual(data["user"], user.id)
        self.assertEqual(data["user_id"], user.id)
        self.assertEqual(data["user_name"], "Learner One")
        self.assertEqual(data["user_email"], "learner@example.com")
        self.assertEqual(data["user_avatar"], "https://example.com/avatar.png")

    def test_keeps_user_fields_empty_for_system_logs(self):
        log = ActivityLog.objects.create(
            action="OTHER",
            description="System event",
        )

        data = ActivityLogSerializer(log).data

        self.assertIsNone(data["user"])
        self.assertIsNone(data["user_id"])
        self.assertIsNone(data["user_name"])
        self.assertIsNone(data["user_email"])
        self.assertIsNone(data["user_avatar"])
