import urllib.parse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test import RequestFactory
from django.utils import timezone

from payments.models import Payment
from payments.vnpay_services import hmacsha512, payment_ipn


def _build_ipn_hash(params):
    input_data = sorted(params.items())
    has_data = ""
    seq = 0
    for key, val in input_data:
        if str(key).startswith("vnp_"):
            if seq == 1:
                has_data += "&" + str(key) + "=" + urllib.parse.quote_plus(str(val))
            else:
                seq = 1
                has_data = str(key) + "=" + urllib.parse.quote_plus(str(val))
    return hmacsha512(settings.VNPAY_HASH_SECRET_KEY, has_data)


class Command(BaseCommand):
    help = "Simulate a successful VNPay IPN callback for a local payment and run the normal completion flow."

    def add_arguments(self, parser):
        parser.add_argument("payment_id", type=int, help="Local payment id to finalize.")
        parser.add_argument(
            "--transaction-no",
            required=True,
            help="Numeric VNPay transaction number returned by the gateway.",
        )
        parser.add_argument(
            "--bank-code",
            default="NCB",
            help="VNPay bank code. Defaults to NCB.",
        )
        parser.add_argument(
            "--pay-date",
            default=None,
            help="VNPay pay date in yyyyMMddHHmmss. Defaults to current Asia/Ho_Chi_Minh time.",
        )
        parser.add_argument(
            "--response-code",
            default="00",
            help="VNPay response code. Defaults to 00.",
        )

    def handle(self, *args, **options):
        payment_id = options["payment_id"]
        transaction_no = str(options["transaction_no"]).strip()
        if not transaction_no.isdigit():
            raise CommandError("--transaction-no must be numeric to match VNPay IPN data.")

        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist as exc:
            raise CommandError(f"Payment {payment_id} not found.") from exc

        pay_date = options["pay_date"] or timezone.localtime(
            timezone.now(),
            timezone.get_fixed_timezone(420),
        ).strftime("%Y%m%d%H%M%S")

        params = {
            "vnp_TxnRef": str(payment.id),
            "vnp_Amount": str(int(payment.total_amount * 100)),
            "vnp_ResponseCode": options["response_code"],
            "vnp_TransactionNo": transaction_no,
            "vnp_BankCode": options["bank_code"],
            "vnp_PayDate": pay_date,
            "vnp_TransactionStatus": "00" if options["response_code"] == "00" else options["response_code"],
        }
        params["vnp_SecureHash"] = _build_ipn_hash(params)

        request = RequestFactory().get("/api/vnpay/ipn/", data=params)
        response = payment_ipn(request)
        payment.refresh_from_db()

        self.stdout.write(self.style.SUCCESS(f"IPN response: {response.content.decode('utf-8')}"))
        self.stdout.write(
            f"Payment {payment.id}: status={payment.payment_status}, transaction_id={payment.transaction_id}, gateway_response={payment.gateway_response}"
        )
