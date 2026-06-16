"""Plan 6 — report statistics + CSV export (system-wide, filter-driven)."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone

from courses.models import Course
from instructors.models import Instructor
from reports.models import Report
from reports.services import create_report
from reports.stats_services import export_reports_csv, get_report_statistics
from users.models import User


def make_user(username):
    return User.objects.create(
        username=username, email=f'{username}@example.com', password_hash='x', full_name=username.title(),
    )


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', FRONTEND_URL='http://testserver')
class ReportStatsTests(TestCase):
    def setUp(self):
        self.instructor = Instructor.objects.create(user=make_user('teacher'))
        self.reporter = make_user('reporter')
        self.c1 = Course.objects.create(title='C1', instructor=self.instructor, price=Decimal('10'), status=Course.Status.PUBLISHED)
        self.c2 = Course.objects.create(title='C2', instructor=self.instructor, price=Decimal('10'), status=Course.Status.PUBLISHED)
        for c in (self.c1, self.c2):
            create_report(self.reporter, Report.TargetType.COURSE, c.id, Report.Reason.COPYRIGHT,
                          'stolen', metadata={'good_faith_confirmed': True})

    def test_summary_counts_full_system(self):
        stats = get_report_statistics()
        self.assertEqual(stats['summary']['total_reports'], 2)
        self.assertEqual(stats['by_reason'].get('copyright'), 2)
        self.assertEqual(stats['by_target_type'].get('course'), 2)
        self.assertEqual(stats['summary']['open_cases'], 2)
        self.assertTrue(len(stats['trend']) >= 1)

    def test_date_filter_excludes_out_of_range(self):
        tomorrow = (timezone.now() + timedelta(days=1)).date().isoformat()
        stats = get_report_statistics({'date_from': tomorrow})
        self.assertEqual(stats['summary']['total_reports'], 0)

    def test_reason_filter(self):
        stats = get_report_statistics({'reason': 'spam'})
        self.assertEqual(stats['summary']['total_reports'], 0)

    def test_export_csv_has_rows(self):
        csv_data = export_reports_csv()
        lines = [l for l in csv_data.strip().splitlines() if l]
        self.assertEqual(len(lines), 3)  # header + 2 reports
        self.assertIn('target_type', lines[0])
