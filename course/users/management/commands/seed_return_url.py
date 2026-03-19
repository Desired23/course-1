from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal

from users.models import User
from courses.models import Course
from payments.models import Payment
from payment_details.models import Payment_Details


class Command(BaseCommand):
    help = "Seed a few payment records for return-URL testing"

    def handle(self, *args, **options):
        student = User.objects.filter(user_type='student').first()
        course = Course.objects.first()
        if not (student and course):
            self.stderr.write("Need at least one student and one course")
            return
        for status in ['pending', 'completed', 'failed']:
            p = Payment.objects.create(
                user=student,
                payment_type=Payment.PaymentType.COURSE_PURCHASE,
                amount=course.price,
                total_amount=course.price,
                payment_status=status,
                payment_method=Payment.PaymentMethod.VNPAY,
            )
            Payment_Details.objects.create(
                payment=p,
                course=course,
                price=course.price,
                final_price=course.price,
            )
            self.stdout.write(f"created payment {p.id} status={status}")
