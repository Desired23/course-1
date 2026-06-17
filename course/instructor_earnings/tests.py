from decimal import Decimal
from datetime import timezone as dt_timezone
from django.test import TestCase
from django.utils import timezone

from categories.models import Category
from courses.models import Course
from instructor_earnings.models import InstructorEarning
from instructor_earnings.serializers import InstructorEarningSerializer, SubscriptionRevenueBreakdownSerializer
from instructor_earnings.services import (
    generate_instructor_earnings_from_payment,
    resolve_instructor_rate_snapshot,
    calculate_subscription_earnings_for_month,
    get_instructor_earnings_summary,
    get_subscription_revenue_breakdown_by_course,
)
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from payments.models import Payment
from subscription_plans.models import (
    SubscriptionPlan,
    UserSubscription,
    SubscriptionUsageEvent,
    PlanCourse,
)
from users.models import User


def _make_user(username):
    return User.objects.create(
        username=username,
        email=f"{username}@test.com",
        password_hash="x",
        full_name=username,
    )


def _make_level(name, commission_rate=30, plan_commission_rate=30):
    return InstructorLevel.objects.create(
        name=name,
        commission_rate=Decimal(str(commission_rate)),
        plan_commission_rate=Decimal(str(plan_commission_rate)),
    )


def _make_instructor(username, level=None):
    user = _make_user(username)
    return Instructor.objects.create(user=user, level=level)


def _make_course(title, instructor):
    cat = Category.objects.first() or Category.objects.create(name="Test Cat", slug="test-cat")
    return Course.objects.create(
        title=title,
        instructor=instructor,
        category=cat,
        status="published",
        price=Decimal("100.00"),
    )


def _make_payment(user, amount=Decimal("100.00")):
    return Payment.objects.create(
        user=user,
        payment_method="vnpay",
        amount=amount,
        total_amount=amount,
        payment_status="completed",
    )


def _make_plan(name, price=Decimal("100.00")):
    return SubscriptionPlan.objects.create(
        name=name,
        price=price,
        duration_type="monthly",
        duration_days=30,
        status="active",
    )


def _make_subscription(user, plan, payment=None, start_date=None):
    return UserSubscription.objects.create(
        user=user,
        plan=plan,
        payment=payment,
        start_date=start_date or timezone.now(),
        status="active",
    )


# ---------------------------------------------------------------------------
# Retail earning tests
# ---------------------------------------------------------------------------

class RetailEarningSnapshotTest(TestCase):
    def setUp(self):
        self.level = _make_level("Standard", commission_rate=30)
        self.instructor = _make_instructor("instructor_a", level=self.level)
        self.course = _make_course("Course A", self.instructor)
        self.student = _make_user("student_a")

    def _make_payment_with_detail(self, final_price=Decimal("100.00")):
        from payment_details.models import Payment_Details
        payment = _make_payment(self.student, final_price)
        Payment_Details.objects.create(
            payment=payment,
            course=self.course,
            price=final_price,
            final_price=final_price,
        )
        return payment

    def test_snapshot_saved_on_create(self):
        payment = self._make_payment_with_detail(Decimal("100.00"))
        generate_instructor_earnings_from_payment(payment.id)

        earning = InstructorEarning.objects.get(payment=payment, course=self.course)
        self.assertEqual(earning.platform_commission_rate, Decimal("30.00"))
        self.assertEqual(earning.instructor_share_rate, Decimal("70.00"))
        self.assertEqual(earning.net_amount, Decimal("70.00"))
        self.assertEqual(earning.instructor_level_id_snapshot, self.level.id)
        self.assertEqual(earning.instructor_level_name_snapshot, self.level.name)

    def test_snapshot_immutable_after_level_change(self):
        payment = self._make_payment_with_detail(Decimal("100.00"))
        generate_instructor_earnings_from_payment(payment.id)

        self.level.commission_rate = Decimal("20.00")
        self.level.save()

        earning = InstructorEarning.objects.get(payment=payment, course=self.course)
        self.assertEqual(earning.platform_commission_rate, Decimal("30.00"))
        self.assertEqual(earning.net_amount, Decimal("70.00"))

    def test_idempotent_no_duplicate(self):
        payment = self._make_payment_with_detail(Decimal("100.00"))
        generate_instructor_earnings_from_payment(payment.id)
        generate_instructor_earnings_from_payment(payment.id)

        count = InstructorEarning.objects.filter(payment=payment, course=self.course).count()
        self.assertEqual(count, 1)


