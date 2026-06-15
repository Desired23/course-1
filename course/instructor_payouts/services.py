from rest_framework.exceptions import ValidationError
from .serializers import InstructorPayoutSerializer
from .models import InstructorPayout
from django.db import transaction
from django.utils import timezone
from instructor_earnings.models import InstructorEarning
from admins.models import Admin
from django.db.models import Sum
from decimal import Decimal
from collections import defaultdict
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from collections import defaultdict
from .models import InstructorPayout
from instructor_earnings.models import InstructorEarning
from .serializers import InstructorPayoutSerializer

def auto_create_instructor_payouts(processed_by=None, notes='', settle_first=True):
    from payment_methods.models import InstructorPayoutMethod

    period = timezone.now().strftime("%Y-%m-%d %H:%M")

    try:
        settled_count = 0
        created = []
        with transaction.atomic():
            if settle_first:
                from instructor_earnings.services import update_earnings_available
                settled_count = update_earnings_available().count()

            from instructor_earnings.services import exclude_active_hold_earnings, exclude_open_refund_earnings
            earnings_qs = exclude_active_hold_earnings(exclude_open_refund_earnings(InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.AVAILABLE,
                instructor_payout__isnull=True,
                is_deleted=False,
            ))).select_for_update().select_related('instructor__user')

            earnings_map = defaultdict(list)
            for earning in earnings_qs:
                earnings_map[earning.instructor].append(earning)

            for instructor, earnings in earnings_map.items():
                total_amount = sum((e.net_amount for e in earnings), Decimal('0'))

                default_method = (
                    InstructorPayoutMethod.objects
                    .filter(instructor=instructor, is_deleted=False)
                    .order_by('-is_default', '-created_at')
                    .first()
                )
                payment_method = default_method.method_type if default_method else ''

                payout = InstructorPayout.objects.create(
                    instructor=instructor,
                    amount=total_amount,
                    payment_method=payment_method,
                    period=period,
                    processed_by=processed_by,
                    notes=notes,
                    status=InstructorPayout.PayoutStatusChoices.PENDING,
                )
                InstructorEarning.objects.filter(
                    id__in=[e.id for e in earnings]
                ).update(instructor_payout=payout)

                created.append({
                    'payout_id': payout.id,
                    'instructor_id': instructor.id,
                    'instructor_name': instructor.user.full_name,
                    'amount': str(total_amount),
                    'earnings_count': len(earnings),
                    'payment_method': payment_method or None,
                    'has_payout_method': default_method is not None,
                })

        return {
            'period': period,
            'settled_to_available': settled_count,
            'payouts_created': len(created),
            'total_amount': str(sum((Decimal(c['amount']) for c in created), Decimal('0'))),
            'detail': created,
        }

    except Exception as e:
        raise ValidationError(f"Error creating payouts: {str(e)}")

def admin_update_instructor_payout(payout_id, status, transaction_id, notes, fee, processed_date, period = None , processed_by=None):
    # Legacy PATCH path. Delegate to the dedicated approve/reject services so the
    # earning ledger (drop refunded earnings, mark paid, release on reject) stays
    # consistent instead of blindly flipping the status field.
    if status == InstructorPayout.PayoutStatusChoices.PROCESSED:
        return admin_approve_payout(
            payout_id=payout_id,
            admin=processed_by,
            transaction_id=transaction_id,
            notes=notes,
            fee=fee or 0,
        )
    if status == InstructorPayout.PayoutStatusChoices.CANCELLED:
        return admin_reject_payout(payout_id=payout_id, admin=processed_by, notes=notes)
    raise ValidationError("Status must be 'processed' or 'cancelled'.")
def get_payouts_for_instructor(instructor_id, status=None, period=None):
    try:
        queryset = InstructorPayout.objects.filter(instructor=instructor_id)

        if status:
            queryset = queryset.filter(status=status)

        if period:
            queryset = queryset.filter(period=period)

        return queryset

    except Exception as e:
        raise ValidationError(f"Error retrieving payouts: {str(e)}")
def get_all_payouts_as_admin(status=None, period=None, processed_by=None):
    try:
        queryset = InstructorPayout.objects.select_related("instructor", "processed_by").all()

        if processed_by:
            queryset = queryset.filter(processed_by__admin=processed_by)
        if status:
            queryset = queryset.filter(status=status)
        if period:
            queryset = queryset.filter(period=period)

        return queryset
    except Exception as e:
        raise ValidationError(f"Error retrieving payouts: {str(e)}")
def get_payout_detail_by_id(payout_id):
    try:
        payout = InstructorPayout.objects.select_related("instructor", "processed_by").get(id=payout_id)
        return InstructorPayoutSerializer(payout).data
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Payout not found.")
    except Exception as e:
        raise ValidationError(f"Error retrieving payout: {str(e)}")
