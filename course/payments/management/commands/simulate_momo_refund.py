from unittest.mock import patch

from django.core.management.base import BaseCommand, CommandError

from payment_details.models import Payment_Details
from payments.momo_services import map_momo_refund_result
from payments.refund_services import admin_refund_action


class Command(BaseCommand):
    help = "Simulate a MoMo refund gateway response for an existing refund request and run the normal admin refund flow."

    def add_arguments(self, parser):
        parser.add_argument("refund_id", type=int, help="Refund detail id to process.")
        parser.add_argument(
            "--admin-user-id",
            type=int,
            required=True,
            help="Admin user id executing the refund action.",
        )
        parser.add_argument(
            "--result-code",
            type=int,
            default=0,
            help="Mock MoMo refund resultCode. Defaults to 0.",
        )
        parser.add_argument(
            "--message",
            default="Thành công",
            help="Mock MoMo refund message.",
        )
        parser.add_argument(
            "--trans-id",
            type=int,
            default=None,
            help="Mock MoMo refund transId. Defaults to original payment transId.",
        )

    def handle(self, *args, **options):
        refund_id = options["refund_id"]
        admin_user_id = options["admin_user_id"]

        try:
            detail = Payment_Details.objects.select_related("payment").get(id=refund_id)
        except Payment_Details.DoesNotExist as exc:
            raise CommandError(f"Refund detail {refund_id} not found.") from exc

        payment = detail.payment
        if payment.payment_method != "momo":
            raise CommandError("simulate_momo_refund only supports refunds for MoMo payments.")

        from users.models import User

        try:
            admin_user = User.objects.get(id=admin_user_id, user_type="admin", status="active")
        except User.DoesNotExist as exc:
            raise CommandError(f"Admin user {admin_user_id} not found or inactive.") from exc

        if detail.refund_status == Payment_Details.RefundStatus.PENDING:
            action = "approve"
        elif detail.refund_status in [Payment_Details.RefundStatus.PROCESSING, Payment_Details.RefundStatus.FAILED]:
            action = "retry"
        else:
            raise CommandError(
                f"Refund detail {refund_id} is in status '{detail.refund_status}'. Only pending/processing/failed are supported."
            )

        response_payload = {
            "partnerCode": payment.payment_gateway or "momo",
            "orderId": f"sim-refund-{detail.id}",
            "requestId": f"sim-refund-req-{detail.id}",
            "amount": int(detail.refund_amount or detail.final_price),
            "transId": int(options["trans_id"] or payment.transaction_id or 0),
            "resultCode": int(options["result_code"]),
            "message": options["message"],
            "responseTime": 0,
        }
        gateway_result = map_momo_refund_result(response_payload)

        with patch("payments.refund_services.send_momo_refund_request", return_value=gateway_result):
            result = admin_refund_action(action, [detail.id], admin_user)

        detail.refresh_from_db()
        self.stdout.write(self.style.SUCCESS(f"Refund action result: {result}"))
        self.stdout.write(
            f"Refund {detail.id}: status={detail.refund_status}, response_code={detail.refund_response_code}, "
            f"transaction_id={detail.refund_transaction_id}, last_error={detail.last_gateway_error}"
        )
