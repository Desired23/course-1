from decimal import Decimal

from django.test import TestCase

from courses.models import Course
from payments.models import Payment
from subscription_plans.models import CourseSubscriptionConsent, PlanCourse, SubscriptionPlan
from subscription_plans.services import add_course_to_plan, get_plan_candidate_courses
from utils.test_helpers import make_user


class PlanCourseConsentTests(TestCase):
    def setUp(self):
        self.admin = make_user("admin", username="plan_consent_admin")
        self.instructor = make_user("instructor", username="plan_consent_instructor")
        self.plan = SubscriptionPlan.objects.create(
            name="Pro Plan",
            price=Decimal("100000.00"),
            duration_days=30,
            status=SubscriptionPlan.Status.ACTIVE,
        )
        self.course = Course.objects.create(
            title="Course Without Consent",
            instructor=self.instructor.instructor,
            status=Course.Status.PUBLISHED,
            is_public=True,
        )

    def test_admin_can_add_course_without_instructor_subscription_consent(self):
        result = add_course_to_plan(
            self.plan.id,
            self.course.id,
            admin_actor=self.admin.admin,
        )

        self.assertEqual(result["course"], self.course.id)
        self.assertFalse(CourseSubscriptionConsent.objects.filter(course=self.course).exists())
        self.assertTrue(
            PlanCourse.objects.filter(
                plan=self.plan,
                course=self.course,
                status=PlanCourse.Status.ACTIVE,
                is_deleted=False,
            ).exists()
        )

    def test_candidate_courses_do_not_require_subscription_consent(self):
        candidates = get_plan_candidate_courses(self.plan.id)

        self.assertEqual([item["course_id"] for item in candidates], [self.course.id])


class SubscriptionBillingCycleTests(TestCase):
    def test_yearly_payment_creates_one_year_subscription_for_monthly_plan(self):
        student = make_user("student", username="yearly_subscription_student")
        plan = SubscriptionPlan.objects.create(
            name="Monthly Plan",
            price=Decimal("100000.00"),
            duration_days=30,
            status=SubscriptionPlan.Status.ACTIVE,
        )
        payment = Payment.objects.create(
            user=student,
            payment_type=Payment.PaymentType.SUBSCRIPTION,
            subscription_plan=plan,
            amount=Decimal("1200000.00"),
            discount_amount=Decimal("120000.00"),
            total_amount=Decimal("1080000.00"),
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.MOMO,
        )

        from subscription_plans.services import subscribe_to_plan

        result = subscribe_to_plan(student, plan.id, payment.id)
        payment.refresh_from_db()

        self.assertEqual(payment.billing_cycle, Payment.BillingCycle.YEARLY)
        self.assertEqual(result["billing_cycle"], Payment.BillingCycle.YEARLY)
        subscription = payment.subscriptions.get()
        subscription_days = (subscription.end_date - subscription.start_date).days
        self.assertEqual(subscription_days, 365)
