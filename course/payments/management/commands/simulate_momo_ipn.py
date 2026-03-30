from django.core.management.base import BaseCommand, CommandError

from payments.models import Payment
from payments.momo_services import simulate_momo_ipn


class Command(BaseCommand):
    help = "Simulate a MoMo IPN callback for a local payment."

    def add_arguments(self, parser):
        parser.add_argument("payment_id", type=int)
        parser.add_argument("--trans-id", required=True, type=int)
        parser.add_argument("--result-code", type=int, default=0)
        parser.add_argument("--message", default="Successful.")

    def handle(self, *args, **options):
        try:
            payment = Payment.objects.get(id=options["payment_id"])
        except Payment.DoesNotExist as exc:
            raise CommandError(f"Payment {options['payment_id']} not found.") from exc

        response = simulate_momo_ipn(
            payment,
            trans_id=options["trans_id"],
            result_code=options["result_code"],
            message=options["message"],
        )
        payment.refresh_from_db()
        self.stdout.write(self.style.SUCCESS(f"IPN response: {response.content.decode('utf-8')}"))
        self.stdout.write(
            f"Payment {payment.id}: status={payment.payment_status}, transaction_id={payment.transaction_id}, gateway_response={payment.gateway_response}"
        )
