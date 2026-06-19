"""Demo-critical regression tests for the purchase -> enrollment -> earning flow.

Focus: idempotency of the VNPay/MoMo IPN side effects. A payment gateway may
deliver the same successful IPN more than once; replaying it must NOT create
duplicate enrollments or duplicate instructor earnings, and must clear the cart.

These tests exercise the service layer directly (no HMAC/gateway needed).
"""
from decimal import Decimal
from html import unescape
import urllib.parse
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.conf import settings
from django.core import mail
from django.test import RequestFactory, TestCase, override_settings
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
from payments.finalization_services import finalize_local_payment_callback
from payments.momo_services import create_momo_payment, momo_payment_return, simulate_momo_ipn_payload
from payments.refund_services import admin_create_refund, admin_refund_action, get_admin_refunds
from payments.services import get_payment_status, list_admin_payments
from payments.vnpay_services import build_vnpay_payment_data, create_enrollments_from_payment, hmacsha512, payment_return
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

    def _make_pending_payment(self, method=Payment.PaymentMethod.MOMO, amount=Decimal("100.00")):
        payment = Payment.objects.create(
            user=self.student,
            amount=amount,
            discount_amount=Decimal("0.00"),
            total_amount=amount,
            payment_status=Payment.PaymentStatus.PENDING,
            payment_method=method,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
            transaction_id=f"pending-{method}-{timezone.now().timestamp()}",
        )
        Payment_Details.objects.create(
            payment=payment, course=self.course,
            price=amount, discount=Decimal("0.00"),
            final_price=amount,
        )
        Cart.objects.get_or_create(user=self.student, course=self.course)
        return payment

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

    @override_settings(
        PAYMENT_GATEWAY_MODE="local",
        FRONTEND_URL="http://localhost:3000",
        PAYMENT_RESULT_URL="http://localhost:3000/payment/result",
    )
    def test_local_mode_momo_create_still_uses_gateway_url(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.MOMO)

        with patch("payments.momo_services.requests.post") as post:
            post.return_value.status_code = 200
            post.return_value.json.return_value = {
                "resultCode": 0,
                "message": "Success",
                "payUrl": "https://test-payment.momo.vn/v2/gateway/pay/demo",
            }
            response = create_momo_payment(payment)

        post.assert_called_once()
        self.assertEqual(response["resultCode"], 0)
        self.assertIn("test-payment.momo.vn", response["payUrl"])

    @override_settings(
        PAYMENT_GATEWAY_MODE="local",
        FRONTEND_URL="http://localhost:3000",
        PAYMENT_RESULT_URL="http://localhost:3000/payment/result",
    )
    def test_local_mode_vnpay_create_still_uses_gateway_url(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.VNPAY)
        request = RequestFactory().get("/api/vnpay/create/")

        response = build_vnpay_payment_data(request, payment=payment)

        self.assertNotIn("/payment/local-gateway", response["payment_url"])
        self.assertIn("vnp_TxnRef=", response["payment_url"])

    @override_settings(PAYMENT_FINALIZE_ON_RETURN=True)
    def test_momo_return_finalizes_payment_without_ipn(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.MOMO)
        payload = simulate_momo_ipn_payload(payment, trans_id=123456, result_code=0)
        request = RequestFactory().get("/api/payments/momo/return/", data=payload)

        momo_payment_return(request)

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, Payment.PaymentStatus.COMPLETED)
        self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)

    @override_settings(PAYMENT_FINALIZE_ON_RETURN=True)
    def test_vnpay_return_finalizes_payment_without_ipn(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.VNPAY)
        params = {
            "vnp_Amount": str(int(payment.total_amount) * 100),
            "vnp_BankCode": "NCB",
            "vnp_OrderInfo": f"Thanh toan don hang {payment.id}",
            "vnp_PayDate": "20260619120000",
            "vnp_ResponseCode": "00",
            "vnp_TmnCode": "TEST",
            "vnp_TransactionNo": "987654",
            "vnp_TxnRef": str(payment.id),
        }
        signing_data = "&".join(
            f"{key}={urllib.parse.quote_plus(str(value))}"
            for key, value in sorted(params.items())
            if key.startswith("vnp_")
        )
        params["vnp_SecureHash"] = hmacsha512(settings.VNPAY_HASH_SECRET_KEY, signing_data)
        request = RequestFactory().get("/api/payments/vnpay/return/", data=params)

        payment_return(request)

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, Payment.PaymentStatus.COMPLETED)
        self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)

    def test_local_callback_success_completes_payment_and_is_idempotent(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.MOMO)

        payload = {
            "provider": "momo",
            "payment_id": payment.id,
            "amount": "100.00",
            "status": "success",
            "code": "0",
            "transaction_id": f"LOCAL-MOMO-{payment.id}",
        }
        finalize_local_payment_callback(self.student, payload)
        finalize_local_payment_callback(self.student, payload)

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, Payment.PaymentStatus.COMPLETED)
        self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)
        self.assertEqual(Cart.objects.filter(user=self.student).count(), 0)
        self.assertEqual(InstructorEarning.objects.filter(payment=payment, course=self.course).count(), 1)

    def test_local_callback_rejects_amount_mismatch(self):
        payment = self._make_pending_payment(Payment.PaymentMethod.VNPAY)

        with self.assertRaises(Exception):
            finalize_local_payment_callback(self.student, {
                "provider": "vnpay",
                "payment_id": payment.id,
                "amount": "99.00",
                "status": "success",
                "code": "00",
                "transaction_id": f"LOCAL-VNPAY-{payment.id}",
            })

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, Payment.PaymentStatus.PENDING)

    @override_settings(PAYMENT_GATEWAY_MODE="local")
    def test_local_admin_refund_does_not_call_external_gateway(self):
        admin_user = User.objects.create(
            username="refund_admin",
            email="refund_admin@example.com",
            password_hash=make_password("password123"),
            full_name="Refund Admin",
            status="active",
        )
        admin = Admin.objects.create(user=admin_user, department="Ops", role="admin")
        create_enrollments_from_payment(self.payment)
        detail = Payment_Details.objects.get(payment=self.payment, course=self.course)

        with patch("payments.refund_services.send_vnpay_refund_request") as vnpay_refund, \
             patch("payments.refund_services.send_momo_refund_request") as momo_refund:
            admin_create_refund(self.payment.id, [detail.id], admin, reason="local refund")

        vnpay_refund.assert_not_called()
        momo_refund.assert_not_called()
        detail.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(detail.refund_status, Payment_Details.RefundStatus.SUCCESS)
        self.assertEqual(self.payment.payment_status, Payment.PaymentStatus.REFUNDED)

    @override_settings(PAYMENT_GATEWAY_MODE="local")
    def test_local_sync_processing_refund_completes_without_external_gateway(self):
        admin_user = User.objects.create(
            username="refund_sync_admin",
            email="refund_sync_admin@example.com",
            password_hash=make_password("password123"),
            full_name="Refund Sync Admin",
            status="active",
        )
        admin = Admin.objects.create(user=admin_user, department="Ops", role="admin")
        create_enrollments_from_payment(self.payment)
        detail = Payment_Details.objects.get(payment=self.payment, course=self.course)
        detail.refund_request_time = timezone.now()
        detail.refund_amount = detail.final_price
        detail.refund_status = Payment_Details.RefundStatus.PROCESSING
        detail.last_gateway_error = "Waiting for gateway"
        detail.save(update_fields=[
            "refund_request_time",
            "refund_amount",
            "refund_status",
            "last_gateway_error",
            "updated_at",
        ])

        with patch("payments.refund_services.send_vnpay_refund_request") as vnpay_refund, \
             patch("payments.refund_services.send_momo_refund_request") as momo_refund:
            result = admin_refund_action("sync", [detail.id], admin)

        vnpay_refund.assert_not_called()
        momo_refund.assert_not_called()
        self.assertEqual(result["errors"], [])
        detail.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(detail.refund_status, Payment_Details.RefundStatus.SUCCESS)
        self.assertEqual(self.payment.payment_status, Payment.PaymentStatus.REFUNDED)

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
