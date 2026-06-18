from decimal import Decimal

from django.test import TestCase, override_settings

from admins.models import Admin
from courses.models import Course
from coursemodules.models import CourseModule
from instructor_earnings.models import InstructorEarning
from instructor_payouts.models import InstructorPayout
from instructors.models import Instructor
from lessons.models import Lesson
from notifications.models import Notification
from reports.copyright_services import admin_action, get_admin_case
from reports.models import CopyrightCase, InstructorEarningHold, Report
from reports.services import (
    create_report,
    get_report_case_detail,
    get_report_cases,
    mark_report_processed,
    mark_report_unprocessed,
)
from users.models import User


def make_user(username, email=None):
    return User.objects.create(
        username=username,
        email=email or f'{username}@example.com',
        password_hash='x',
        full_name=username.title(),
    )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', FRONTEND_URL='http://testserver')
class ReportItemWorkflowTests(TestCase):
    def setUp(self):
        self.admin_user = make_user('admin')
        Admin.objects.create(user=self.admin_user, department='Ops', role='admin', is_super_admin=True)

        self.instructor_user = make_user('teacher')
        self.instructor = Instructor.objects.create(user=self.instructor_user)

        self.reporter = make_user('reporter')
        self.course = Course.objects.create(
            title='Reported Course',
            shortdescription='Short',
            description='Desc',
            instructor=self.instructor,
            price=Decimal('100.00'),
            level='beginner',
            language='English',
            duration=60,
            total_lessons=1,
            status=Course.Status.PUBLISHED,
        )

    def test_same_user_different_description_creates_separate_reports(self):
        first = create_report(
            self.reporter,
            Report.TargetType.COURSE,
            self.course.id,
            Report.Reason.SPAM,
            'Spam in title',
        )
        second = create_report(
            self.reporter,
            Report.TargetType.COURSE,
            self.course.id,
            Report.Reason.SPAM,
            'Spam in preview video',
        )

        self.assertNotEqual(first.id, second.id)
        self.assertEqual(
            Report.objects.filter(target_type=Report.TargetType.COURSE, target_id=self.course.id).count(),
            2,
        )

    def test_identical_open_report_returns_existing_without_overwriting(self):
        first = create_report(
            self.reporter,
            Report.TargetType.COURSE,
            self.course.id,
            Report.Reason.SPAM,
            'Same report',
            metadata={'source': 'button'},
            attachments=[],
        )
        duplicate = create_report(
            self.reporter,
            Report.TargetType.COURSE,
            self.course.id,
            Report.Reason.SPAM,
            'Same report',
            metadata={'source': 'button'},
            attachments=[],
        )

        first.refresh_from_db()
        self.assertEqual(first.id, duplicate.id)
        self.assertEqual(first.description, 'Same report')
        self.assertEqual(Report.objects.filter(target_type=Report.TargetType.COURSE, target_id=self.course.id).count(), 1)

    def test_admin_list_returns_individual_reports(self):
        first = create_report(self.reporter, Report.TargetType.COURSE, self.course.id, Report.Reason.SPAM, 'One')
        second = create_report(self.reporter, Report.TargetType.COURSE, self.course.id, Report.Reason.OFFENSIVE, 'Two')

        report_ids = [item['report_id'] for item in get_report_cases({'status': 'open'})]

        self.assertIn(first.id, report_ids)
        self.assertIn(second.id, report_ids)
        self.assertEqual(len([rid for rid in report_ids if rid in [first.id, second.id]]), 2)

    def test_opening_details_does_not_change_report_status(self):
        report = create_report(self.reporter, Report.TargetType.COURSE, self.course.id, Report.Reason.COPYRIGHT, 'Copied')

        get_report_case_detail(Report.TargetType.COURSE, self.course.id)
        get_admin_case(CopyrightCase.objects.get(source_report=report).id)

        report.refresh_from_db()
        self.assertEqual(report.status, Report.Status.PENDING)

    def test_mark_processed_and_unprocessed_only_changes_selected_report(self):
        first = create_report(self.reporter, Report.TargetType.COURSE, self.course.id, Report.Reason.SPAM, 'One')
        second = create_report(self.reporter, Report.TargetType.COURSE, self.course.id, Report.Reason.OFFENSIVE, 'Two')

        mark_report_processed(first.id, admin=self.admin_user)

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, Report.Status.RESOLVED)
        self.assertEqual(first.action_taken, 'marked_processed')
        self.assertIsNotNone(first.resolved_at)
        self.assertEqual(first.resolved_by_id, self.admin_user.id)
        self.assertEqual(second.status, Report.Status.PENDING)

        mark_report_unprocessed(first.id, admin=self.admin_user)

        first.refresh_from_db()
        self.assertEqual(first.status, Report.Status.PENDING)
        self.assertEqual(first.action_taken, '')
        self.assertIsNone(first.resolved_at)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', FRONTEND_URL='http://testserver')
