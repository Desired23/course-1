from django.test import TestCase
from unittest.mock import patch

from support_replies.models import SupportReply
from support_replies.services import _send_admin_reply_notification
from supports.models import Support
from utils.test_helpers import make_user


class SupportReplyEmailTests(TestCase):
    @patch("utils.mailer.mailer.send_email", return_value=False)
    def test_admin_reply_notification_logs_send_failure(self, _send_email):
        student = make_user("student", username="ticket_owner", email="owner@example.com")
        admin_user = make_user("admin", username="support_admin", email="admin@example.com")
        ticket = Support.objects.create(
            user=student,
            name=student.full_name,
            email=student.email,
            subject="Login issue",
            message="I cannot log in.",
        )
        reply = SupportReply.objects.create(
            support=ticket,
            user=admin_user,
            admin=admin_user.admin,
            message="Please try again.",
        )

        with self.assertLogs("support_replies.services", level="WARNING") as logs:
            _send_admin_reply_notification(reply)

        self.assertIn("Failed to send support reply notification for ticket", "\n".join(logs.output))
