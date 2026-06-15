from django.core.management.base import BaseCommand

from instructor_earnings.services import update_earnings_available


class Command(BaseCommand):
    help = "Đẩy các earning đã qua hạn refund từ PENDING -> AVAILABLE."

    def handle(self, *args, **options):
        settled = update_earnings_available().count()
        self.stdout.write(self.style.SUCCESS(f"Earnings settled to AVAILABLE: {settled}"))
