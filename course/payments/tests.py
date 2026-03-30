from django.test import TestCase
from django.utils import timezone
from users.models import User as UserModel
from decimal import Decimal
from unittest.mock import patch

# avoid vnpay signature logic during unit tests
import payments.vnpay as _vnpmod
_vnpmod.vnpay.validate_response = lambda self, key: True

# ensure migration for ipn_attempts (tests use sqlite and start from scratch)
from django.contrib.auth.hashers import make_password
import jwt
from django.conf import settings

from payments.models import Payment
from payment_details.models import Payment_Details
from courses.models import Course
from instructors.models import Instructor
from instructor_levels.models import InstructorLevel
from users.models import User
from enrollments.models import Enrollment
from payments.services import create_payment, get_payment_status
from carts.models import Cart
from payments.vnpay_services import (
    _build_vnpay_refund_signature_data,
    hmacsha512,
    send_vnpay_refund_request,
)
from payments.momo_services import (
    _momo_create_response_signature,
    create_momo_payment,
    send_momo_refund_request,
    simulate_momo_ipn,
)




class PaymentStatusServiceTests(TestCase):
    def setUp(self):
        # ensure ipn_attempts column exists in sqlite database
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE payments ADD COLUMN ipn_attempts integer NOT NULL DEFAULT 0;")
        except Exception:
            # column probably already exists or sqlite version restrictions
            pass
        # create instructor and level
        level = InstructorLevel.objects.create(
            name="Bronze", description="level",
            min_students=0, min_revenue=Decimal('0'),
            commission_rate=Decimal('10'), plan_commission_rate=Decimal('10')
        )
        instr_user = UserModel.objects.create(
            username="teacher1",
            email="t1@example.com",
            password_hash=make_password("password123"),
            full_name="Teacher One",
            user_type="instructor", status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user, level=level)

        # student
        self.student = UserModel.objects.create(
            username="student1",
            email="s1@example.com",
            password_hash=make_password("password123"),
            full_name="Student One",
            user_type="student", status="active",
        )

        # create two courses
        self.course1 = Course.objects.create(
            title="Course 1",
            shortdescription="x",
            description="x",
            instructor=self.instructor,
            category_id=None,
            subcategory_id=None,
            price=Decimal('100.00'),
            level="beginner",
            language="English",
            duration=120,
            total_lessons=10,
            thumbnail="/static/img1.jpg",
        )
        self.course2 = Course.objects.create(
            title="Course 2",
            shortdescription="x",
            description="x",
            instructor=self.instructor,
            category_id=None,
            subcategory_id=None,
            price=Decimal('200.00'),
            level="intermediate",
            language="English",
            duration=240,
            total_lessons=20,
            thumbnail="/static/img2.jpg",
        )

        # create payment
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal('300.00'),
            discount_amount=Decimal('50.00'),
            total_amount=Decimal('250.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
        )

        # details for both courses
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course1,
            price=Decimal('100.00'),
            discount=Decimal('0.00'),
            final_price=Decimal('100.00'),
        )
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course2,
            price=Decimal('200.00'),
            discount=Decimal('50.00'),
            final_price=Decimal('150.00'),
        )

        # enrollment for course1
        Enrollment.objects.create(user=self.student, course=self.course1, status=Enrollment.Status.Active)

    def test_get_payment_status_contains_metadata(self):
        data = get_payment_status(self.payment.id, self.student)
        self.assertEqual(data['payment_id'], self.payment.id)
        self.assertEqual(data['payment_status'], Payment.PaymentStatus.COMPLETED)
        self.assertIn('courses', data)
        self.assertEqual(len(data['courses']), 2)

        c1 = data['courses'][0]
        self.assertEqual(c1['course_id'], self.course1.id)
        self.assertEqual(c1['course_thumbnail'], self.course1.thumbnail)
        # slug is not a model field; service returns None
        self.assertIsNone(c1['course_slug'])
        self.assertEqual(c1['instructor_name'], self.instructor.user.full_name)
        self.assertEqual(c1['level'], self.course1.level)
        self.assertEqual(c1['duration'], self.course1.duration)
        self.assertEqual(c1['total_lessons'], self.course1.total_lessons)
        self.assertEqual(c1['enrollment_status'], Enrollment.Status.Active)
        self.assertEqual(c1['price'], str(self.course1.price))

    def test_get_payment_status_wrong_user(self):
        other = UserModel.objects.create(
            username="other", email="o@example.com", password_hash="x",
            full_name="Other", user_type="student", status="active",
        )
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            get_payment_status(self.payment.id, other)


