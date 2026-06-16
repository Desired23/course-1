from django.test import TestCase
from django.urls import reverse

from courses.models import Course
from coursemodules.models import CourseModule
from enrollments.models import Enrollment
from lessons.models import Lesson
from utils.test_helpers import auth_client, make_user


class LessonMediaAccessTests(TestCase):
    def setUp(self):
        self.instructor = make_user("instructor", username="lesson_owner")
        self.student = make_user("student", username="lesson_student")
        self.other = make_user("student", username="lesson_other")
        self.course = Course.objects.create(
            title="Protected Course",
            status=Course.Status.PUBLISHED,
            is_public=True,
            instructor=self.instructor.instructor,
        )
        self.module = CourseModule.objects.create(
            course=self.course,
            title="Module 1",
            order_number=1,
        )
        self.paid_lesson = Lesson.objects.create(
            coursemodule=self.module,
            title="Paid Lesson",
            content_type=Lesson.ContentType.VIDEO,
            video_url="https://res.cloudinary.com/demo/video/upload/sample.mp4",
            is_free=False,
            order=1,
        )
        self.free_lesson = Lesson.objects.create(
            coursemodule=self.module,
            title="Free Lesson",
            content_type=Lesson.ContentType.VIDEO,
            video_url="https://res.cloudinary.com/demo/video/upload/free.mp4",
            is_free=True,
            order=2,
        )

    def test_public_lesson_list_masks_paid_media(self):
        response = self.client.get(reverse("lesson-list"))

        self.assertEqual(response.status_code, 200)
        rows = {row["id"]: row for row in response.data["results"]}
        self.assertIsNone(rows[self.paid_lesson.id]["video_url"])
        self.assertIsNone(rows[self.paid_lesson.id]["signed_video_url"])
        self.assertEqual(rows[self.free_lesson.id]["video_url"], self.free_lesson.video_url)

    def test_paid_lesson_detail_requires_course_access(self):
        client = auth_client(self.other)
        response = client.get(reverse("lesson-detail", args=[self.paid_lesson.id]))

        self.assertEqual(response.status_code, 403)

    def test_enrolled_student_can_view_paid_lesson_media(self):
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )
        client = auth_client(self.student)

        response = client.get(reverse("lesson-detail", args=[self.paid_lesson.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["video_url"], self.paid_lesson.video_url)

    def test_hard_blocked_course_blocks_existing_student_lesson_detail(self):
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )
        self.course.is_hard_blocked = True
        self.course.admin_hidden = True
        self.course.save(update_fields=["is_hard_blocked", "admin_hidden"])
        client = auth_client(self.student)

        response = client.get(reverse("lesson-detail", args=[self.paid_lesson.id]))

        self.assertEqual(response.status_code, 403)

        response = client.get(reverse("lesson-detail", args=[self.free_lesson.id]))

        self.assertEqual(response.status_code, 403)

    def test_public_lesson_list_masks_free_media_when_course_is_hard_blocked(self):
        self.course.is_hard_blocked = True
        self.course.admin_hidden = True
        self.course.save(update_fields=["is_hard_blocked", "admin_hidden"])

        response = self.client.get(reverse("lesson-list"))

        self.assertEqual(response.status_code, 200)
        rows = {row["id"]: row for row in response.data["results"]}
        self.assertIsNone(rows[self.free_lesson.id]["video_url"])
        self.assertIsNone(rows[self.free_lesson.id]["signed_video_url"])
