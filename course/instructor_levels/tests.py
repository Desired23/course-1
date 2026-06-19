from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from courses.models import Course
from enrollments.models import Enrollment
from instructor_levels.models import InstructorLevel
from instructor_levels.services import (
    check_and_upgrade_instructor_level,
    check_and_upgrade_instructor_levels,
    get_next_instructor_level,
)
from subscription_plans.models import SubscriptionPlan, SubscriptionUsage, UserSubscription
from utils.test_helpers import make_user


class InstructorLevelOrderingTests(TestCase):
    def test_next_level_falls_back_to_stable_order_when_thresholds_match(self):
        current_level = InstructorLevel.objects.create(
            name="Starter",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )
        next_level = InstructorLevel.objects.create(
            name="Silver",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )

        self.assertEqual(get_next_instructor_level(current_level), next_level)

    def test_upgrade_allows_same_threshold_next_level_by_stable_order(self):
        instructor_user = make_user("instructor", username="same_threshold_level_instructor")
        student = make_user("student", username="same_threshold_level_student")
        instructor = instructor_user.instructor
        current_level = InstructorLevel.objects.create(
            name="Starter",
            min_students=1,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )
        target_level = InstructorLevel.objects.create(
            name="Silver",
            min_students=1,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )
        instructor.level = current_level
        instructor.save(update_fields=["level"])
        course = Course.objects.create(title="Same Threshold Upgrade Course", instructor=instructor)
        Enrollment.objects.create(user=student, course=course, status=Enrollment.Status.Active)

        result = check_and_upgrade_instructor_level(instructor)

        instructor.refresh_from_db()
        self.assertEqual(instructor.level_id, target_level.id)
        self.assertEqual(result["new_level"], target_level.name)

    def test_level_metrics_count_completed_and_suspended_students_as_owned(self):
        instructor_user = make_user("instructor", username="owned_level_instructor")
        instructor = instructor_user.instructor
        current_level = InstructorLevel.objects.create(
            name="Starter Owned",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )
        target_level = InstructorLevel.objects.create(
            name="Owned Student Target",
            min_students=2,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
        )
        instructor.level = current_level
        instructor.save(update_fields=["level"])
        course = Course.objects.create(title="Owned Level Course", instructor=instructor)
        Enrollment.objects.create(
            user=make_user("student", username="owned_level_complete"),
            course=course,
            status=Enrollment.Status.Complete,
        )
        Enrollment.objects.create(
            user=make_user("student", username="owned_level_suspended"),
            course=course,
            status=Enrollment.Status.SUSPENDED,
        )
        Enrollment.objects.create(
            user=make_user("student", username="owned_level_cancelled"),
            course=course,
            status=Enrollment.Status.Cancelled,
        )

        result = check_and_upgrade_instructor_level(instructor)

        instructor.refresh_from_db()
        self.assertEqual(instructor.level_id, target_level.id)
        self.assertEqual(result["new_level"], target_level.name)

    def test_bulk_upgrade_allows_same_plan_minutes_next_level_by_stable_order(self):
        instructor_user = make_user("instructor", username="same_plan_minutes_level_instructor")
        student = make_user("student", username="same_plan_minutes_level_student")
        instructor = instructor_user.instructor
        current_level = InstructorLevel.objects.create(
            name="Plan Starter",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=10,
        )
        target_level = InstructorLevel.objects.create(
            name="Plan Silver",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=10,
        )
        instructor.level = current_level
        instructor.save(update_fields=["level"])
        course = Course.objects.create(title="Same Plan Minutes Upgrade Course", instructor=instructor)
        plan = SubscriptionPlan.objects.create(name="Pro", price=Decimal("100.00"))
        subscription = UserSubscription.objects.create(user=student, plan=plan, start_date=timezone.now())
        SubscriptionUsage.objects.create(
            user_subscription=subscription,
            user=student,
            course=course,
            consumed_minutes=10,
        )

        result = check_and_upgrade_instructor_levels()

        instructor.refresh_from_db()
        self.assertEqual(instructor.level_id, target_level.id)
        self.assertEqual(result["total_upgraded"], 1)