class IPNTests(TestCase):
    def setUp(self):
        # base objects: student + instructor + two courses
        svc = PaymentStatusServiceTests()
        svc.setUp()
        self.student = svc.student
        self.course1 = svc.course1
        self.course2 = svc.course2

        # create a fresh payment for each test
        from payments.models import Payment
        from payment_details.models import Payment_Details
        from decimal import Decimal
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal('300.00'),
            discount_amount=Decimal('50.00'),
            total_amount=Decimal('250.00'),
            payment_status=Payment.PaymentStatus.PENDING,
            payment_method=Payment.PaymentMethod.VNPAY,
        )
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course1,
            price=self.course1.price,
            discount=Decimal('0.00'),
            final_price=self.course1.price,
        )
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course2,
            price=self.course2.price,
            discount=Decimal('0.00'),
            final_price=self.course2.price,
        )

        from django.test import RequestFactory
        self.factory = RequestFactory()

        # patch validate_response to always true for tests
        self._orig_validate = None
        import payments.vnpay_services as vs
        # method receives self and key
        self._orig_validate = vs.vnpay.validate_response
        vs.vnpay.validate_response = lambda self_obj, key: True

    def tearDown(self):
        from payments.vnpay_services import vnpay
        if self._orig_validate is not None:
            vnpay.validate_response = self._orig_validate

    def _make_ipn_request(self, params):
        # ensure success code unless explicit override
        if 'vnp_ResponseCode' not in params:
            params['vnp_ResponseCode'] = '00'
        # VNPay always sends a secure hash; add dummy value
        params['vnp_SecureHash'] = 'dummy'
        req = self.factory.get('/api/vnpay/ipn/', data=params)
        from payments.vnpay_services import payment_ipn
        resp = payment_ipn(req)
        return resp

    def test_ipn_order_not_found(self):
        resp = self._make_ipn_request({'vnp_TxnRef': '999999', 'vnp_Amount': '100000'})
        self.assertEqual(resp.status_code, 200)
        import json
        data = json.loads(resp.content)
        self.assertEqual(data['RspCode'], '01')

    def test_ipn_amount_mismatch(self):
        resp = self._make_ipn_request({'vnp_TxnRef': str(self.payment.id), 'vnp_Amount': '500000'})
        import json
        data = json.loads(resp.content)
        self.assertEqual(data['RspCode'], '04')
        self.payment.refresh_from_db()
        # status should not be completed (pending or failed are both acceptable)
        self.assertNotEqual(self.payment.payment_status, Payment.PaymentStatus.COMPLETED)

    def test_ipn_success_path(self):
        resp = self._make_ipn_request({
            'vnp_TxnRef': str(self.payment.id),
            'vnp_Amount': str(int(self.payment.total_amount*100)),
            'vnp_ResponseCode': '00',
        })
        import json
        data = json.loads(resp.content)
        self.assertEqual(data['RspCode'], '00')
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, Payment.PaymentStatus.COMPLETED)
        # enrollment for course1 should exist
        from enrollments.models import Enrollment
        self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course1, is_deleted=False).exists())

    def test_ipn_exception_results_in_99(self):
        # monkey-patch create_enrollments to throw
        import payments.vnpay_services as vs
        orig = vs.create_enrollments_from_payment
        def boom(p):
            raise Exception("boom")
        vs.create_enrollments_from_payment = boom
        try:
            resp = self._make_ipn_request({
                'vnp_TxnRef': str(self.payment.id),
                'vnp_Amount': str(int(self.payment.total_amount*100)),
                'vnp_ResponseCode': '00',
            })
            import json
            data = json.loads(resp.content)
            self.assertEqual(data['RspCode'], '99')
        finally:
            vs.create_enrollments_from_payment = orig


