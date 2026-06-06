"""Demo-critical regression tests for certificate issuance.

Focus: a certificate is issued ONLY when every (non-deleted) lesson is
completed, the issuance flips the enrollment to complete with a completion
date, and issuing twice is idempotent (no duplicate certificates).
"""
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from certificates.models import Certificate
from certificates.services import issue_certificate
from coursemodules.models import CourseModule
from courses.models import Course
from enrollments.models import Enrollment
from instructors.models import Instructor
from learning_progress.models import LearningProgress
from lessons.models import Lesson
from users.models import User


class CertificateIssuanceTests(TestCase):
    def setUp(self):
        instr_user = User.objects.create(
            username="cert_teacher", email="cert_teacher@example.com",
            password_hash=make_password("password123"),
            full_name="Cert Teacher", status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user)

        self.student = User.objects.create(
            username="cert_student", email="cert_student@example.com",
            password_hash=make_password("password123"),
            full_name="Cert Student", status="active",
        )

        self.course = Course.objects.create(
            title="Cert Course", shortdescription="x", description="x",
            instructor=self.instructor, category_id=None, subcategory_id=None,
            price=Decimal("0.00"), level="beginner", language="English",
            duration=60, total_lessons=2, thumbnail="/static/img.jpg",
            certificate=True,
        )
        module = CourseModule.objects.create(
            course=self.course, title="M1", order_number=1, status="Published",
        )
        self.lessons = [
            Lesson.objects.create(
                coursemodule=module, title=f"L{i}", content_type=Lesson.ContentType.TEXT,
                order=i, status=Lesson.Status.PUBLISHED,
            )
            for i in range(1, 3)
        ]

        self.enrollment = Enrollment.objects.create(
            user=self.student, course=self.course,
            source=Enrollment.Source.PURCHASE, status=Enrollment.Status.Active,
        )

    def _complete(self, lesson):
        LearningProgress.objects.create(
            user=self.student, enrollment=self.enrollment, course=self.course,
            lesson=lesson, progress_percentage=Decimal("100.00"),
            is_completed=True, status=LearningProgress.StatusChoices.COMPLETED,
        )

    def test_lessons_in_soft_deleted_modules_do_not_block_certificate(self):
        # Complete only the lessons in the live module.
        for lesson in self.lessons:
            self._complete(lesson)

        # A soft-deleted module with an (also soft-deleted) extra lesson must not
        # count toward total_lessons, otherwise the student is stuck at "100% but
        # no certificate". This mirrors get_course_progress's lesson counting.
        dead_module = CourseModule.objects.create(
            course=self.course, title="Removed", order_number=2,
            status="Published", is_deleted=True,
        )
        Lesson.objects.create(
            coursemodule=dead_module, title="Ghost", content_type=Lesson.ContentType.TEXT,
            order=99, status=Lesson.Status.PUBLISHED, is_deleted=True,
        )

        issue_certificate(self.student, self.course.id)
        self.assertEqual(
            Certificate.objects.filter(user=self.student, course=self.course).count(), 1
        )

    def test_certificate_not_issued_until_all_lessons_completed(self):
        self._complete(self.lessons[0])  # only 1 of 2
        with self.assertRaises(ValidationError):
            issue_certificate(self.student, self.course.id)
        self.assertEqual(Certificate.objects.filter(user=self.student).count(), 0)

    def test_certificate_issued_on_full_completion_and_idempotent(self):
        for lesson in self.lessons:
            self._complete(lesson)

        issue_certificate(self.student, self.course.id)

        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.status, "complete")
        self.assertIsNotNone(self.enrollment.completion_date)

        # Re-issuing must not create a duplicate certificate. Issuance flips the
        # enrollment to 'complete', so a second attempt is rejected (no active
        # enrollment) rather than silently producing another certificate.
        with self.assertRaises(ValidationError):
            issue_certificate(self.student, self.course.id)

        certs = Certificate.objects.filter(
            user=self.student, course=self.course, revoked=False, is_deleted=False
        )
        self.assertEqual(certs.count(), 1)
