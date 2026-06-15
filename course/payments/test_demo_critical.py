"""Demo-critical regression tests for the purchase -> enrollment -> earning flow.

Focus: idempotency of the VNPay/MoMo IPN side effects. A payment gateway may
deliver the same successful IPN more than once; replaying it must NOT create
duplicate enrollments or duplicate instructor earnings, and must clear the cart.

These tests exercise the service layer directly (no HMAC/gateway needed).
"""
from decimal import Decimal
from html import unescape

from django.contrib.auth.hashers import make_password
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from admins.models import Admin
from carts.models import Cart
from courses.models import Course
from enrollments.models import Enrollment
from instructor_earnings.models import InstructorEarning
from instructor_earnings.services import generate_instructor_earnings_from_payment
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from payment_details.models import Payment_Details
from payments.models import Payment
from payments.refund_services import get_admin_refunds
from payments.services import get_payment_status, list_admin_payments
from payments.vnpay_services import create_enrollments_from_payment
from utils.mailer.mailer import send_payment_invoice
from users.models import User


class PaymentEnrollmentIdempotencyTests(TestCase):
    def setUp(self):
        level = InstructorLevel.objects.create(
            name="Bronze", description="level",
            min_students=0, min_revenue=Decimal("0"),
            commission_rate=Decimal("30"), plan_commission_rate=Decimal("30"),
        )
        instr_user = User.objects.create(
            username="teacher_demo", email="teacher_demo@example.com",
            password_hash=make_password("password123"),
            full_name="Teacher Demo", status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user, level=level)

        self.student = User.objects.create(
            username="student_demo", email="student_demo@example.com",
            password_hash=make_password("password123"),
            full_name="Student Demo", status="active",
        )

        self.course = Course.objects.create(
            title="Demo Course", shortdescription="x", description="x",
            instructor=self.instructor, category_id=None, subcategory_id=None,
            price=Decimal("100.00"), level="beginner", language="English",
            duration=120, total_lessons=10, thumbnail="/static/img.jpg",
        )

        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("100.00"),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
        )
        Payment_Details.objects.create(
            payment=self.payment, course=self.course,
            price=Decimal("100.00"), discount=Decimal("0.00"),
            final_price=Decimal("100.00"),
        )
        Cart.objects.create(user=self.student, course=self.course)

    def test_completed_payment_creates_single_enrollment_and_clears_cart(self):
        create_enrollments_from_payment(self.payment)

        enrollments = Enrollment.objects.filter(user=self.student, course=self.course)
        self.assertEqual(enrollments.count(), 1)
        self.assertEqual(enrollments.first().status, Enrollment.Status.Active)
        self.assertEqual(Cart.objects.filter(user=self.student).count(), 0)

    def test_replayed_ipn_does_not_duplicate_enrollment(self):
        create_enrollments_from_payment(self.payment)
        # Simulate the gateway re-delivering the same successful IPN.
        create_enrollments_from_payment(self.payment)

        self.assertEqual(
            Enrollment.objects.filter(user=self.student, course=self.course).count(),
            1,
        )

    def test_earnings_generation_is_idempotent(self):
        generate_instructor_earnings_from_payment(self.payment.id)
        generate_instructor_earnings_from_payment(self.payment.id)

        earnings = InstructorEarning.objects.filter(
            payment=self.payment, course=self.course, instructor=self.instructor
        )
        self.assertEqual(earnings.count(), 1)
        # 30% commission on a 100.00 sale -> 70.00 net to the instructor.
        self.assertEqual(earnings.first().net_amount, Decimal("70.00"))

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_payment_invoice_email_renders_vietnamese_course_title(self):
        if hasattr(mail, "outbox"):
            mail.outbox.clear()
        self.course.title = "Tài Chính Cá Nhân & Đầu Tư Thông Minh"
        self.course.save(update_fields=["title"])

        sent = send_payment_invoice(self.student.email, self.payment)

        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        body = unescape(mail.outbox[0].body)
        self.assertIn("HÓA ĐƠN THANH TOÁN", body)
        self.assertIn("Tài Chính Cá Nhân & Đầu Tư Thông Minh", body)

    def test_admin_payment_rows_include_table_fields(self):
        rows = list_admin_payments()
        row = next(item for item in rows if item["payment_id"] == self.payment.id)

        self.assertEqual(row["payment_method"], Payment.PaymentMethod.VNPAY)
        self.assertEqual(row["payment_type"], Payment.PaymentType.COURSE_PURCHASE)
        self.assertIn("gateway_response", row)

    def test_payment_status_includes_admin_detail_fields(self):
        data = get_payment_status(self.payment.id, self.student)

        self.assertEqual(data["user_email"], self.student.email)
        self.assertEqual(data["payment_method"], Payment.PaymentMethod.VNPAY)
        self.assertEqual(data["payment_type"], Payment.PaymentType.COURSE_PURCHASE)
        self.assertIn("payment_date", data)

    def test_admin_refund_rows_include_gateway_and_processor_fields(self):
        admin_user = User.objects.create(
            username="admin_demo",
            email="admin_demo@example.com",
            password_hash=make_password("password123"),
            full_name="Admin Demo",
            status="active",
        )
        admin = Admin.objects.create(user=admin_user, department="Ops", role="admin")
        self.payment.payment_method = Payment.PaymentMethod.MOMO
        self.payment.payment_gateway = "momo"
        self.payment.save(update_fields=["payment_method", "payment_gateway", "updated_at"])
        detail = Payment_Details.objects.get(payment=self.payment, course=self.course)
        detail.refund_request_time = timezone.now()
        detail.refund_amount = detail.final_price
        detail.processed_by = admin
        detail.save(update_fields=["refund_request_time", "refund_amount", "processed_by", "updated_at"])

        rows = get_admin_refunds()
        row = next(item for item in rows if item["refund_id"] == detail.id)

        self.assertEqual(row["payment_method"], Payment.PaymentMethod.MOMO)
        self.assertEqual(row["payment_gateway"], "momo")
        self.assertEqual(row["processed_by"], "Admin Demo")
