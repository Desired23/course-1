"""Plan 1 — Archived course is read-only for learners.

archived = ngừng bán, học viên cũ vẫn xem được nội dung, nhưng mọi tương tác
học tập/cộng đồng (review, comment, quiz) bị khóa.
"""
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from courses.models import Course
from courses.services import update_course
from coursemodules.models import CourseModule
from lessons.models import Lesson
from enrollments.models import Enrollment
from utils.course_access import is_course_buyable
from utils.test_helpers import make_user


class ArchiveReadOnlyTests(TestCase):
    def setUp(self):
        self.instructor = make_user("instructor", username="arch_inst")
        self.student = make_user("student", username="arch_stud")
        self.course = Course.objects.create(
            title="Python 2022",
            status=Course.Status.PUBLISHED,
            is_public=True,
            instructor=self.instructor.instructor,
        )
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )

    def _archive(self):
        self.course.status = Course.Status.ARCHIVED
        self.course.save(update_fields=["status"])
        self.course.refresh_from_db()

    def test_instructor_can_archive_course_with_active_enrollment(self):
        update_course(self.course.id, {"status": "archived"}, requesting_user=self.instructor)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.ARCHIVED)

    def test_archived_course_is_not_buyable(self):
        self._archive()
        self.assertFalse(is_course_buyable(self.course))

    def test_archived_course_blocks_review(self):
        from reviews.services import create_review

        self._archive()
        with self.assertRaises(ValidationError):
            create_review({
                "user": self.student.id,
                "course": self.course.id,
                "rating": 5,
                "comment": "still good",
            })

    def test_archived_course_blocks_lesson_comment(self):
        from lesson_comments.services import create_lesson_comment

        module = CourseModule.objects.create(course=self.course, title="M1", order_number=1)
        lesson = Lesson.objects.create(
            coursemodule=module,
            title="L1",
            content_type=Lesson.ContentType.VIDEO,
            order=1,
        )
        self._archive()
        with self.assertRaises(ValidationError):
            create_lesson_comment(self.student.id, lesson.id, "outdated?")