class ReconcileCommandTests(TestCase):
    def setUp(self):
        svc = PaymentStatusServiceTests()
        svc.setUp()
        self.student = svc.student
        self.course1 = svc.course1
        self.course2 = svc.course2
        from payments.models import Payment
        from payment_details.models import Payment_Details
        from decimal import Decimal
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal('100.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
        )
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course1,
            price=self.course1.price,
            discount=Decimal('0.00'),
            final_price=self.course1.price,
        )

    def test_reconcile_detects_missing_enrollment(self):
        from django.core.management import call_command
        from io import StringIO
        buf = StringIO()
        call_command('reconcile_payments', stdout=buf)
        joined = buf.getvalue()
        self.assertIn('not enrolled', joined)

    def test_reconcile_fix_option(self):
        from django.core.management import call_command
        from io import StringIO
        buf = StringIO()
        call_command('reconcile_payments', '--fix', stdout=buf)
        from enrollments.models import Enrollment
        self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course1).exists())
        # payment status should stay completed
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, Payment.PaymentStatus.COMPLETED)


class FixPaymentServiceTests(TestCase):
    def setUp(self):
        # reuse earlier setup for objects
        svc = PaymentStatusServiceTests()
        svc.setUp()
        self.student = svc.student
        self.course1 = svc.course1
        self.course2 = svc.course2
        # remove any existing enrollment created by parent
        from enrollments.models import Enrollment
        Enrollment.objects.filter(user=self.student, course=self.course1).delete()
        from payments.models import Payment
        from payment_details.models import Payment_Details
        from decimal import Decimal
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal('150.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('150.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
        )
        Payment_Details.objects.create(
            payment=self.payment,
            course=self.course1,
            price=self.course1.price,
            discount=Decimal('0.00'),
            final_price=self.course1.price,
        )

    def test_fix_payment_creates_enrollment_and_earning(self):
        from payments.services import fix_payment
        result = fix_payment(self.payment.id)
        self.assertEqual(result['enrollments_created'], 1)
        # second run idempotent
        result2 = fix_payment(self.payment.id)
        self.assertEqual(result2['enrollments_created'], 0)

    def test_fix_payment_not_completed(self):
        from payments.services import fix_payment
        from rest_framework.exceptions import ValidationError
        # mark pending
        self.payment.payment_status = Payment.PaymentStatus.PENDING
        self.payment.save()
        with self.assertRaises(ValidationError):
            fix_payment(self.payment.id)


    def test_alert_command_reports(self):
        from django.core.management import call_command
        from io import StringIO
        from payments.models import Payment
        # create a stale pending payment
        p = Payment.objects.create(
            user=self.student,
            amount=0,
            discount_amount=0,
            total_amount=0,
            payment_status=Payment.PaymentStatus.PENDING,
            payment_method=Payment.PaymentMethod.VNPAY,
        )
        from django.utils import timezone
        p.created_at -= timezone.timedelta(hours=2)
        p.save()
        buf = StringIO()
        call_command('alert_ipn_failures', stdout=buf)
        self.assertIn(str(p.id), buf.getvalue())


