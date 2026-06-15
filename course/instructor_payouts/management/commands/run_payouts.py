from django.core.management.base import BaseCommand

from instructor_payouts.services import auto_create_instructor_payouts


class Command(BaseCommand):
    help = "Settle earning rồi tự tạo payout PENDING theo đợt cho từng instructor (admin duyệt sau)."

    def handle(self, *args, **options):
        result = auto_create_instructor_payouts(
            processed_by=None, notes='Auto cron payout run', settle_first=True
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Payout run: settled={result['settled_to_available']}, "
                f"payouts_created={result['payouts_created']}, total={result['total_amount']}"
            )
        )
