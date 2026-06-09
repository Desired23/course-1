from decimal import Decimal

from django.test import TestCase

from coursemodules.models import CourseModule
from courses.models import Course
from enrollments.models import Enrollment
from lessons.models import Lesson
from learning_progress.services import get_course_progress, update_learning_progress
from utils.test_helpers import make_user


class LearningProgressSyncTests(TestCase):
    def setUp(self):
        instructor_user = make_user("instructor", username="progress_instructor")
        self.student = make_user("student", username="progress_student")
        self.course = Course.objects.create(
            title="Progress Course",
            instructor=instructor_user.instructor,
            status=Course.Status.PUBLISHED,
            is_public=True,
            certificate=False,
        )
        module = CourseModule.objects.create(
            course=self.course,
            title="Module 1",
            order_number=1,
            status="Published",
        )
        self.lessons = [
            Lesson.objects.create(
                coursemodule=module,
                title=f"Lesson {index}",
                content_type=Lesson.ContentType.TEXT,
                order=index,
                status=Lesson.Status.PUBLISHED,
            )
            for index in range(1, 3)
        ]
        self.enrollment = Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )

    def test_partial_completion_syncs_enrollment_and_course_progress(self):
        update_learning_progress(
            self.student.id,
            self.lessons[0].id,
            {"progress_percentage": 100, "is_completed": True},
        )

        self.enrollment.refresh_from_db()
        course_progress = get_course_progress(self.student.id, self.course.id)

        self.assertEqual(self.enrollment.progress, Decimal("50.00"))
        self.assertEqual(self.enrollment.status, Enrollment.Status.Active)
        self.assertEqual(course_progress["overall_progress"], 50.0)
        self.assertEqual(course_progress["completed_lessons"], 1)
        self.assertEqual(course_progress["total_lessons"], 2)

    def test_full_completion_syncs_enrollment_to_complete_for_non_certificate_course(self):
        for lesson in self.lessons:
            update_learning_progress(
                self.student.id,
                lesson.id,
                {"progress_percentage": 100, "is_completed": True},
            )

        self.enrollment.refresh_from_db()
        course_progress = get_course_progress(self.student.id, self.course.id)

        self.assertEqual(self.enrollment.progress, Decimal("100.00"))
        self.assertEqual(self.enrollment.status, Enrollment.Status.Complete)
        self.assertIsNotNone(self.enrollment.completion_date)
        self.assertEqual(course_progress["overall_progress"], 100.0)
        self.assertEqual(course_progress["completed_lessons"], 2)

    def test_marking_lesson_incomplete_recalculates_enrollment_progress(self):
        for lesson in self.lessons:
            update_learning_progress(
                self.student.id,
                lesson.id,
                {"progress_percentage": 100, "is_completed": True},
            )

        update_learning_progress(
            self.student.id,
            self.lessons[0].id,
            {"progress_percentage": 0, "is_completed": False},
        )

        self.enrollment.refresh_from_db()
        course_progress = get_course_progress(self.student.id, self.course.id)

        self.assertEqual(self.enrollment.progress, Decimal("50.00"))
        self.assertEqual(self.enrollment.status, Enrollment.Status.Active)
        self.assertIsNone(self.enrollment.completion_date)
        self.assertEqual(course_progress["overall_progress"], 50.0)
        self.assertEqual(course_progress["completed_lessons"], 1)

    def test_certificate_course_stays_active_until_certificate_is_issued(self):
        self.course.certificate = True
        self.course.save(update_fields=["certificate"])

        for lesson in self.lessons:
            update_learning_progress(
                self.student.id,
                lesson.id,
                {"progress_percentage": 100, "is_completed": True},
            )

        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.progress, Decimal("100.00"))
        self.assertEqual(self.enrollment.status, Enrollment.Status.Active)
        self.assertIsNone(self.enrollment.completion_date)
