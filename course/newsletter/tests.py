from django.test import TestCase
from unittest.mock import patch

from .services import _send_bulk


class NewsletterEmailTests(TestCase):
    @patch("utils.mailer.mailer.send_newsletter", side_effect=[True, False])
    def test_bulk_send_counts_only_successful_emails(self, _send_newsletter):
        with self.assertLogs("newsletter.services", level="INFO") as logs:
            _send_bulk(["first@example.com", "second@example.com"], "Subject", "Content")

        self.assertIn("Bulk send finished: 1/2 delivered.", "\n".join(logs.output))
