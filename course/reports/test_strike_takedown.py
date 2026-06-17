"""Plan 3+4+5 — takedown pipeline: forced refund + strike + 3-strike auto-ban."""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta

from admins.models import Admin
from courses.models import Course
from enrollments.models import Enrollment
from instructors.models import Instructor
from payments.models import Payment
from payment_details.models import Payment_Details
from reports.copyright_services import admin_action
from reports.models import CopyrightCase, InstructorStrike, Report
from reports.services import create_report
from users.models import User


def make_user(username, **extra):
    return User.objects.create(
        username=username,
        email=f'{username}@example.com',
        password_hash='x',
        full_name=username.title(),
        **extra,
    )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', FRONTEND_URL='http://testserver')
class TakedownPipelineTests(TestCase):
    def setUp(self):
        self.admin_user = make_user('admin')
        Admin.objects.create(user=self.admin_user, department='Legal', role='admin', is_super_admin=True)
        self.instructor_user = make_user('teacher')
        self.instructor = Instructor.objects.create(user=self.instructor_user)
        self.reporter = make_user('reporter')

    def _course(self, title):
        return Course.objects.create(
            title=title, instructor=self.instructor, price=Decimal('100.00'),
            status=Course.Status.PUBLISHED, is_public=True,
        )

    def _case(self, course):
        report = create_report(
            self.reporter, Report.TargetType.COURSE, course.id, Report.Reason.COPYRIGHT,
            'Stolen content', metadata={'good_faith_confirmed': True},
        )
        return CopyrightCase.objects.get(source_report=report)

    def test_takedown_creates_strike(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'takedown', message='violation')
        self.assertEqual(
            InstructorStrike.objects.filter(instructor=self.instructor, revoked_at__isnull=True).count(), 1
        )

    def test_takedown_without_strike_flag_creates_no_strike(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'takedown', count_as_strike=False)
        self.assertEqual(InstructorStrike.objects.filter(instructor=self.instructor).count(), 0)

    def test_suspend_sale_creates_no_strike(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'suspend_sale', message='temporary hide')
        self.assertEqual(InstructorStrike.objects.filter(instructor=self.instructor).count(), 0)

    def test_freeze_creates_strike(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'freeze', message='suspend access')
        self.assertEqual(
            InstructorStrike.objects.filter(instructor=self.instructor, revoked_at__isnull=True).count(), 1
        )

    def test_freeze_without_strike_flag_creates_no_strike(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'freeze', count_as_strike=False)
        self.assertEqual(InstructorStrike.objects.filter(instructor=self.instructor).count(), 0)

    def test_third_strike_bans_instructor_and_hides_other_courses(self):
        clean_course = self._course('Clean course')  # không vi phạm
        for i in range(3):
            case = self._case(self._course(f'Violating {i}'))
            admin_action(case.id, self.admin_user, 'takedown', message=f'v{i}')

        self.instructor_user.refresh_from_db()
        self.assertEqual(self.instructor_user.status, 'banned')

        clean_course.refresh_from_db()
        self.assertTrue(clean_course.admin_hidden)          # ẩn khỏi marketplace
        self.assertFalse(clean_course.is_hard_blocked)      # nhưng học viên cũ vẫn học được

    def test_no_duplicate_strike_for_same_case(self):
        case = self._case(self._course('C1'))
        admin_action(case.id, self.admin_user, 'takedown')
        # gọi lại cùng case không tạo strike thứ 2
        from reports.copyright_services import _create_strike
        _create_strike(case, self.admin_user)
        self.assertEqual(InstructorStrike.objects.filter(source_case=case, revoked_at__isnull=True).count(), 1)

    def _purchase(self, course, days_ago):
        payment = Payment.objects.create(
            user=make_user(f'buyer_{course.id}_{days_ago}'),
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
            amount=Decimal('100.00'), total_amount=Decimal('100.00'),
            payment_status=Payment.PaymentStatus.COMPLETED,
        )
        Payment.objects.filter(id=payment.id).update(
            payment_date=timezone.now() - timedelta(days=days_ago)
        )
        detail = Payment_Details.objects.create(
            payment=payment, course=course,
            price=Decimal('100.00'), final_price=Decimal('100.00'),
        )
        Enrollment.objects.create(
            user=payment.user, course=course, payment=payment,
            status=Enrollment.Status.Active, source=Enrollment.Source.PURCHASE,
        )
        return payment, detail

    def test_forced_refund_recent_vs_old(self):
        course = self._course('Refund course')
        self._purchase(course, days_ago=5)    # trong 30 ngày -> auto
        self._purchase(course, days_ago=60)   # quá 30 ngày -> manual
        case = self._case(course)

        with patch('payments.refund_services.send_vnpay_refund_request',
                   return_value={'status': 'success', 'message': 'ok',
                                 'transaction_id': 'tx1', 'response_code': '00'}):
            updated = admin_action(case.id, self.admin_user, 'takedown', message='takedown')

        msg = updated.messages.filter(response_type='takedown').first()
        refund = msg.metadata['financial']['takedown']['refund']
        self.assertEqual(len(refund['auto_refund_created']), 1)
        self.assertEqual(len(refund['manual_compensation_required']), 1)

    def test_forced_refund_uses_admin_profile_when_user_and_admin_ids_differ(self):
        course = self._course('Refund actor course')
        _, detail = self._purchase(course, days_ago=5)
        case = self._case(course)

        late_admin_user = make_user('late_admin')
        Admin.objects.create(user=late_admin_user, department='Legal', role='admin')
        self.assertNotEqual(late_admin_user.id, late_admin_user.admin.id)

        with patch('payments.refund_services.send_vnpay_refund_request',
                   return_value={'status': 'success', 'message': 'ok',
                                 'transaction_id': 'tx2', 'response_code': '00'}):
            admin_action(case.id, late_admin_user, 'takedown', message='takedown')

        detail.refresh_from_db()
        self.assertEqual(detail.processed_by_id, late_admin_user.admin.id)
