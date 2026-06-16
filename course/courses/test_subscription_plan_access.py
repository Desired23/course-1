from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from courses.models import Course
from enrollments.models import Enrollment
from subscription_plans.models import PlanCourse, SubscriptionPlan, UserSubscription
from subscription_plans.services import user_has_active_subscription_enrollment
from utils.course_access import check_course_access, get_course_access_info, has_existing_course_access
from utils.test_helpers import make_user


class SubscriptionPlanCourseAccessTests(TestCase):
    def setUp(self):
        self.instructor = make_user("instructor", username="plan_access_inst")
        self.student = make_user("student", username="plan_access_student")
        self.course = Course.objects.create(
            title="Plan Course",
            status=Course.Status.PUBLISHED,
            is_public=True,
            instructor=self.instructor.instructor,
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Monthly Plan",
            price=Decimal("100000.00"),
            duration_days=30,
            status=SubscriptionPlan.Status.ACTIVE,
        )
        self.plan_course = PlanCourse.objects.create(
            plan=self.plan,
            course=self.course,
            status=PlanCourse.Status.ACTIVE,
        )
        self.subscription = UserSubscription.objects.create(
            user=self.student,
            plan=self.plan,
            status=UserSubscription.Status.ACTIVE,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
        )
        self.enrollment = Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            source=Enrollment.Source.SUBSCRIPTION,
            subscription=self.subscription,
        )

    def test_subscription_enrollment_loses_access_when_course_removed_from_plan(self):
        self.plan_course.status = PlanCourse.Status.REMOVED
        self.plan_course.removed_at = timezone.now()
        self.plan_course.save(update_fields=["status", "removed_at"])

        with self.assertRaises(PermissionDenied):
            check_course_access(self.student, self.course)

        self.assertFalse(has_existing_course_access(self.student, self.course))
        self.assertFalse(get_course_access_info(self.student, self.course)["has_access"])
        self.assertFalse(
            user_has_active_subscription_enrollment(self.student.id, self.course.id)
        )

    def test_subscription_enrollment_has_access_while_course_remains_in_plan(self):
        access = check_course_access(self.student, self.course)

        self.assertEqual(access.id, self.enrollment.id)
        self.assertTrue(get_course_access_info(self.student, self.course)["has_access"])
        self.assertTrue(
            user_has_active_subscription_enrollment(self.student.id, self.course.id)
        )