def delete_instructor_payout(payout_id, admin_id):
    try:
        admin_check = Admin.objects.filter(id=admin_id).exists()
        if not admin_check:
            raise ValidationError("Admin not found or does not have permission to delete payouts.")

        payout = InstructorPayout.objects.get(id=payout_id)

        if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
            raise ValidationError("Only pending payouts can be deleted.")

        payout.delete()
        return {"message": "Payout deleted successfully."}

    except InstructorPayout.DoesNotExist:
        raise ValidationError("Payout not found.")
    except Exception as e:
        raise ValidationError(f"Error deleting payout: {str(e)}")


def _mask_tail(value, visible=4):
    if not value:
        return value
    value = str(value)
    if len(value) <= visible:
        return '*' * len(value)
    return '*' * (len(value) - visible) + value[-visible:]


def request_instructor_payout(instructor, amount, payout_method_id, notes='', period=None):
    from payment_methods.models import InstructorPayoutMethod
    from decimal import Decimal, InvalidOperation
    from systems_settings.services import get_decimal_setting

    with transaction.atomic():

        from instructor_earnings.services import exclude_active_hold_earnings, exclude_open_refund_earnings
        try:
            requested = Decimal(str(amount))
        except (InvalidOperation, ValueError, TypeError):
            raise ValidationError({"amount": "Số tiền không hợp lệ."})

        if requested <= 0:
            raise ValidationError({"amount": "Số tiền rút phải lớn hơn 0."})

        min_payout = get_decimal_setting('min_payout', default=Decimal('500000'))
        if requested < min_payout:
            raise ValidationError(
                {"amount": f"Số tiền rút tối thiểu là {min_payout}."}
            )

        # Lock the candidate earnings first, then sum under the lock so the
        # available balance cannot shift (refund/settle) between check and use.
        earnings_qs = exclude_active_hold_earnings(exclude_open_refund_earnings(InstructorEarning.objects.filter(
            instructor=instructor,
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout_id__isnull=True,
            is_deleted=False,
        ))).select_for_update().order_by('created_at')

        covered = Decimal('0')
        earning_ids = []
        for earning in earnings_qs:
            if covered >= requested:
                break
            earning_ids.append(earning.id)
            covered += earning.net_amount

        if covered < requested:
            raise ValidationError(
                f"Requested amount ({amount}) exceeds available balance ({covered})."
            )

        payment_method_label = 'bank_transfer'
        bank_details = {}
        if payout_method_id:
            try:
                pm = InstructorPayoutMethod.objects.get(
                    id=payout_method_id, instructor=instructor, is_deleted=False
                )
                payment_method_label = pm.method_type
                # Do not echo full sensitive account/wallet data back to the client;
                # only return masked identifiers plus non-sensitive labels.
                bank_details = {
                    'bank_name': pm.bank_name,
                    'account_number': _mask_tail(pm.account_number),
                    'account_name': pm.account_name,
                    'wallet_phone': _mask_tail(pm.wallet_phone, visible=3),
                    'nickname': pm.nickname,
                }
            except InstructorPayoutMethod.DoesNotExist:
                raise ValidationError({"payout_method_id": "Payout method not found."})

        payout = InstructorPayout.objects.create(
            instructor=instructor,
            amount=requested,
            payment_method=payment_method_label,
            period=period or timezone.now().strftime("%Y-%m"),
            notes=notes,
            status=InstructorPayout.PayoutStatusChoices.PENDING,
        )

        InstructorEarning.objects.filter(id__in=earning_ids).update(
            instructor_payout=payout
        )

        from systems_settings.services import get_bool_setting
        auto_processed = get_bool_setting('auto_approve_payout', default=True)
        if auto_processed:
            payout.status = InstructorPayout.PayoutStatusChoices.PROCESSED
            payout.net_amount = payout.amount
            payout.processed_date = timezone.now()
            payout.save(update_fields=['status', 'net_amount', 'processed_date', 'updated_at'])
            InstructorEarning.objects.filter(instructor_payout=payout).update(
                status=InstructorEarning.StatusChoices.PAID
            )

        serialized = InstructorPayoutSerializer(payout).data
        serialized['bank_details'] = bank_details

    try:
        from activity_logs.services import log_activity
        log_activity(
            user_id=instructor.user_id,
            action='PAYMENT_SUCCESS' if auto_processed else 'CREATE',
            description=(
                f"Payout #{payout.id} auto-processed ({requested})"
                if auto_processed else
                f"Payout #{payout.id} requested ({requested})"
            ),
            entity_type='instructor_payout',
            entity_id=payout.id,
        )
    except Exception:
        pass

    if auto_processed:
        try:
            from notifications.services import create_notification
            create_notification(
                receiver_id=payout.instructor.user_id,
                title="Yêu cầu rút tiền đã được duyệt",
                message=f"Yêu cầu rút tiền #{payout.id} đã được xử lý.",
                type='payment',
                related_id=payout.id,
                notification_code='payout_processed',
            )
        except Exception:
            pass

    return serialized


