from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from admins.dashboard_services import (
    get_admin_best_selling_courses,
    get_admin_creation_stats,
    get_admin_dashboard_stats,
    get_admin_earning_payout_metrics,
    get_admin_promotion_stats,
    get_admin_course_analytics,
    get_admin_revenue_analytics,
    get_admin_revenue_breakdown,
    get_admin_revenue_by_category,
    get_admin_revenue_by_course,
    get_admin_subscription_metrics,
    get_admin_top_courses_by_revenue,
)
from admins.models import Admin
from courses.models import Course
from enrollments.models import Enrollment
from instructor_earnings.models import InstructorEarning
from instructor_payouts.models import InstructorPayout
from instructors.models import Instructor
from payment_details.models import Payment_Details
from payments.models import Payment
from promotions.models import Promotion
from reports.models import CopyrightCase, InstructorEarningHold, Report
from subscription_plans.models import SubscriptionPlan, UserSubscription
from users.models import User


class AdminStatisticsServiceTests(TestCase):
    def _user(self, username):
        unique_username = f'{username}-{User.objects.count() + 1}'
        return User.objects.create(
            username=unique_username,
            email=f'{unique_username}@example.com',
            password_hash='test',
            full_name=username,
        )

    def _course(self, title='Course'):
        instructor = Instructor.objects.create(user=self._user(f'{title.lower()}-instructor'))
        return Course.objects.create(title=title, instructor=instructor, price=100)

    def _completed_payment(self, user, amount, payment_type=Payment.PaymentType.COURSE_PURCHASE):
        return Payment.objects.create(
            user=user,
            amount=amount,
            discount_amount=Decimal('0.00'),
            total_amount=amount,
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_type=payment_type,
        )

    def _purchase(self, course, amount, progress=0, refund_status=Payment_Details.RefundStatus.PENDING, refund_amount=None):
        user = self._user(f'buyer-{course.id}-{progress}-{refund_status}')
        payment = self._completed_payment(user, amount)
        detail = Payment_Details.objects.create(
            payment=payment,
            course=course,
            price=amount,
            discount=Decimal('0.00'),
            final_price=amount,
            refund_status=refund_status,
            refund_amount=refund_amount,
            refund_request_time=timezone.now() if refund_status != Payment_Details.RefundStatus.PENDING else None,
        )
        Enrollment.objects.create(
            user=user,
            course=course,
            payment=payment,
            source=Enrollment.Source.PURCHASE,
            enrollment_date=timezone.now(),
            status=Enrollment.Status.Active,
            progress=Decimal(str(progress)),
        )
        return payment, detail

    def test_revenue_classification_splits_estimated_realized_and_refunded(self):
        eligible_course = self._course('Eligible')
        realized_course = self._course('Realized')
        refunded_course = self._course('Refunded')

        self._purchase(eligible_course, Decimal('100.00'), progress=10)
        self._purchase(realized_course, Decimal('200.00'), progress=60)
        self._purchase(
            refunded_course,
            Decimal('300.00'),
            progress=20,
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            refund_amount=Decimal('300.00'),
        )

        stats = get_admin_revenue_breakdown()

        self.assertEqual(stats['estimated_revenue'], 300.0)
        self.assertEqual(stats['realized_revenue'], 200.0)
        self.assertEqual(stats['refunded_amount'], 300.0)
        self.assertEqual(stats['transaction_count'], 2)
        self.assertEqual(stats['refund_rate'], 60.0)

    def test_revenue_analytics_returns_estimated_and_realized_fields(self):
        eligible_course = self._course('Analytics Eligible')
        realized_course = self._course('Analytics Realized')

        self._purchase(eligible_course, Decimal('100.00'), progress=10)
        self._purchase(realized_course, Decimal('200.00'), progress=60)

        row = get_admin_revenue_analytics(months=1)[0]

        self.assertEqual(row['revenue'], 300.0)
        self.assertEqual(row['estimated_revenue'], 300.0)
        self.assertEqual(row['realized_revenue'], 200.0)
        self.assertEqual(row['transaction_count'], 1)

    def test_top_course_and_category_revenue_include_estimated_unfinalized_revenue(self):
        course = self._course('Estimated Course')
        self._purchase(course, Decimal('100.00'), progress=10)
        plan = SubscriptionPlan.objects.create(name='Estimated Plan', price=Decimal('200.00'), duration_days=30)
        sub_payment = self._completed_payment(
            self._user('estimated-subscriber'),
            Decimal('200.00'),
            Payment.PaymentType.SUBSCRIPTION,
        )
        sub_payment.subscription_plan = plan
        sub_payment.save(update_fields=['subscription_plan'])
        subscription = UserSubscription.objects.create(
            user=sub_payment.user,
            plan=plan,
            payment=sub_payment,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
        )
        InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            user_subscription=subscription,
            amount=Decimal('80.00'),
            net_amount=Decimal('56.00'),
            earning_period_start=timezone.now().date(),
        )

        course_row = get_admin_course_analytics()[0]
        top_row = get_admin_top_courses_by_revenue()[0]
        category_row = get_admin_revenue_by_category()[0]

        self.assertEqual(course_row['estimated_revenue'], 180.0)
        self.assertEqual(course_row['realized_revenue'], 0.0)
        self.assertEqual(course_row['transactions'], 2)
        self.assertEqual(top_row['estimated_revenue'], 180.0)
        self.assertEqual(category_row['estimated_revenue'], 180.0)
        self.assertEqual(category_row['transaction_count'], 0)

    def test_subscription_metrics_split_estimated_and_realized_revenue(self):
        plan = SubscriptionPlan.objects.create(name='Metrics Plan', price=Decimal('100.00'), duration_days=30)
        pending_payment = self._completed_payment(
            self._user('metrics-pending-subscriber'),
            Decimal('100.00'),
            Payment.PaymentType.SUBSCRIPTION,
        )
        pending_payment.subscription_plan = plan
        pending_payment.save(update_fields=['subscription_plan'])
        realized_payment = self._completed_payment(
            self._user('metrics-realized-subscriber'),
            Decimal('200.00'),
            Payment.PaymentType.SUBSCRIPTION,
        )
        realized_payment.subscription_plan = plan
        realized_payment.save(update_fields=['subscription_plan'])
        Payment.objects.filter(id=realized_payment.id).update(payment_date=timezone.now() - timedelta(days=40))

        metrics = get_admin_subscription_metrics()
        plan_row = next(row for row in metrics['per_plan'] if row['plan_id'] == plan.id)

        self.assertEqual(metrics['total_revenue'], 300.0)
        self.assertEqual(metrics['total_estimated_revenue'], 300.0)
        self.assertEqual(metrics['total_realized_revenue'], 200.0)
        self.assertEqual(plan_row['estimated_revenue'], 300.0)
        self.assertEqual(plan_row['realized_revenue'], 200.0)

    def test_dashboard_stats_include_today_estimated_and_realized_revenue(self):
        today_course = self._course('Today')
        pending_refund_course = self._course('Pending Refund')
        old_course = self._course('Old')

        self._purchase(today_course, Decimal('120.00'), progress=60)
        self._purchase(pending_refund_course, Decimal('80.00'), progress=10)
        old_payment, _ = self._purchase(old_course, Decimal('50.00'), progress=60)
        Payment.objects.filter(id=old_payment.id).update(payment_date=timezone.now() - timedelta(days=40))

        stats = get_admin_dashboard_stats()

        self.assertEqual(stats['today_estimated_revenue'], 200.0)
        self.assertEqual(stats['today_realized_revenue'], 120.0)
        self.assertEqual(stats['this_month_estimated_revenue'], 200.0)
        self.assertEqual(stats['this_month_realized_revenue'], 120.0)
        self.assertEqual(stats['total_estimated_revenue'], 250.0)
        self.assertEqual(stats['total_realized_revenue'], 170.0)

    def test_course_revenue_splits_retail_and_subscription(self):
        course = self._course('Split')
        retail_payment, _ = self._purchase(course, Decimal('120.00'), progress=60)
        plan = SubscriptionPlan.objects.create(name='Monthly', price=Decimal('200.00'), duration_days=30)
        sub_payment = self._completed_payment(self._user('subscriber'), Decimal('200.00'), Payment.PaymentType.SUBSCRIPTION)
        Payment.objects.filter(id=sub_payment.id).update(payment_date=timezone.now() - timedelta(days=40))
        subscription = UserSubscription.objects.create(
            user=sub_payment.user,
            plan=plan,
            payment=sub_payment,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
        )
        InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            payment=retail_payment,
            amount=Decimal('120.00'),
            net_amount=Decimal('84.00'),
        )
        InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            user_subscription=subscription,
            amount=Decimal('80.00'),
            net_amount=Decimal('56.00'),
            earning_period_start=timezone.now().date(),
        )

        row = get_admin_revenue_by_course()[0]

        self.assertEqual(row['retail_revenue'], 120.0)
        self.assertEqual(row['subscription_revenue'], 80.0)
        self.assertEqual(row['realized_revenue'], 200.0)
        self.assertEqual(row['transaction_count'], 2)

    def test_course_revenue_includes_refunded_payment_details(self):
        course = self._course('Refunded Course Revenue')
        self._purchase(course, Decimal('499000.00'), progress=60)
        refunded_payment, refunded_detail = self._purchase(
            course,
            Decimal('599000.00'),
            progress=20,
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            refund_amount=Decimal('599000.00'),
        )
        Payment.objects.filter(id=refunded_payment.id).update(
            payment_status=Payment.PaymentStatus.REFUNDED,
            refund_amount=Decimal('599000.00'),
        )
        Payment_Details.objects.filter(id=refunded_detail.id).update(refund_date=timezone.now())

        row = get_admin_revenue_by_course()[0]

        self.assertEqual(row['course_id'], course.id)
        self.assertEqual(row['revenue'], 1098000.0)
        self.assertEqual(row['refunded'], 599000.0)
        self.assertEqual(row['net_revenue'], 499000.0)
        self.assertEqual(row['transaction_count'], 2)

    def test_earning_payout_payable_counts_only_available_unassigned_earnings(self):
        course = self._course('Payable Earnings')
        InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            amount=Decimal('100.00'),
            net_amount=Decimal('70.00'),
            status=InstructorEarning.StatusChoices.PENDING,
        )
        InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            amount=Decimal('200.00'),
            net_amount=Decimal('140.00'),
            status=InstructorEarning.StatusChoices.AVAILABLE,
        )
        held_earning = InstructorEarning.objects.create(
            instructor=course.instructor,
            course=course,
            amount=Decimal('300.00'),
            net_amount=Decimal('210.00'),
            status=InstructorEarning.StatusChoices.AVAILABLE,
        )
        copyright_case = CopyrightCase.objects.create(
            target_type=Report.TargetType.COURSE,
            target_id=course.id,
            course=course,
            instructor=course.instructor,
            financial_action=CopyrightCase.FinancialAction.HOLD,
        )
        InstructorEarningHold.objects.create(
            case=copyright_case,
            earning=held_earning,
            course=course,
            instructor=course.instructor,
        )
        InstructorEarning.objects.filter(id=held_earning.id).update(earning_date=timezone.now() - timedelta(days=90))

        data = get_admin_earning_payout_metrics(
            date_from=timezone.now() - timedelta(days=1),
            date_to=timezone.now(),
        )
        row = data['per_instructor'][0]

        self.assertEqual(data['pending_earnings'], 70.0)
        self.assertEqual(data['available_earnings'], 140.0)
        self.assertEqual(data['active_hold_earnings'], 210.0)
        self.assertEqual(data['payable_earnings'], 140.0)
        self.assertEqual(row['active_hold_earnings'], 210.0)
        self.assertEqual(row['active_hold_count'], 1)
        self.assertEqual(row['payable_earnings'], 140.0)

    def test_promotion_stats_filter_completed_payments_by_payment_date(self):
        admin = Admin.objects.create(user=self._user('promo-admin'), department='Ops', role='admin')
        course = self._course('Promo')
        promotion = Promotion.objects.create(
            code='PROMO20',
            admin=admin,
            discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
            discount_value=Decimal('20.00'),
            start_date=timezone.now() - timedelta(days=10),
            end_date=timezone.now() + timedelta(days=10),
        )
        inside_payment = self._completed_payment(self._user('inside-promo'), Decimal('80.00'))
        outside_payment = self._completed_payment(self._user('outside-promo'), Decimal('80.00'))
        Payment_Details.objects.create(
            payment=inside_payment,
            course=course,
            price=Decimal('100.00'),
            discount=Decimal('20.00'),
            final_price=Decimal('80.00'),
            promotion=promotion,
        )
        Payment_Details.objects.create(
            payment=outside_payment,
            course=course,
            price=Decimal('100.00'),
            discount=Decimal('20.00'),
            final_price=Decimal('80.00'),
            promotion=promotion,
        )
        now = timezone.now()
        Payment.objects.filter(id=inside_payment.id).update(payment_date=now)
        Payment.objects.filter(id=outside_payment.id).update(payment_date=now - timedelta(days=5))

        rows = get_admin_promotion_stats(now - timedelta(hours=1), now + timedelta(hours=1))

        self.assertEqual(rows[0]['code'], 'PROMO20')
        self.assertEqual(rows[0]['used_count'], 1)
        self.assertEqual(rows[0]['discount_amount'], 20.0)
        self.assertEqual(rows[0]['revenue_after_discount'], 80.0)

    def test_creation_stats_counts_entities_by_period(self):
        now = timezone.now()
        outside = now - timedelta(days=7)
        course = self._course('Creation')
        user = self._user('new-user')
        instructor = Instructor.objects.create(user=self._user('new-instructor'))
        payment = self._completed_payment(self._user('order-user'), Decimal('50.00'))
        detail = Payment_Details.objects.create(
            payment=payment,
            course=course,
            price=Decimal('50.00'),
            discount=Decimal('0.00'),
            final_price=Decimal('50.00'),
            refund_status=Payment_Details.RefundStatus.PENDING,
            refund_request_time=now,
        )
        payout = InstructorPayout.objects.create(
            instructor=instructor,
            amount=Decimal('30.00'),
            net_amount=Decimal('30.00'),
            payment_method='bank',
            period='2026-06',
        )

        User.objects.update(created_at=outside)
        User.objects.filter(id=user.id).update(created_at=now)
        Instructor.objects.exclude(id=instructor.id).update(created_at=outside)
        Instructor.objects.filter(id=instructor.id).update(created_at=now)
        Payment.objects.filter(id=payment.id).update(created_at=now)
        Payment_Details.objects.filter(id=detail.id).update(refund_request_time=now)
        InstructorPayout.objects.filter(id=payout.id).update(request_date=now)

        rows = get_admin_creation_stats(now - timedelta(hours=1), now + timedelta(hours=1), 'day')

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['new_users'], 1)
        self.assertEqual(rows[0]['new_instructors'], 1)
        self.assertEqual(rows[0]['new_orders'], 1)
        self.assertEqual(rows[0]['new_refunds'], 1)
        self.assertEqual(rows[0]['new_payouts'], 1)

    def test_best_selling_courses_sort_by_paid_enrollments_then_revenue(self):
        first = self._course('First')
        second = self._course('Second')
        self._purchase(first, Decimal('100.00'), progress=60)
        self._purchase(second, Decimal('50.00'), progress=60)
        self._purchase(second, Decimal('70.00'), progress=60)

        rows = get_admin_best_selling_courses()

        self.assertEqual(rows[0]['course_id'], second.id)
        self.assertEqual(rows[0]['enrollment_count'], 2)
