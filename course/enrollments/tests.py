from decimal import Decimal

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError

from courses.models import Course
from enrollments.models import Enrollment
from enrollments.services import create_enrollment
from instructor_levels.models import InstructorLevel
from payment_details.models import Payment_Details
from payments.models import Payment
from utils.course_access import check_course_access, get_course_access_info, has_existing_course_access
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


class EnrollmentPurchaseAccessTests(TestCase):
    def setUp(self):
        self.instructor_user = make_user("instructor", username="paid_course_owner")
        self.student = make_user("student", username="paid_course_student")
        self.course = Course.objects.create(
            title="Paid Course",
            price=Decimal("100000.00"),
            status=Course.Status.PUBLISHED,
            is_public=True,
            instructor=self.instructor_user.instructor,
        )

    def test_paid_course_purchase_enrollment_requires_completed_payment(self):
        with self.assertRaises(ValidationError):
            create_enrollment({
                "user_id": self.student.id,
                "course_id": self.course.id,
                "source": Enrollment.Source.PURCHASE,
            })

        self.assertFalse(Enrollment.objects.filter(user=self.student, course=self.course).exists())

    def test_purchase_enrollment_without_valid_payment_does_not_grant_access(self):
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.PURCHASE,
        )

        self.assertFalse(get_course_access_info(self.student, self.course)["has_access"])
        self.assertFalse(has_existing_course_access(self.student, self.course))
        with self.assertRaises(PermissionDenied):
            check_course_access(self.student, self.course)

    def test_completed_payment_allows_paid_course_purchase_enrollment(self):
        payment = Payment.objects.create(
            user=self.student,
            amount=Decimal("100000.00"),
            total_amount=Decimal("100000.00"),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
        )
        Payment_Details.objects.create(
            payment=payment,
            course=self.course,
            price=Decimal("100000.00"),
            final_price=Decimal("100000.00"),
        )

        create_enrollment({
            "user_id": self.student.id,
            "course_id": self.course.id,
            "payment": payment.id,
            "source": Enrollment.Source.PURCHASE,
        })

        enrollment = Enrollment.objects.get(user=self.student, course=self.course)
        self.assertEqual(enrollment.payment_id, payment.id)
        self.assertTrue(has_existing_course_access(self.student, self.course))