# ---------------------------------------------------------------------------
# resolve_instructor_rate_snapshot tests
# ---------------------------------------------------------------------------

class ResolveRateSnapshotTest(TestCase):
    def test_retail_uses_commission_rate(self):
        level = _make_level("Gold", commission_rate=25, plan_commission_rate=20)
        instructor = _make_instructor("i1", level=level)
        snap = resolve_instructor_rate_snapshot(instructor, "retail")
        self.assertEqual(snap["platform_commission_rate"], Decimal("25.00"))
        self.assertEqual(snap["instructor_share_rate"], Decimal("75.00"))

    def test_subscription_uses_plan_commission_rate(self):
        level = _make_level("Gold2", commission_rate=25, plan_commission_rate=20)
        instructor = _make_instructor("i2", level=level)
        snap = resolve_instructor_rate_snapshot(instructor, "subscription")
        self.assertEqual(snap["platform_commission_rate"], Decimal("20.00"))
        self.assertEqual(snap["instructor_share_rate"], Decimal("80.00"))

    def test_no_level_defaults_to_30(self):
        instructor = _make_instructor("i3", level=None)
        snap = resolve_instructor_rate_snapshot(instructor, "retail")
        self.assertEqual(snap["platform_commission_rate"], Decimal("30.00"))
        self.assertEqual(snap["instructor_share_rate"], Decimal("70.00"))


# ---------------------------------------------------------------------------
# Usage event tests
# ---------------------------------------------------------------------------

class SubscriptionUsageEventTest(TestCase):
    def setUp(self):
        from enrollments.models import Enrollment
        from lessons.models import Lesson
        from coursemodules.models import CourseModule

        self.level = _make_level("Basic", plan_commission_rate=30)
        self.instructor = _make_instructor("inst_b", level=self.level)
        self.student = _make_user("student_b")
        self.course = _make_course("Course B", self.instructor)
        self.plan = _make_plan("Monthly")
        PlanCourse.objects.create(plan=self.plan, course=self.course, status="active")
        self.payment = _make_payment(self.student)
        self.sub = _make_subscription(self.student, self.plan, payment=self.payment)

        self.enrollment = Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status="active",
            source="subscription",
            subscription=self.sub,
        )
        self.module = CourseModule.objects.create(
            course=self.course, title="Mod 1", order_number=1, status="Published",
        )
        self.lesson = Lesson.objects.create(
            coursemodule=self.module,
            title="L1",
            duration=5,
            order=1,
            status="published",
            content_type="video",
        )

    def _call(self, delta_seconds, previous_position=0):
        from subscription_plans.services import record_subscription_usage_event_from_progress
        return record_subscription_usage_event_from_progress(
            user=self.student,
            enrollment=self.enrollment,
            course=self.course,
            lesson=self.lesson,
            delta_seconds=delta_seconds,
        )

    def test_creates_event_with_snapshot(self):
        event = self._call(60)
        self.assertIsNotNone(event)
        self.assertEqual(event.delta_seconds, 60)
        self.assertEqual(event.platform_commission_rate_snapshot, Decimal("30.00"))
        self.assertEqual(event.instructor_share_rate_snapshot, Decimal("70.00"))
        self.assertEqual(event.instructor_level_id_snapshot, self.level.id)

    def test_zero_delta_no_event(self):
        event = self._call(0)
        self.assertIsNone(event)

    def test_aggregate_updated(self):
        from subscription_plans.models import SubscriptionUsage
        self._call(60)
        usage = SubscriptionUsage.objects.filter(
            user_subscription=self.sub,
            user=self.student,
            course=self.course,
        ).first()
        self.assertIsNotNone(usage)
        self.assertEqual(usage.consumed_seconds, 60)
        self.assertEqual(usage.consumed_minutes, 1)

    def test_aggregate_cumulative(self):
        from subscription_plans.models import SubscriptionUsage
        self._call(60)
        self._call(60)
        usage = SubscriptionUsage.objects.get(
            user_subscription=self.sub,
            user=self.student,
            course=self.course,
            usage_type="lesson_access",
        )
        self.assertEqual(usage.consumed_seconds, 120)

    def test_snapshot_reflects_level_at_time(self):
        event1 = self._call(60)
        self.assertEqual(event1.platform_commission_rate_snapshot, Decimal("30.00"))

        self.level.plan_commission_rate = Decimal("20.00")
        self.level.save()
        self.instructor.refresh_from_db()

        event2 = self._call(60)
        self.assertEqual(event2.platform_commission_rate_snapshot, Decimal("20.00"))
        self.assertEqual(event1.platform_commission_rate_snapshot, Decimal("30.00"))

    def test_no_subscription_no_event(self):
        from subscription_plans.models import SubscriptionUsageEvent
        from subscription_plans.services import record_subscription_usage_event_from_progress

        self.sub.status = "cancelled"
        self.sub.save()

        initial_count = SubscriptionUsageEvent.objects.count()
        record_subscription_usage_event_from_progress(
            user=self.student,
            enrollment=self.enrollment,
            course=self.course,
            lesson=self.lesson,
            delta_seconds=60,
        )
        self.assertEqual(SubscriptionUsageEvent.objects.count(), initial_count)


