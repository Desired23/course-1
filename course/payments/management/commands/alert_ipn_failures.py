from django.core.management.base import BaseCommand
from payments.models import Payment
from django.utils import timezone

class Command(BaseCommand):
    help = "Scan payments with many IPN attempts and pending status; print alerts."

    def handle(self, *args, **options):
        # simple alert: payments pending longer than one hour
        old = timezone.now() - timezone.timedelta(hours=1)
        payments = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.PENDING,
            created_at__lt=old,
        )
        count = payments.count()
        if count:
            self.stdout.write(self.style.ERROR(f"{count} pending payments older than 1h:"))
            for p in payments:
                self.stdout.write(f" - {p.id} created={p.created_at}")
        else:
            self.stdout.write(self.style.SUCCESS("No IPN failure alerts."))
