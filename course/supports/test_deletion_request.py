"""Plan 2 — Support-based course deletion request + admin resolution."""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from courses.models import Course
from enrollments.models import Enrollment
from payments.models import Payment
from payment_details.models import Payment_Details
from supports.models import Support
from supports.services import create_support, resolve_support_request
from utils.test_helpers import make_user


class DeletionRequestTests(TestCase):
    def setUp(self):
        self.owner = make_user("instructor", username="owner_inst")
        self.other = make_user("instructor", username="other_inst")
        self.admin = make_user("admin", username="sup_admin")
        self.course = Course.objects.create(
            title="My Course",
            status=Course.Status.PUBLISHED,
            is_public=True,
            instructor=self.owner.instructor,
        )

    def _payload(self):
        return {
            "ticket_type": "course_deletion_request",
            "course": self.course.id,
            "subject": "Gỡ khóa học",
            "message": "Nội dung lỗi thời, muốn gỡ.",
        }

    def test_non_owner_cannot_request_deletion(self):
        with self.assertRaises(ValidationError):
            create_support(self._payload(), actor=self.other)

    def test_owner_can_request_deletion(self):
        data = create_support(self._payload(), actor=self.owner)
        self.assertEqual(data["ticket_type"], "course_deletion_request")
        self.assertEqual(data["course"], self.course.id)

    def test_deletion_request_requires_course(self):
        payload = self._payload()
        payload.pop("course")
        with self.assertRaises(ValidationError):
            create_support(payload, actor=self.owner)

    def test_admin_resolve_archive_archives_course(self):
        data = create_support(self._payload(), actor=self.owner)
        resolve_support_request(data["id"], "archive", actor=self.admin, notes="ok")
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.ARCHIVED)
        self.assertTrue(self.course.admin_hidden)
        support = Support.objects.get(id=data["id"])
        self.assertEqual(support.status, "resolved")
        self.assertEqual(support.resolution["decision"], "archive")

    def test_admin_resolve_hard_block(self):
        data = create_support(self._payload(), actor=self.owner)
        resolve_support_request(data["id"], "hard_block", actor=self.admin)
        self.course.refresh_from_db()
        self.assertTrue(self.course.is_hard_blocked)

    def test_admin_resolve_hard_block_forces_recent_refund(self):
        buyer = make_user("student", username="blocked_buyer")
        payment = Payment.objects.create(
            user=buyer,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
            amount=Decimal("100.00"),
            total_amount=Decimal("100.00"),
            payment_status=Payment.PaymentStatus.COMPLETED,
        )
        detail = Payment_Details.objects.create(
            payment=payment,
            course=self.course,
            price=Decimal("100.00"),
            final_price=Decimal("100.00"),
        )
        Enrollment.objects.create(
            user=buyer,
            course=self.course,
            payment=payment,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )
        data = create_support(self._payload(), actor=self.owner)

        with patch('payments.refund_services.send_vnpay_refund_request',
                   return_value={'status': 'success', 'message': 'ok',
                                 'transaction_id': 'sup_tx', 'response_code': '00'}):
            resolve_support_request(data["id"], "hard_block", actor=self.admin)

        detail.refresh_from_db()
        support = Support.objects.get(id=data["id"])
        refund = support.resolution["financial"]["refund"]
        self.assertEqual(detail.refund_status, Payment_Details.RefundStatus.SUCCESS)
        self.assertEqual(len(refund["auto_refund_created"]), 1)

    def test_non_admin_cannot_resolve(self):
        data = create_support(self._payload(), actor=self.owner)
        with self.assertRaises(ValidationError):
            resolve_support_request(data["id"], "archive", actor=self.owner)