def admin_approve_payout(payout_id, admin, transaction_id=None, notes=None, fee=0):
    from decimal import Decimal

    with transaction.atomic():
        try:
            payout = InstructorPayout.objects.select_for_update().get(id=payout_id)
        except InstructorPayout.DoesNotExist:
            raise ValidationError("Payout not found.")

        if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
            raise ValidationError("Only pending payouts can be approved.")

        from instructor_earnings.services import exclude_active_hold_earnings, exclude_open_refund_earnings
        locked = list(
            InstructorEarning.objects.select_for_update().filter(instructor_payout=payout)
        )
        payable_ids = set(
            exclude_active_hold_earnings(exclude_open_refund_earnings(
                InstructorEarning.objects.filter(
                    instructor_payout=payout,
                    status=InstructorEarning.StatusChoices.AVAILABLE,
                    is_deleted=False,
                )
            )).values_list('id', flat=True)
        )
        # Drop earnings that were refunded/cancelled or disputed after the
        # payout was created; only pay the ones still payable.
        dropped = [e for e in locked if e.id not in payable_ids]
        for earning in dropped:
            earning.instructor_payout = None
            earning.save(update_fields=['instructor_payout', 'updated_at'])

        payable_amount = sum(
            (e.net_amount for e in locked if e.id in payable_ids), Decimal('0')
        )

        if payable_amount <= 0:
            raise ValidationError(
                "Không còn khoản doanh thu nào đủ điều kiện chi trả (đã bị hoàn tiền/hủy). "
                "Vui lòng hủy payout này."
            )

        fee_dec = Decimal(str(fee or 0))
        if fee_dec > payable_amount:
            raise ValidationError("Phí không được vượt quá số tiền chi trả thực tế.")

        payout.status = InstructorPayout.PayoutStatusChoices.PROCESSED
        payout.transaction_id = transaction_id
        payout.fee = fee_dec
        payout.amount = payable_amount
        payout.net_amount = payable_amount - fee_dec
        payout.processed_date = timezone.now()
        payout.processed_by = admin
        if notes:
            payout.notes = notes
        payout.save()

        InstructorEarning.objects.filter(
            instructor_payout=payout,
            status=InstructorEarning.StatusChoices.AVAILABLE,
        ).update(status=InstructorEarning.StatusChoices.PAID)

        result = InstructorPayoutSerializer(payout).data

    try:
        from activity_logs.services import log_activity
        log_activity(
            user_id=getattr(admin, 'user_id', None),
            action='PAYMENT_SUCCESS',
            description=f"Payout #{payout.id} approved (net {payout.net_amount}, fee {payout.fee})",
            entity_type='instructor_payout',
            entity_id=payout.id,
        )
    except Exception:
        pass

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=payout.instructor.user_id,
            title="Yêu cầu rút tiền đã được duyệt",
            message=f"Yêu cầu rút tiền #{payout.id} đã được xử lý.",
            type='payment',
            related_id=payout.id,
            notification_code='payout_processed',
        )
    except Exception:
        pass
    return result


def admin_reject_payout(payout_id, admin, notes=None):
    with transaction.atomic():
        try:
            payout = InstructorPayout.objects.select_for_update().get(id=payout_id)
        except InstructorPayout.DoesNotExist:
            raise ValidationError("Payout not found.")

        if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
            raise ValidationError("Only pending payouts can be rejected.")

        payout.status = InstructorPayout.PayoutStatusChoices.CANCELLED
        payout.processed_date = timezone.now()
        payout.processed_by = admin
        if notes:
            payout.notes = notes
        payout.save()


        InstructorEarning.objects.filter(
            instructor_payout=payout
        ).update(instructor_payout=None)

        result = InstructorPayoutSerializer(payout).data

    try:
        from activity_logs.services import log_activity
        log_activity(
            user_id=getattr(admin, 'user_id', None),
            action='UPDATE',
            description=f"Payout #{payout.id} rejected; earnings released back to balance",
            entity_type='instructor_payout',
            entity_id=payout.id,
        )
    except Exception:
        pass

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=payout.instructor.user_id,
            title="Yêu cầu rút tiền bị từ chối",
            message=f"Yêu cầu rút tiền #{payout.id} đã bị từ chối. Số dư đã được hoàn lại.",
            type='payment',
            related_id=payout.id,
            notification_code='payout_rejected',
        )
    except Exception:
        pass
    return result
