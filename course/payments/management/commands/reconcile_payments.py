from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import Payment
from payment_details.models import Payment_Details
from enrollments.models import Enrollment
from decimal import Decimal

class Command(BaseCommand):
    help = (
        "Scan completed payments and report/fix any inconsistencies such as "
        "missing payment details or enrollments. Admins can run this as a cron."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Automatically create missing enrollments when possible.",
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        now = timezone.now()
        payments = Payment.objects.filter(payment_status=Payment.PaymentStatus.COMPLETED)
        total = payments.count()
        self.stdout.write(f"Reconciling {total} completed payments...")
        problems = 0

        for payment in payments:
            details = Payment_Details.objects.filter(payment=payment, is_deleted=False)
            if not details.exists():
                problems += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Payment {payment.id} has no details (total_amount={payment.total_amount})"
                    )
                )
                continue

            for detail in details:
                course = detail.course
                if not course:
                    problems += 1
                    self.stdout.write(
                        self.style.WARNING(f"PaymentDetail {detail.id} missing course")
                    )
                    continue
                enrolled = Enrollment.objects.filter(
                    user=payment.user, course=course, is_deleted=False
                ).exists()
                if not enrolled:
                    problems += 1
                    msg = f"User {payment.user.id} not enrolled in course {course.id} for payment {payment.id}"
                    if fix:
                        Enrollment.objects.create(
                            user=payment.user, course=course, status=Enrollment.Status.Active
                        )
                        msg = msg + " (enrollment created)"
                    self.stdout.write(self.style.ERROR(msg))
        if problems == 0:
            self.stdout.write(self.style.SUCCESS("No inconsistencies found."))
        else:
            self.stdout.write(self.style.NOTICE(f"Reconciliation finished with {problems} issues."))
