"""Main-flow test: promoting a user to instructor via create_instructor."""
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from courses.models import Course
from enrollments.models import Enrollment
from instructor_earnings.models import InstructorEarning
from instructor_levels.models import InstructorLevel
from instructor_payouts.models import InstructorPayout
from instructors.models import Instructor
from instructors.dashboard_services import get_instructor_analytics_timeseries, get_instructor_dashboard_stats
from instructors.services import create_instructor
from payment_details.models import Payment_Details
from payments.models import Payment
from subscription_plans.models import SubscriptionPlan, SubscriptionUsage, UserSubscription
from users.models import User
from utils.test_helpers import make_user


class CreateInstructorTests(TestCase):
    def test_create_instructor_creates_record_and_grants_role(self):
        user = make_user("student", username="to_be_instructor")

        create_instructor({"user_id": user.id})

        self.assertTrue(Instructor.objects.filter(user=user, is_deleted=False).exists())
        user.refresh_from_db()
        self.assertEqual(user.user_type, User.UserTypeChoices.INSTRUCTOR)

    def test_create_instructor_rejects_existing_instructor(self):
        user = make_user("instructor", username="already_instructor")
        with self.assertRaises(ValidationError):
            create_instructor({"user_id": user.id})


class InstructorDashboardStatsTests(TestCase):
    def test_dashboard_splits_estimated_earnings_and_realized_payouts(self):
        user = make_user("instructor", username="dashboard_instructor")
        instructor = user.instructor
        course = Course.objects.create(title="Dashboard Course", instructor=instructor)

        InstructorEarning.objects.create(
            instructor=instructor,
            course=course,
            amount=Decimal("100.00"),
            net_amount=Decimal("100.00"),
            status=InstructorEarning.StatusChoices.PENDING,
        )
        InstructorEarning.objects.create(
            instructor=instructor,
            course=course,
            amount=Decimal("200.00"),
            net_amount=Decimal("200.00"),
            status=InstructorEarning.StatusChoices.AVAILABLE,
        )
        pending_payout = InstructorPayout.objects.create(
            instructor=instructor,
            amount=Decimal("300.00"),
            net_amount=Decimal("300.00"),
            payment_method="bank_transfer",
            period="2026-06",
            status=InstructorPayout.PayoutStatusChoices.PENDING,
        )
        InstructorEarning.objects.create(
            instructor=instructor,
            course=course,
            amount=Decimal("300.00"),
            net_amount=Decimal("300.00"),
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout=pending_payout,
        )
        processed_payout = InstructorPayout.objects.create(
            instructor=instructor,
            amount=Decimal("400.00"),
            net_amount=Decimal("390.00"),
            payment_method="bank_transfer",
            period="2026-06",
            status=InstructorPayout.PayoutStatusChoices.PROCESSED,
            processed_date=timezone.now(),
        )
        InstructorEarning.objects.create(
            instructor=instructor,
            course=course,
            amount=Decimal("400.00"),
            net_amount=Decimal("400.00"),
            status=InstructorEarning.StatusChoices.PAID,
            instructor_payout=processed_payout,
        )

        stats = get_instructor_dashboard_stats(instructor)

        self.assertEqual(stats["pending_earnings"], 100.0)
        self.assertEqual(stats["available_earnings"], 200.0)
        self.assertEqual(stats["pending_payouts"], 300.0)
        self.assertEqual(stats["estimated_earnings"], 600.0)
        self.assertEqual(stats["realized_earnings"], 390.0)

    def test_dashboard_counts_new_students_this_month_by_unique_student(self):
        user = make_user("instructor", username="dashboard_unique_students_instructor")
        first_student = make_user("student", username="dashboard_unique_student_1")
        second_student = make_user("student", username="dashboard_unique_student_2")
        instructor = user.instructor
        first_course = Course.objects.create(title="First Course", instructor=instructor)
        second_course = Course.objects.create(title="Second Course", instructor=instructor)
        now = timezone.now()

        Enrollment.objects.create(
            user=first_student,
            course=first_course,
            status=Enrollment.Status.Active,
            enrollment_date=now,
        )
        Enrollment.objects.create(
            user=first_student,
            course=second_course,
            status=Enrollment.Status.Active,
            enrollment_date=now,
        )
        Enrollment.objects.create(
            user=second_student,
            course=first_course,
            status=Enrollment.Status.Active,
            enrollment_date=now,
        )

        stats = get_instructor_dashboard_stats(instructor)

        self.assertEqual(stats["total_students"], 2)
        self.assertEqual(stats["new_students_this_month"], 2)

    def test_dashboard_includes_instructor_level_progress(self):
        user = make_user("instructor", username="level_progress_instructor")
        student = make_user("student", username="level_progress_student")
        instructor = user.instructor
        current_level = InstructorLevel.objects.create(
            name="Bronze",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("30.00"),
            plan_commission_rate=Decimal("30.00"),
        )
        next_level = InstructorLevel.objects.create(
            name="Silver",
            min_students=2,
            min_revenue=Decimal("100.00"),
            min_plan_minutes=60,
            commission_rate=Decimal("25.00"),
            plan_commission_rate=Decimal("20.00"),
        )
        instructor.level = current_level
        instructor.save(update_fields=["level"])
        course = Course.objects.create(title="Level Progress Course", instructor=instructor)
        Enrollment.objects.create(user=student, course=course, status=Enrollment.Status.Active)
        InstructorEarning.objects.create(
            instructor=instructor,
            course=course,
            amount=Decimal("40.00"),
            net_amount=Decimal("40.00"),
            status=InstructorEarning.StatusChoices.PENDING,
        )
        plan = SubscriptionPlan.objects.create(name="Pro", price=Decimal("100.00"))
        subscription = UserSubscription.objects.create(
            user=student,
            plan=plan,
            status=UserSubscription.Status.ACTIVE,
            start_date=timezone.now(),
        )
        SubscriptionUsage.objects.create(
            user_subscription=subscription,
            user=student,
            course=course,
            consumed_minutes=30,
        )

        stats = get_instructor_dashboard_stats(instructor)
        progress = stats["level_progress"]

        self.assertEqual(progress["level_name"], "Bronze")
        self.assertEqual(progress["target_level_name"], next_level.name)
        self.assertEqual(progress["commission_rate"], 30.0)
        self.assertEqual(stats["total_plan_minutes"], 30)
        progress_by_label = {item["label"]: item for item in progress["items"]}
        self.assertEqual(progress_by_label["students"]["progress"], 50.0)
        self.assertEqual(progress_by_label["revenue"]["progress"], 40.0)
        self.assertEqual(progress_by_label["plan_minutes"]["progress"], 50.0)

    def test_dashboard_uses_default_level_when_instructor_has_no_assigned_level(self):
        user = make_user("instructor", username="default_level_progress_instructor")
        instructor = user.instructor
        InstructorLevel.objects.create(
            name="Starter",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("30.00"),
            plan_commission_rate=Decimal("30.00"),
        )

        stats = get_instructor_dashboard_stats(instructor)
        progress = stats["level_progress"]

        self.assertEqual(progress["level_name"], "Starter")
        self.assertFalse(progress["using_default"])
        self.assertTrue(progress["is_max_level"])
        instructor.refresh_from_db()
        self.assertEqual(instructor.level.name, "Starter")

    def test_dashboard_call_updates_level_before_returning_next_level_progress(self):
        user = make_user("instructor", username="dashboard_auto_upgrade_instructor")
        student = make_user("student", username="dashboard_auto_upgrade_student")
        instructor = user.instructor
        current_level = InstructorLevel.objects.create(
            name="New Instructor",
            min_students=0,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("30.00"),
            plan_commission_rate=Decimal("30.00"),
        )
        target_level = InstructorLevel.objects.create(
            name="Ready Instructor",
            min_students=1,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("25.00"),
            plan_commission_rate=Decimal("25.00"),
        )
        next_level = InstructorLevel.objects.create(
            name="Pro Instructor",
            min_students=2,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("20.00"),
            plan_commission_rate=Decimal("20.00"),
        )
        InstructorLevel.objects.create(
            name="Expert Instructor",
            min_students=20,
            min_revenue=Decimal("0.00"),
            min_plan_minutes=0,
            commission_rate=Decimal("15.00"),
            plan_commission_rate=Decimal("15.00"),
        )
        instructor.level = current_level
        instructor.save(update_fields=["level"])
        course = Course.objects.create(title="Dashboard Auto Upgrade Course", instructor=instructor)
        Enrollment.objects.create(user=student, course=course, status=Enrollment.Status.Active)

        stats = get_instructor_dashboard_stats(instructor)

        instructor.refresh_from_db()
        self.assertEqual(instructor.level_id, target_level.id)
        self.assertEqual(stats["level_progress"]["level_name"], target_level.name)
        self.assertEqual(stats["level_progress"]["target_level_name"], next_level.name)

    def test_instructor_course_analytics_includes_refund_rate(self):
        user = make_user("instructor", username="refund_rate_instructor")
        student = make_user("student", username="refund_rate_student")
        instructor = user.instructor
        course = Course.objects.create(title="Refund Rate Course", instructor=instructor)

        for index, refund_status in enumerate([
            Payment_Details.RefundStatus.SUCCESS,
            Payment_Details.RefundStatus.PENDING,
        ]):
            payment = Payment.objects.create(
                user=student,
                payment_method=Payment.PaymentMethod.VNPAY,
                amount=100,
                total_amount=100,
                payment_status=Payment.PaymentStatus.COMPLETED,
            )
            Payment_Details.objects.create(
                payment=payment,
                course=course,
                price=100,
                final_price=100,
                refund_status=refund_status,
                refund_request_time=timezone.now() if refund_status == Payment_Details.RefundStatus.SUCCESS else None,
                refund_amount=100 if refund_status == Payment_Details.RefundStatus.SUCCESS else None,
            )
            InstructorEarning.objects.create(
                instructor=instructor,
                course=course,
                payment=payment,
                amount=100,
                net_amount=70,
                status=InstructorEarning.StatusChoices.PENDING,
            )

        data = get_instructor_analytics_timeseries(instructor)
        row = next(item for item in data["top_courses"] if item["course_id"] == course.id)

        self.assertEqual(row["transaction_count"], 2)
        self.assertEqual(row["refund_rate"], 50.0)
