from django.test import TestCase
from users.models import User as UserModel
from decimal import Decimal

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
from payments.services import get_payment_status




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