# ---------------------------------------------------------------------------
# Subscription earning calculation tests
# ---------------------------------------------------------------------------

class SubscriptionEarningCalculationTest(TestCase):
    def setUp(self):
        from enrollments.models import Enrollment

        self.level = _make_level("Lv1", plan_commission_rate=30)
        self.instructor = _make_instructor("inst_c", level=self.level)
        self.student = _make_user("student_c")
        self.course = _make_course("Course C", self.instructor)

        self.plan = _make_plan("Basic Plan", price=Decimal("100.00"))
        PlanCourse.objects.create(plan=self.plan, course=self.course, status="active")

        self.payment = _make_payment(self.student, Decimal("100.00"))
        self.sub = _make_subscription(
            self.student, self.plan, payment=self.payment,
            start_date=timezone.datetime(2026, 1, 15, tzinfo=dt_timezone.utc),
        )
        self.enrollment = Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status="active",
            source="subscription",
            subscription=self.sub,
        )

    def _create_event(self, delta_seconds, occurred_at=None, platform_rate=30, share_rate=70):
        return SubscriptionUsageEvent.objects.create(
            user_subscription=self.sub,
            user=self.student,
            course=self.course,
            enrollment=self.enrollment,
            instructor=self.instructor,
            delta_seconds=delta_seconds,
            occurred_at=occurred_at or timezone.datetime(2026, 1, 20, tzinfo=dt_timezone.utc),
            platform_commission_rate_snapshot=Decimal(str(platform_rate)),
            instructor_share_rate_snapshot=Decimal(str(share_rate)),
            instructor_level_id_snapshot=self.level.id,
            instructor_level_name_snapshot=self.level.name,
        )

    def test_single_course_single_instructor(self):
        self._create_event(600)
        result = calculate_subscription_earnings_for_month(2026, 1)
        self.assertEqual(result['earnings_created'], 1)

        earning = InstructorEarning.objects.get(user_subscription=self.sub, course=self.course)
        self.assertEqual(earning.amount, Decimal("100.00"))
        self.assertEqual(earning.net_amount, Decimal("70.00"))
        self.assertEqual(earning.platform_commission_rate, Decimal("30.00"))
        self.assertEqual(earning.instructor_share_rate, Decimal("70.00"))
        self.assertEqual(earning.usage_seconds, 600)

    def test_two_courses_allocate_proportionally(self):
        from enrollments.models import Enrollment

        level2 = _make_level("Lv2", plan_commission_rate=30)
        instructor2 = _make_instructor("inst_d", level=level2)
        course2 = _make_course("Course D", instructor2)
        PlanCourse.objects.create(plan=self.plan, course=course2, status="active")
        enrollment2 = Enrollment.objects.create(
            user=self.student,
            course=course2,
            status="active",
            source="subscription",
            subscription=self.sub,
        )

        self._create_event(600)
        SubscriptionUsageEvent.objects.create(
            user_subscription=self.sub,
            user=self.student,
            course=course2,
            enrollment=enrollment2,
            instructor=instructor2,
            delta_seconds=400,
            occurred_at=timezone.datetime(2026, 1, 20, tzinfo=dt_timezone.utc),
            platform_commission_rate_snapshot=Decimal("30.00"),
            instructor_share_rate_snapshot=Decimal("70.00"),
            instructor_level_id_snapshot=level2.id,
            instructor_level_name_snapshot=level2.name,
        )

        calculate_subscription_earnings_for_month(2026, 1)

        e1 = InstructorEarning.objects.get(user_subscription=self.sub, course=self.course)
        e2 = InstructorEarning.objects.get(user_subscription=self.sub, course=course2)
        self.assertEqual(e1.amount, Decimal("60.00"))
        self.assertEqual(e2.amount, Decimal("40.00"))
        self.assertEqual(e1.amount + e2.amount, Decimal("100.00"))

    def test_level_change_mid_month_weighted_net(self):
        self._create_event(600, occurred_at=timezone.datetime(2026, 1, 10, tzinfo=dt_timezone.utc), platform_rate=30, share_rate=70)
        SubscriptionUsageEvent.objects.create(
            user_subscription=self.sub,
            user=self.student,
            course=self.course,
            enrollment=self.enrollment,
            instructor=self.instructor,
            delta_seconds=400,
            occurred_at=timezone.datetime(2026, 1, 20, tzinfo=dt_timezone.utc),
            platform_commission_rate_snapshot=Decimal("20.00"),
            instructor_share_rate_snapshot=Decimal("80.00"),
            instructor_level_id_snapshot=self.level.id,
            instructor_level_name_snapshot=self.level.name,
        )

        calculate_subscription_earnings_for_month(2026, 1)

        earning = InstructorEarning.objects.get(user_subscription=self.sub, course=self.course)
        # total_seconds = 1000, group = 1000 → amount = 100
        # net = 100 * 600/1000 * 70/100 + 100 * 400/1000 * 80/100 = 42 + 32 = 74
        self.assertEqual(earning.amount, Decimal("100.00"))
        self.assertEqual(earning.net_amount, Decimal("74.00"))

    def test_idempotency(self):
        self._create_event(600)
        calculate_subscription_earnings_for_month(2026, 1)
        calculate_subscription_earnings_for_month(2026, 1)
        count = InstructorEarning.objects.filter(user_subscription=self.sub, course=self.course).count()
        self.assertEqual(count, 1)

    def test_paid_earning_not_overwritten(self):
        self._create_event(600)
        calculate_subscription_earnings_for_month(2026, 1)

        earning = InstructorEarning.objects.get(user_subscription=self.sub, course=self.course)
        earning.status = InstructorEarning.StatusChoices.PAID
        earning.net_amount = Decimal("999.00")
        earning.save()

        calculate_subscription_earnings_for_month(2026, 1)
        earning.refresh_from_db()
        self.assertEqual(earning.net_amount, Decimal("999.00"))

    def test_no_usage_no_earning(self):
        result = calculate_subscription_earnings_for_month(2026, 1)
        self.assertEqual(result['earnings_created'], 0)


