"""Demo-critical regression tests for instructor payout requests.

Focus: a payout request can never exceed the instructor's AVAILABLE balance,
and a valid request assigns available earnings (FIFO) to the new payout so the
same earnings cannot be paid out twice.
"""
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from courses.models import Course
from instructor_earnings.models import InstructorEarning
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from instructor_payouts.models import InstructorPayout
from instructor_payouts.services import request_instructor_payout
from users.models import User


class PayoutRequestTests(TestCase):
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
        # Two AVAILABLE earnings totalling 150.00 net.
        for net in (Decimal("100.00"), Decimal("50.00")):
            InstructorEarning.objects.create(
                instructor=self.instructor, course=self.course,
                amount=net, net_amount=net,
                status=InstructorEarning.StatusChoices.AVAILABLE,
            )

    def test_request_exceeding_available_balance_is_rejected(self):
        with self.assertRaises(ValidationError):
            request_instructor_payout(self.instructor, Decimal("200.00"), payout_method_id=None)
        self.assertEqual(InstructorPayout.objects.filter(instructor=self.instructor).count(), 0)

    def test_valid_request_assigns_available_earnings(self):
        request_instructor_payout(self.instructor, Decimal("150.00"), payout_method_id=None)

        payout = InstructorPayout.objects.get(instructor=self.instructor)
        self.assertEqual(payout.amount, Decimal("150.00"))
        self.assertEqual(payout.status, InstructorPayout.PayoutStatusChoices.PENDING)

        # Both earnings are now bound to this payout -> cannot be requested again.
        assigned = InstructorEarning.objects.filter(instructor_payout=payout)
        self.assertEqual(assigned.count(), 2)

        unassigned_available = InstructorEarning.objects.filter(
            instructor=self.instructor,
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout__isnull=True,
        )
        self.assertEqual(unassigned_available.count(), 0)