class CopyrightCaseWorkflowTests(TestCase):
    def setUp(self):
        self.admin_user = make_user('admin')
        Admin.objects.create(user=self.admin_user, department='Legal', role='admin', is_super_admin=True)

        self.instructor_user = make_user('teacher')
        self.instructor = Instructor.objects.create(user=self.instructor_user)

        self.reporter = make_user('reporter')
        self.other_user = make_user('other')

        self.course = Course.objects.create(
            title='Copyright Course',
            shortdescription='Short',
            description='Desc',
            instructor=self.instructor,
            price=Decimal('100.00'),
            level='beginner',
            language='English',
            duration=60,
            total_lessons=1,
            status=Course.Status.PUBLISHED,
        )
        self.module = CourseModule.objects.create(
            course=self.course,
            title='Module',
            order_number=1,
            status='Published',
        )
        self.lesson = Lesson.objects.create(
            coursemodule=self.module,
            title='Lesson One',
            content_type=Lesson.ContentType.VIDEO,
            order=1,
        )

    def make_earning(self, course=None, net='100.00', status=InstructorEarning.StatusChoices.AVAILABLE, payout=None):
        amount = Decimal(net)
        return InstructorEarning.objects.create(
            instructor=self.instructor,
            course=course or self.course,
            amount=amount,
            net_amount=amount,
            status=status,
            instructor_payout=payout,
        )

    def make_case(self, target_type=Report.TargetType.COURSE, target_id=None):
        report = create_report(
            self.reporter,
            target_type,
            target_id or self.course.id,
            Report.Reason.COPYRIGHT,
            'Original work copied',
            metadata={
                'infringing_part': 'lesson intro',
                'original_work_url': 'https://example.com/original',
                'good_faith_confirmed': True,
            },
            attachments=['https://cdn.example.com/evidence.pdf'],
        )
        return report, CopyrightCase.objects.get(source_report=report)

    def test_course_copyright_report_creates_case_and_initial_message(self):
        report, case = self.make_case()

        self.assertEqual(report.target_type, Report.TargetType.COURSE)
        self.assertEqual(case.status, CopyrightCase.Status.UNDER_REVIEW)
        self.assertEqual(case.course_id, self.course.id)
        self.assertEqual(case.instructor_id, self.instructor.id)
        self.assertEqual(case.created_by_id, self.reporter.id)

        message = case.messages.get(response_type='initial_report')
        self.assertEqual(message.actor_role, 'reporter')
        self.assertEqual(message.attachments, ['https://cdn.example.com/evidence.pdf'])
        self.assertEqual(message.metadata['original_work_url'], 'https://example.com/original')

    def test_lesson_copyright_report_links_course_lesson_and_instructor(self):
        _, case = self.make_case(Report.TargetType.LESSON, self.lesson.id)

        self.assertEqual(case.target_type, Report.TargetType.LESSON)
        self.assertEqual(case.lesson_id, self.lesson.id)
        self.assertEqual(case.course_id, self.course.id)
        self.assertEqual(case.instructor_id, self.instructor.id)

    def test_suspend_access_hold_blocks_content_and_holds_earnings(self):
        _, case = self.make_case()
        payout = InstructorPayout.objects.create(
            instructor=self.instructor,
            amount=Decimal('150.00'),
            net_amount=Decimal('150.00'),
            payment_method='bank_transfer',
            period='2026-06',
            status=InstructorPayout.PayoutStatusChoices.PENDING,
        )
        held_earning = self.make_earning(net='100.00', payout=payout)
        other_course = Course.objects.create(
            title='Other Course',
            instructor=self.instructor,
            price=Decimal('50.00'),
            level='beginner',
            language='English',
            status=Course.Status.PUBLISHED,
        )
        payable_earning = self.make_earning(course=other_course, net='50.00', payout=payout)

        updated = admin_action(
            case.id,
            self.admin_user,
            'freeze',
            message='Temporary block while verifying.',
        )

        self.assertEqual(updated.status, CopyrightCase.Status.UNDER_REVIEW)

        self.course.refresh_from_db()
        self.assertTrue(self.course.admin_hidden)
        self.assertTrue(self.course.is_hard_blocked)

        held_earning.refresh_from_db()
        payable_earning.refresh_from_db()
        payout.refresh_from_db()
        self.assertIsNone(held_earning.instructor_payout_id)
        self.assertEqual(payable_earning.instructor_payout_id, payout.id)
        self.assertEqual(payout.amount, Decimal('50.00'))
        self.assertEqual(payout.net_amount, Decimal('50.00'))

        hold = InstructorEarningHold.objects.get(case=case, earning=held_earning)
        self.assertEqual(hold.status, InstructorEarningHold.Status.ACTIVE)

    def test_reject_restore_releases_holds_and_restores_course(self):
        _, case = self.make_case()
        earning = self.make_earning()
        admin_action(
            case.id,
            self.admin_user,
            'freeze',
            message='Temporary block.',
        )

        updated = admin_action(
            case.id,
            self.admin_user,
            'restore',
            message='Claim rejected.',
        )

        self.assertEqual(updated.status, CopyrightCase.Status.RESTORED)
        self.course.refresh_from_db()
        self.assertFalse(self.course.admin_hidden)
        self.assertFalse(self.course.is_hard_blocked)

        hold = InstructorEarningHold.objects.get(case=case, earning=earning)
        self.assertEqual(hold.status, InstructorEarningHold.Status.RELEASED)

    def test_confirm_takedown_cancels_unpaid_and_marks_paid_for_manual_follow_up(self):
        _, case = self.make_case()
        unpaid = self.make_earning(status=InstructorEarning.StatusChoices.AVAILABLE)
        paid = self.make_earning(net='25.00', status=InstructorEarning.StatusChoices.PAID)
        admin_action(
            case.id,
            self.admin_user,
            'suspend_sale',
            message='Hold while reviewing.',
        )

        updated = admin_action(
            case.id,
            self.admin_user,
            'takedown',
            message='Confirmed violation.',
        )

        unpaid.refresh_from_db()
        paid.refresh_from_db()
        self.assertEqual(updated.status, CopyrightCase.Status.TAKEDOWN)
        self.assertTrue(updated.manual_follow_up)
        self.assertEqual(updated.financial_action, CopyrightCase.FinancialAction.MANUAL_FOLLOW_UP)
        self.assertEqual(unpaid.status, InstructorEarning.StatusChoices.CANCELLED)
        self.assertEqual(paid.status, InstructorEarning.StatusChoices.PAID)