# ---------------------------------------------------------------------------
# Serializer tests
# ---------------------------------------------------------------------------

class SerializerTest(TestCase):
    def setUp(self):
        self.level = _make_level("Std", commission_rate=30)
        self.instructor = _make_instructor("inst_e", level=self.level)
        self.student = _make_user("student_e")
        self.course = _make_course("Course E", self.instructor)

    def _retail_earning(self, platform_rate=None, net=Decimal("70.00")):
        return InstructorEarning.objects.create(
            instructor=self.instructor,
            course=self.course,
            amount=Decimal("100.00"),
            net_amount=net,
            platform_commission_rate=platform_rate,
            instructor_share_rate=(100 - platform_rate) if platform_rate else None,
            status="pending",
        )

    def test_commission_rate_applied_uses_snapshot(self):
        earning = self._retail_earning(platform_rate=Decimal("30.00"))
        data = InstructorEarningSerializer(earning).data
        self.assertEqual(data['commission_rate_applied'], "30.00")
        self.assertEqual(data['platform_commission_rate'], "30.00")
        self.assertEqual(data['instructor_share_rate'], "70.00")

    def test_commission_rate_applied_fallback_for_legacy(self):
        earning = self._retail_earning(platform_rate=None, net=Decimal("70.00"))
        # Legacy retail earnings (payment set) use reverse calc
        payment = _make_payment(self.student)
        earning.payment = payment
        earning.save()
        data = InstructorEarningSerializer(earning).data
        self.assertEqual(data['commission_rate_applied'], "30.00")

    def test_subscription_earning_has_usage_fields(self):
        plan = _make_plan("P1")
        payment = _make_payment(self.student)
        sub = _make_subscription(self.student, plan, payment=payment)
        earning = InstructorEarning.objects.create(
            instructor=self.instructor,
            course=self.course,
            user_subscription=sub,
            amount=Decimal("60.00"),
            net_amount=Decimal("42.00"),
            platform_commission_rate=Decimal("30.00"),
            instructor_share_rate=Decimal("70.00"),
            usage_share_rate=Decimal("60.0000"),
            usage_seconds=600,
            earning_period_start="2026-01-01",
            earning_period_end="2026-01-31",
            status="pending",
        )
        data = InstructorEarningSerializer(earning).data
        self.assertEqual(data['usage_share_rate'], "60.0000")
        self.assertEqual(data['usage_seconds'], 600)
        self.assertEqual(data['earning_period_start'], "2026-01-01")

    def test_refunded_retail_row_allocates_order_discount_and_zeroes_instructor_net(self):
        from payment_details.models import Payment_Details

        payment = Payment.objects.create(
            user=self.student,
            payment_method="vnpay",
            amount=Decimal("549000.00"),
            discount_amount=Decimal("39999.00"),
            total_amount=Decimal("509001.00"),
            payment_status="completed",
        )
        Payment_Details.objects.create(
            payment=payment,
            course=self.course,
            price=Decimal("549000.00"),
            discount=Decimal("0.00"),
            final_price=Decimal("549000.00"),
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            refund_amount=Decimal("509001.00"),
            refund_request_time=timezone.now(),
            refund_date=timezone.now(),
        )
        earning = InstructorEarning.objects.create(
            instructor=self.instructor,
            course=self.course,
            payment=payment,
            amount=Decimal("549000.00"),
            net_amount=Decimal("384300.00"),
            platform_commission_rate=Decimal("30.00"),
            instructor_share_rate=Decimal("70.00"),
            status="pending",
        )

        data = InstructorEarningSerializer(earning).data

        self.assertEqual(data["sale_price"], "549000.00")
        self.assertEqual(data["platform_discount_amount"], "39999.00")
        self.assertEqual(data["paid_amount"], "509001.00")
        self.assertEqual(data["refund_amount"], "509001.00")
        self.assertEqual(data["instructor_refund_amount"], "356300.70")
        self.assertEqual(data["instructor_net_after_refund"], "0.00")

    def test_subscription_breakdown_uses_recorded_usage_seconds(self):
        plan = _make_plan("P usage")
        payment = _make_payment(self.student)
        sub = _make_subscription(self.student, plan, payment=payment)
        course2 = _make_course("Course E2", self.instructor)

        InstructorEarning.objects.create(
            instructor=self.instructor,
            course=self.course,
            user_subscription=sub,
            amount=Decimal("100.00"),
            net_amount=Decimal("80.00"),
            usage_seconds=120,
            status="pending",
        )
        InstructorEarning.objects.create(
            instructor=self.instructor,
            course=course2,
            user_subscription=sub,
            amount=Decimal("100.00"),
            net_amount=Decimal("20.00"),
            usage_seconds=180,
            status="pending",
        )

        rows, total_usage_seconds = get_subscription_revenue_breakdown_by_course(
            self.instructor.id,
            sort_by="share_desc",
        )
        data = SubscriptionRevenueBreakdownSerializer(
            list(rows),
            many=True,
            context={"total_usage_seconds": total_usage_seconds},
        ).data

        self.assertEqual(total_usage_seconds, 300)
        first = data[0]
        second = data[1]
        self.assertEqual(first["course_id"], course2.id)
        self.assertEqual(first["total_minutes"], 3)
        self.assertEqual(first["share_pct"], "60.0000")
        self.assertEqual(second["course_id"], self.course.id)
        self.assertEqual(second["total_minutes"], 2)
        self.assertEqual(second["share_pct"], "40.0000")

        summary = get_instructor_earnings_summary(self.instructor.id)
        self.assertEqual(summary["subscription"]["total_usage_seconds"], 300)

    def test_legacy_subscription_no_error(self):
        plan = _make_plan("P2")
        payment = _make_payment(self.student)
        sub = _make_subscription(self.student, plan, payment=payment)
        earning = InstructorEarning.objects.create(
            instructor=self.instructor,
            course=self.course,
            user_subscription=sub,
            amount=Decimal("100.00"),
            net_amount=Decimal("50.00"),
            platform_commission_rate=None,
            instructor_share_rate=None,
            status="pending",
        )
        data = InstructorEarningSerializer(earning).data
        self.assertIsNone(data['commission_rate_applied'])
        self.assertIsNone(data['platform_commission_rate'])
