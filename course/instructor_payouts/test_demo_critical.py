"""Demo-critical regression tests for automatic instructor payouts.

Focus: the periodic payout run gathers a teacher's AVAILABLE earnings, creates a
payout that is immediately PROCESSED (no manual request/approval), marks those
earnings PAID, and never pays the same earning twice. Pre-existing PENDING
payouts left over from the old manual flow get completed instead of hanging.
"""
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.test import TestCase

from courses.models import Course
from instructor_earnings.models import InstructorEarning
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from instructor_payouts.models import InstructorPayout
from instructor_payouts.services import auto_create_instructor_payouts
from utils.test_helpers import auth_client, make_user
from users.models import User


class AutoPayoutTests(TestCase):
    def setUp(self):
        level = InstructorLevel.objects.create(
            name="Bronze", description="level",
            min_students=0, min_revenue=Decimal("0"),
            commission_rate=Decimal("30"), plan_commission_rate=Decimal("30"),
        )
        instr_user = User.objects.create(
            username="payout_teacher", email="payout_teacher@example.com",
            password_hash=make_password("password123"),
            full_name="Payout Teacher", status="active",
        )
        self.instructor = Instructor.objects.create(user=instr_user, level=level)
        self.course = Course.objects.create(
            title="Payout Course", shortdescription="x", description="x",
            instructor=self.instructor, category_id=None, subcategory_id=None,
            price=Decimal("100.00"), level="beginner", language="English",
            duration=60, total_lessons=1, thumbnail="/static/img.jpg",
        )
        # Two AVAILABLE earnings totalling 150.00 net, not yet linked to a payout.
        for net in (Decimal("100.00"), Decimal("50.00")):
            InstructorEarning.objects.create(
                instructor=self.instructor, course=self.course,
                amount=net, net_amount=net,
                status=InstructorEarning.StatusChoices.AVAILABLE,
            )

    def test_run_creates_processed_payout_and_marks_earnings_paid(self):
        result = auto_create_instructor_payouts(settle_first=False)

        self.assertEqual(result["payouts_created"], 1)

        payout = InstructorPayout.objects.get(instructor=self.instructor)
        self.assertEqual(payout.status, InstructorPayout.PayoutStatusChoices.PROCESSED)
        self.assertEqual(payout.amount, Decimal("150.00"))
        self.assertEqual(payout.net_amount, Decimal("150.00"))
        self.assertIsNotNone(payout.processed_date)

        # Both earnings are now bound to this payout and PAID.
        assigned = InstructorEarning.objects.filter(instructor_payout=payout)
        self.assertEqual(assigned.count(), 2)
        self.assertTrue(all(e.status == InstructorEarning.StatusChoices.PAID for e in assigned))

    def test_run_is_idempotent_no_double_payout(self):
        auto_create_instructor_payouts(settle_first=False)
        # Earnings are PAID and linked, so a second run pays nothing more.
        result = auto_create_instructor_payouts(settle_first=False)
        self.assertEqual(result["payouts_created"], 0)
        self.assertEqual(InstructorPayout.objects.filter(instructor=self.instructor).count(), 1)

    def test_leftover_pending_payout_is_completed(self):
        # Simulate a payout left PENDING by the removed manual-approval flow.
        pending = InstructorPayout.objects.create(
            instructor=self.instructor, amount=Decimal("75.00"),
            payment_method="bank_transfer", period="2024-06",
            status=InstructorPayout.PayoutStatusChoices.PENDING,
        )
        InstructorEarning.objects.create(
            instructor=self.instructor, course=self.course,
            amount=Decimal("75.00"), net_amount=Decimal("75.00"),
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout=pending,
        )

        auto_create_instructor_payouts(settle_first=False)

        pending.refresh_from_db()
        self.assertEqual(pending.status, InstructorPayout.PayoutStatusChoices.PROCESSED)
        self.assertEqual(pending.net_amount, Decimal("75.00"))
        self.assertTrue(
            InstructorEarning.objects.filter(
                instructor_payout=pending,
                status=InstructorEarning.StatusChoices.PAID,
            ).exists()
        )


class InstructorPayoutAdminSearchTests(TestCase):
    def setUp(self):
        self.admin_user = make_user("admin", username="payout_search_admin")
        self.client = auth_client(self.admin_user)

        self.alice_user = make_user(
            "instructor",
            username="alice_payout_teacher",
            email="alice_payout@example.com",
            full_name="Alice Nguyen",
        )
        self.bob_user = make_user(
            "instructor",
            username="bob_payout_teacher",
            email="bob_payout@example.com",
            full_name="Bob Tran",
        )

        InstructorPayout.objects.create(
            instructor=self.alice_user.instructor,
            amount=Decimal("100.00"),
            payment_method="bank_transfer",
            period="2026-06",
            status=InstructorPayout.PayoutStatusChoices.PROCESSED,
        )
        InstructorPayout.objects.create(
            instructor=self.bob_user.instructor,
            amount=Decimal("200.00"),
            payment_method="bank_transfer",
            period="2026-06",
            status=InstructorPayout.PayoutStatusChoices.PROCESSED,
        )

    def test_admin_can_search_payouts_by_instructor_name(self):
        response = self.client.get("/api/instructor-payouts/", {"search": "alice"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        result = response.data["results"][0]
        self.assertEqual(result["instructor_name"], "Alice Nguyen")
        self.assertEqual(result["instructor_email"], "alice_payout@example.com")
