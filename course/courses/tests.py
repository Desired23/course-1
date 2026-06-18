"""Main-flow test: instructor/admin course students listing endpoint."""
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from categories.models import Category
from courses.models import Course
from enrollments.models import Enrollment
from reviews.models import Review
from utils.test_helpers import auth_client, make_user


class CourseStudentsViewTests(TestCase):
    def setUp(self):
        self.admin_user = make_user("admin", username="admin_pagination")
        self.client = auth_client(self.admin_user)

        instructor_user = make_user("instructor", username="course_inst")
        self.instructor = instructor_user.instructor
        self.category = Category.objects.create(name="Programming", status="active")
        self.course = Course.objects.create(
            title="Admin Course", instructor=self.instructor,
            category=self.category, status="published", is_public=True,
        )

        self.student_one = make_user("student", username="course_student_one")
        self.student_two = make_user("student", username="course_student_two")

        Enrollment.objects.create(
            user=self.student_one, course=self.course, progress=Decimal("35.00"),
            status=Enrollment.Status.Active, enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.student_two, course=self.course, progress=Decimal("90.00"),
            status=Enrollment.Status.Complete, enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )
        Review.objects.create(
            course=self.course, user=self.student_two, rating=5,
            comment="Great course", status=Review.StatusChoices.APPROVED,
        )

    def test_returns_paginated_course_students_shape(self):
        response = self.client.get(
            f"/api/courses/{self.course.id}/students/", {"page": 1, "page_size": 1}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["total_pages"], 2)
        self.assertEqual(len(response.data["results"]), 1)

    def test_includes_study_time_and_rating_fields(self):
        response = self.client.get(f"/api/courses/{self.course.id}/students/")
        self.assertEqual(response.status_code, 200, response.content)
        row = response.data["results"][0]
        self.assertIn("study_time_minutes", row)
        self.assertIn("rating", row)


class InstructorCourseStatusTests(TestCase):
    def setUp(self):
        self.instructor_user = make_user("instructor", username="status_inst")
        self.client = auth_client(self.instructor_user)
        self.category = Category.objects.create(name="Business", status="active")
        self.course = Course.objects.create(
            title="Published Course",
            instructor=self.instructor_user.instructor,
            category=self.category,
            status=Course.Status.PUBLISHED,
            is_public=True,
            published_date=timezone.now(),
        )

    def test_instructor_can_archive_course_with_active_student_access(self):
        # Plan 1: archive = ngừng bán nhưng học viên cũ vẫn xem; cho phép archive
        # ngay cả khi có học viên đang học.
        student = make_user("student", username="active_course_student")
        Enrollment.objects.create(
            user=student,
            course=self.course,
            status=Enrollment.Status.Active,
            enrollment_date=timezone.now(),
        )

        response = self.client.patch(
            f"/api/courses/{self.course.id}/update",
            {"status": Course.Status.ARCHIVED},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.ARCHIVED)

    def test_instructor_can_restore_archived_course_to_published(self):
        self.course.status = Course.Status.ARCHIVED
        self.course.save(update_fields=["status", "updated_at"])

        response = self.client.patch(
            f"/api/courses/{self.course.id}/update",
            {"status": Course.Status.PUBLISHED},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.PUBLISHED)

    def test_instructor_cannot_restore_admin_archived_course(self):
        self.course.status = Course.Status.ARCHIVED
        self.course.admin_hidden = True
        self.course.save(update_fields=["status", "admin_hidden", "updated_at"])

        response = self.client.patch(
            f"/api/courses/{self.course.id}/update",
            {"status": Course.Status.PUBLISHED},
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.ARCHIVED)

    def test_instructor_cannot_change_status_when_admin_suspended_sale(self):
        self.course.admin_hidden = True
        self.course.save(update_fields=["admin_hidden", "updated_at"])

        response = self.client.patch(
            f"/api/courses/{self.course.id}/update",
            {"status": Course.Status.ARCHIVED},
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, Course.Status.PUBLISHED)