class PaymentViewsTests(TestCase):
    def setUp(self):
        # reuse the objects created above by calling PaymentStatusServiceTests.setUp
        svc = PaymentStatusServiceTests()
        svc.setUp()
        # copy over references
        self.student = svc.student
        self.payment = svc.payment
        self.course1 = svc.course1
        self.course2 = svc.course2
        # create API client and login student
        from rest_framework.test import APIClient
        self.client = APIClient()
        # generate a valid JWT for this student and attach it
        payload = {
            'user_id': self.student.id,
            'username': self.student.username,
            'email': self.student.email,
            'user_type': ['student'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_status_view_returns_payment(self):
        url = f"/api/payments/status/{self.payment.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # basic assertions
        self.assertEqual(data['payment_id'], self.payment.id)
        self.assertIn('courses', data)
        self.assertEqual(len(data['courses']), 2)

    def test_status_view_forbidden_other_user(self):
        other = UserModel.objects.create(
            username="other2", email="o2@example.com", password_hash=make_password("password123"),
            full_name="Other Two", user_type="student", status="active",
        )
        # generate token for other
        payload = {
            'user_id': other.id,
            'username': other.username,
            'email': other.email,
            'user_type': ['student'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get(f"/api/payments/status/{self.payment.id}/")
        self.assertEqual(resp.status_code, 400)

    def test_my_payments_list_includes_payment(self):
        url = "/api/payments/my/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        results = resp.json()
        self.assertTrue(isinstance(results, list))
        self.assertTrue(any(p['id'] == self.payment.id for p in results))

    def test_admin_fix_endpoint_forbidden_to_student(self):
        url = "/api/payments/fix/"
        resp = self.client.post(url, {'payment_id': self.payment.id})
        self.assertEqual(resp.status_code, 403)

    def test_admin_fix_endpoint_allows_admin(self):
        # make current client an admin
        admin_user = UserModel.objects.create(
            username="adm", email="adm@example.com", password_hash=make_password("pass"),
            full_name="Admin", user_type="admin", status="active",
        )
        # also create corresponding Admin record so RolePermissionFactory sees it
        from admins.models import Admin as AdminModel
        AdminModel.objects.create(user=admin_user, department="IT", role="super_admin")
        payload = {
            'user_id': admin_user.id,
            'username': admin_user.username,
            'email': admin_user.email,
            'user_type': ['admin'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        url = "/api/payments/fix/"
        resp = self.client.post(url, {'payment_id': self.payment.id}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertIn('result', data)

    def test_admin_list_payments_forbidden_to_student(self):
        url = "/api/payments/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 403)

    def test_admin_list_payments_returns_all(self):
        # make current client an admin same as previous test
        admin_user = UserModel.objects.create(
            username="adm2", email="adm2@example.com", password_hash=make_password("pass"),
            full_name="Admin Two", user_type="admin", status="active",
        )
        from admins.models import Admin as AdminModel
        AdminModel.objects.create(user=admin_user, department="IT", role="super_admin")
        payload = {
            'user_id': admin_user.id,
            'username': admin_user.username,
            'email': admin_user.email,
            'user_type': ['admin'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # create an additional completed payment with no enrollment to demonstrate
        from payments.models import Payment
        from payment_details.models import Payment_Details
        from decimal import Decimal
        other = Payment.objects.create(
            user=self.student,
            amount=Decimal('50.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('50.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
        )
        Payment_Details.objects.create(
            payment=other,
            course=self.course2,
            price=self.course2.price,
            discount=Decimal('0.00'),
            final_price=self.course2.price,
        )

        url = "/api/payments/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(isinstance(data, list))
        self.assertTrue(any(p['payment_id'] == self.payment.id for p in data))
        self.assertTrue(any(p['payment_id'] == other.id for p in data))
        for p in data:
            self.assertIn('user_name', p)
            self.assertIn('course_title', p)

    def test_admin_list_payments_problematic_filter(self):
        # create admin user again to ensure token is fresh
        admin_user = UserModel.objects.create(
            username="adm3", email="adm3@example.com", password_hash=make_password("pass"),
            full_name="Admin Three", user_type="admin", status="active",
        )
        from admins.models import Admin as AdminModel
        AdminModel.objects.create(user=admin_user, department="IT", role="super_admin")
        payload = {
            'user_id': admin_user.id,
            'username': admin_user.username,
            'email': admin_user.email,
            'user_type': ['admin'],
            'token_type': 'access',
            'exp': 9999999999,
            'iat': 1,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = "/api/payments/?problematic=true"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(all(p['has_problem'] for p in data))


class RefundWorkflowTests(TestCase):
    def setUp(self):
        level = InstructorLevel.objects.create(
            name="Silver", description="level",
            min_students=0, min_revenue=Decimal('0'),
            commission_rate=Decimal('10'), plan_commission_rate=Decimal('10')
        )
        instr_user = UserModel.objects.create(
            username="teacher_refund",
            email="refund.teacher@example.com",
            password_hash=make_password("password123"),
            full_name="Refund Teacher",
            user_type="instructor", status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user, level=level)
        self.student = UserModel.objects.create(
            username="student_refund",
            email="refund.student@example.com",
            password_hash=make_password("password123"),
            full_name="Refund Student",
            user_type="student", status="active",
        )
        self.admin_user = UserModel.objects.create(
            username="admin_refund",
            email="refund.admin@example.com",
            password_hash=make_password("password123"),
            full_name="Refund Admin",
            user_type="admin", status="active",
        )
        from admins.models import Admin as AdminModel
        AdminModel.objects.create(user=self.admin_user, department="IT", role="super_admin")

        self.course = Course.objects.create(
            title="Refund Course",
            shortdescription="x",
            description="x",
            instructor=self.instructor,
            category_id=None,
            subcategory_id=None,
            price=Decimal('100.00'),
            level="beginner",
            language="English",
            duration=120,
            total_lessons=10,
        )
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal('100.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
            transaction_id="TXN-REFUND-001",
        )
        self.detail = Payment_Details.objects.create(
            payment=self.payment,
            course=self.course,
            price=Decimal('100.00'),
            discount=Decimal('0.00'),
            final_price=Decimal('100.00'),
        )
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            payment=self.payment,
            status=Enrollment.Status.Active,
            progress=Decimal('10.00'),
        )

    def _set_refund_settings(self, value):
        from systems_settings.models import SystemsSetting
        import json
        SystemsSetting.objects.update_or_create(
            setting_key='refund_settings',
            defaults={
                'setting_group': 'payments',
                'setting_value': json.dumps(value),
                'description': 'Refund workflow settings',
            }
        )

    def test_user_refund_request_pending_in_admin_mode(self):
        from payments.refund_services import user_refund_request
        self._set_refund_settings({
            "refund_mode": "admin_approval",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        result = user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        self.detail.refresh_from_db()
        self.assertEqual(result["mode"], "admin_approval")
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.PENDING)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_user_refund_request_success_in_direct_mode(self, mock_gateway):
        from payments.refund_services import user_refund_request
        mock_gateway.return_value = {
            "status": "success",
            "response_code": "00",
            "transaction_id": "RF-001",
            "message": "Refund completed successfully.",
        }
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        result = user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        self.detail.refresh_from_db()
        enrollment = Enrollment.objects.get(payment=self.payment, course=self.course, user=self.student)
        self.assertEqual(result["results"][0]["status"], "success")
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.SUCCESS)
        self.assertEqual(enrollment.status, Enrollment.Status.Cancelled)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_gateway_timeout_moves_refund_to_processing(self, mock_gateway):
        from payments.refund_services import user_refund_request
        mock_gateway.return_value = {
            "status": "processing",
            "response_code": None,
            "transaction_id": None,
            "message": "Gateway timeout",
        }
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        result = user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        self.detail.refresh_from_db()
        self.assertEqual(result["results"][0]["status"], "processing")
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.PROCESSING)
        self.assertIsNotNone(self.detail.next_retry_at)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_admin_retry_and_soft_delete(self, mock_gateway):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 0,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        mock_gateway.return_value = {
            "status": "processing",
            "response_code": None,
            "transaction_id": None,
            "message": "Gateway timeout",
        }
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        self.detail.refresh_from_db()
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.PROCESSING)

        mock_gateway.return_value = {
            "status": "success",
            "response_code": "00",
            "transaction_id": "RF-RETRY-001",
            "message": "Refund completed successfully.",
        }
        retry_result = admin_refund_action("retry", [self.detail.id], self.admin_user)
        self.detail.refresh_from_db()
        self.assertFalse(retry_result["errors"])
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.SUCCESS)

        archive_result = admin_refund_action("soft_delete", [self.detail.id], self.admin_user, note="Archive")
        self.detail.refresh_from_db()
        self.assertFalse(archive_result["errors"])
        self.assertTrue(self.detail.is_deleted)

    def test_admin_reject_pending_refund(self):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "admin_approval",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        result = admin_refund_action("reject", [self.detail.id], self.admin_user, note="Out of policy")
        self.detail.refresh_from_db()
        self.assertFalse(result["errors"])
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.REJECTED)
        self.assertEqual(self.detail.processed_by_id, self.admin_user.id)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_admin_cancel_processing_refund(self, mock_gateway):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        mock_gateway.return_value = {
            "status": "processing",
            "response_code": None,
            "transaction_id": None,
            "message": "Gateway timeout",
        }
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        result = admin_refund_action("cancel", [self.detail.id], self.admin_user, note="Ops cancelled")
        self.detail.refresh_from_db()
        self.assertFalse(result["errors"])
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.CANCELLED)
        self.assertEqual(self.detail.processed_by_id, self.admin_user.id)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_retry_is_allowed_without_waiting_for_cooldown(self, mock_gateway):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        mock_gateway.return_value = {
            "status": "processing",
            "response_code": None,
            "transaction_id": None,
            "message": "Gateway timeout",
        }
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        mock_gateway.return_value = {
            "status": "success",
            "response_code": "00",
            "transaction_id": "RF-IMMEDIATE-001",
            "message": "Refund completed successfully.",
        }
        result = admin_refund_action("retry", [self.detail.id], self.admin_user)
        self.detail.refresh_from_db()
        self.assertFalse(result["errors"])
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.SUCCESS)

    @patch('payments.refund_services.send_vnpay_refund_request')
    def test_admin_restore_and_add_note(self, mock_gateway):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "direct_system",
            "refund_retry_cooldown_minutes": 0,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        mock_gateway.return_value = {
            "status": "processing",
            "response_code": None,
            "transaction_id": None,
            "message": "Gateway timeout",
        }
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        admin_refund_action("add_note", [self.detail.id], self.admin_user, note="Investigating with finance")
        admin_refund_action("soft_delete", [self.detail.id], self.admin_user, note="Archive")
        restore_result = admin_refund_action("restore", [self.detail.id], self.admin_user, note="Bring back to queue")
        self.detail.refresh_from_db()
        self.assertFalse(restore_result["errors"])
        self.assertFalse(self.detail.is_deleted)
        self.assertIn("Investigating with finance", self.detail.internal_note)
        self.assertEqual(self.detail.processed_by_id, self.admin_user.id)

    def test_admin_override_status_to_failed(self):
        from payments.refund_services import admin_refund_action, user_refund_request
        self._set_refund_settings({
            "refund_mode": "admin_approval",
            "refund_retry_cooldown_minutes": 30,
            "refund_max_retry_count": 3,
            "refund_timeout_seconds": 15,
            "allow_admin_override_refund_status": True,
            "allow_admin_soft_delete_refund": True,
        })
        user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need refund")
        result = admin_refund_action(
            "override_status",
            [self.detail.id],
            self.admin_user,
            note="Manual reconciliation found a gateway failure",
            override_status=Payment_Details.RefundStatus.FAILED,
        )
        self.detail.refresh_from_db()
        self.assertFalse(result["errors"])
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.FAILED)
        self.assertEqual(self.detail.processed_by_id, self.admin_user.id)

    @patch('payments.vnpay_services.requests.post')
    def test_vnpay_refund_request_uses_pipe_signature_and_32_char_request_id(self, mock_post):
        class MockResponse:
            ok = True
            status_code = 200

            @staticmethod
            def json():
                return {
                    "vnp_ResponseCode": "00",
                    "vnp_Message": "Success",
                    "vnp_TransactionNo": "RF-001",
                }

        mock_post.return_value = MockResponse()
        self.detail.refund_amount = Decimal('100.00')
        self.detail.save(update_fields=["refund_amount", "updated_at"])

        send_vnpay_refund_request(self.detail, reason="Hoan tien test", create_by="System Admin")

        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(len(payload["vnp_RequestId"]), 32)
        self.assertNotIn("-", payload["vnp_RequestId"])
        expected_signature = hmacsha512(settings.VNPAY_HASH_SECRET_KEY, _build_vnpay_refund_signature_data(payload))
        self.assertEqual(payload["vnp_SecureHash"], expected_signature)

    @patch('payments.vnpay_services.requests.post')
    def test_vnpay_refund_request_rejects_invalid_response_signature(self, mock_post):
        class MockResponse:
            ok = True
            status_code = 200

            @staticmethod
            def json():
                return {
                    "vnp_ResponseId": "RESP001",
                    "vnp_Command": "refund",
                    "vnp_ResponseCode": "00",
                    "vnp_Message": "Success",
                    "vnp_TmnCode": settings.VNPAY_TMN_CODE,
                    "vnp_TxnRef": str(1415),
                    "vnp_Amount": "10000",
                    "vnp_BankCode": "NCB",
                    "vnp_PayDate": "20260328121212",
                    "vnp_TransactionNo": "RF-002",
                    "vnp_TransactionType": "02",
                    "vnp_TransactionStatus": "00",
                    "vnp_OrderInfo": "Refund 1415",
                    "vnp_SecureHash": "invalid",
                }

        mock_post.return_value = MockResponse()
        self.detail.refund_amount = Decimal('100.00')
        self.detail.save(update_fields=["refund_amount", "updated_at"])

        result = send_vnpay_refund_request(self.detail, reason="Hoan tien test", create_by="System Admin")
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["response_code"], "97")


class MomoIntegrationTests(TestCase):
    def setUp(self):
        level = InstructorLevel.objects.create(
            name="Gold",
            description="level",
            min_students=0,
            min_revenue=Decimal("0"),
            commission_rate=Decimal("10"),
            plan_commission_rate=Decimal("10"),
        )
        instr_user = UserModel.objects.create(
            username="teacher_momo",
            email="teacher.momo@example.com",
            password_hash=make_password("password123"),
            full_name="Teacher MoMo",
            user_type="instructor",
            status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user, level=level)
        self.student = UserModel.objects.create(
            username="student_momo",
            email="student.momo@example.com",
            password_hash=make_password("password123"),
            full_name="Student MoMo",
            user_type="student",
            status="active",
        )
        self.course = Course.objects.create(
            title="MoMo Course",
            shortdescription="momo",
            description="momo",
            instructor=self.instructor,
            category_id=None,
            subcategory_id=None,
            price=Decimal("199000.00"),
            level="beginner",
            language="English",
            duration=120,
            total_lessons=10,
        )
        self.payment = Payment.objects.create(
            user=self.student,
            amount=Decimal("199000.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("199000.00"),
            payment_status=Payment.PaymentStatus.PENDING,
            payment_method=Payment.PaymentMethod.MOMO,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
        )
        self.detail = Payment_Details.objects.create(
            payment=self.payment,
            course=self.course,
            price=Decimal("199000.00"),
            discount=Decimal("0.00"),
            final_price=Decimal("199000.00"),
        )
        Cart.objects.create(user=self.student, course=self.course)

    def test_create_payment_keeps_cart_until_payment_is_completed(self):
        payment_data = create_payment({
            "user_id": self.student.id,
            "payment_method": Payment.PaymentMethod.MOMO,
            "payment_type": Payment.PaymentType.COURSE_PURCHASE,
            "payment_details": [{"course_id": self.course.id}],
        })

        self.assertTrue(Cart.objects.filter(user=self.student, course=self.course).exists())
        self.assertEqual(payment_data["payment"]["payment_status"], Payment.PaymentStatus.PENDING)

    def test_payment_status_includes_retry_window_fields(self):
        data = get_payment_status(self.payment.id, self.student)
        self.assertTrue(data["can_retry_payment"])
        self.assertIsNotNone(data["retryable_until"])

    @patch("payments.momo_services.requests.post")
    def test_create_momo_payment_signs_request_and_verifies_response_signature(self, mock_post):
        class MockResponse:
            status_code = 200

            @staticmethod
            def raise_for_status():
                return None

            @staticmethod
            def json():
                payload = {
                    "partnerCode": settings.MOMO_PARTNER_CODE,
                    "requestId": "momo-request-001",
                    "orderId": str(1508),
                    "amount": 199000,
                    "responseTime": 1721720663942,
                    "message": "Success",
                    "resultCode": 0,
                    "payUrl": "https://test-payment.momo.vn/pay/mock",
                }
                payload["signature"] = _momo_create_response_signature(payload)
                return payload

        mock_post.return_value = MockResponse()

        response = create_momo_payment(self.payment)

        self.assertEqual(response["resultCode"], 0)
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["partnerCode"], settings.MOMO_PARTNER_CODE)
        self.assertEqual(payload["requestType"], "payWithMethod")
        self.assertEqual(payload["orderId"], str(self.payment.id))
        self.assertEqual(payload["amount"], int(self.payment.total_amount))
        self.assertTrue(payload["signature"])

    def test_simulate_momo_ipn_marks_payment_completed_and_creates_enrollment(self):
        response = simulate_momo_ipn(self.payment, trans_id=4088878653, result_code=0, message="Successful.")
        self.assertEqual(response.status_code, 200)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, Payment.PaymentStatus.COMPLETED)
        self.assertEqual(self.payment.transaction_id, "4088878653")
        self.assertEqual(self.payment.payment_gateway, "momo")
        self.assertTrue(
            Enrollment.objects.filter(
                user=self.student,
                course=self.course,
                payment=self.payment,
                is_deleted=False,
            ).exists()
        )
        self.assertFalse(Cart.objects.filter(user=self.student, course=self.course).exists())

    @patch("payments.momo_services.requests.post")
    def test_send_momo_refund_request_signs_payload_and_maps_success(self, mock_post):
        class MockResponse:
            status_code = 200

            @staticmethod
            def raise_for_status():
                return None

            @staticmethod
            def json():
                return {
                    "partnerCode": settings.MOMO_PARTNER_CODE,
                    "orderId": "refund-order-001",
                    "requestId": "refund-request-001",
                    "amount": 199000,
                    "transId": 144518121,
                    "resultCode": 0,
                    "message": "Thành công",
                    "responseTime": 1721720663942,
                }

        mock_post.return_value = MockResponse()
        self.payment.payment_status = Payment.PaymentStatus.COMPLETED
        self.payment.transaction_id = "144492817"
        self.payment.save(update_fields=["payment_status", "transaction_id", "updated_at"])
        self.detail.refund_amount = Decimal("199000.00")
        self.detail.save(update_fields=["refund_amount", "updated_at"])

        result = send_momo_refund_request(self.detail, reason="Hoan tien Momo")

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["response_code"], "0")
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["partnerCode"], settings.MOMO_PARTNER_CODE)
        self.assertEqual(payload["transId"], 144492817)
        self.assertEqual(payload["amount"], 199000)
        self.assertTrue(payload["signature"])

    def test_create_momo_payment_rejects_expired_retry_window(self):
        self.payment.created_at = timezone.now() - timezone.timedelta(hours=2)
        self.payment.save(update_fields=["created_at", "updated_at"])

        with self.assertRaisesMessage(Exception, "Đã hết thời hạn thanh toán lại cho giao dịch này."):
            create_momo_payment(self.payment)

    @patch("payments.refund_services.send_vnpay_refund_request")
    @patch("payments.refund_services.send_momo_refund_request")
    def test_refund_workflow_uses_gateway_matching_payment_method(self, mock_momo_refund, mock_vnpay_refund):
        from payments.refund_services import user_refund_request

        self.payment.payment_status = Payment.PaymentStatus.COMPLETED
        self.payment.transaction_id = "144492817"
        self.payment.save(update_fields=["payment_status", "transaction_id", "updated_at"])
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            payment=self.payment,
            status=Enrollment.Status.Active,
            progress=Decimal("10.00"),
        )
        mock_momo_refund.return_value = {
            "status": "success",
            "response_code": "0",
            "transaction_id": "144518121",
            "message": "Thành công",
        }

        from systems_settings.models import SystemsSetting
        import json

        SystemsSetting.objects.update_or_create(
            setting_key="refund_settings",
            defaults={
                "setting_group": "payments",
                "setting_value": json.dumps({
                    "refund_mode": "direct_system",
                    "refund_retry_cooldown_minutes": 30,
                    "refund_max_retry_count": 3,
                    "refund_timeout_seconds": 15,
                    "allow_admin_override_refund_status": True,
                    "allow_admin_soft_delete_refund": True,
                }),
                "description": "Refund workflow settings",
            },
        )

        result = user_refund_request(self.payment.id, [self.detail.id], self.student, reason="Need MoMo refund")

        self.detail.refresh_from_db()
        self.assertEqual(result["results"][0]["status"], "success")
        self.assertEqual(self.detail.refund_status, Payment_Details.RefundStatus.SUCCESS)
        mock_momo_refund.assert_called_once()
        mock_vnpay_refund.assert_not_called()
