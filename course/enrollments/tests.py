from decimal import Decimal

from django.test import TestCase

from courses.models import Course
from enrollments.services import create_enrollment
from instructor_levels.models import InstructorLevel
from utils.test_helpers import make_user


class EnrollmentInstructorLevelTests(TestCase):
    def test_create_enrollment_updates_instructor_level_by_student_threshold(self):
        instructor_user = make_user("instructor", username="enroll_level_instructor")
        student = make_user("student", username="enroll_level_student")
        instructor = instructor_user.instructor
        Course.objects.create(title="Enrollment Level Course", instructor=instructor)
        target_level = InstructorLevel.objects.create(
            name="Bronze",
            min_students=1,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("25.00"),
            plan_commission_rate=Decimal("25.00"),
        )

        create_enrollment({
            "user_id": student.id,
            "course_id": Course.objects.get(title="Enrollment Level Course").id,
        })

        instructor.refresh_from_db()
        self.assertEqual(instructor.level_id, target_level.id)

    def test_create_enrollment_does_not_update_locked_instructor_level(self):
        instructor_user = make_user("instructor", username="locked_enroll_level_instructor")
        student = make_user("student", username="locked_enroll_level_student")
        instructor = instructor_user.instructor
        instructor.level_locked = True
        instructor.save(update_fields=["level_locked"])
        course = Course.objects.create(title="Locked Enrollment Level Course", instructor=instructor)
        InstructorLevel.objects.create(
            name="Locked Bronze",
            min_students=1,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("25.00"),
            plan_commission_rate=Decimal("25.00"),
        )

        create_enrollment({
            "user_id": student.id,
            "course_id": course.id,
        })

        instructor.refresh_from_db()
        self.assertIsNone(instructor.level_id)
