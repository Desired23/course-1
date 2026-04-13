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

def auto_create_instructor_payouts(processed_by, notes='', period=None):
    try:
        with transaction.atomic():

            earnings_qs = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.AVAILABLE,
                instructor_payout_id__isnull=True
            ).select_related('instructor')

            if not earnings_qs.exists():
                raise ValidationError("No available earnings for payout.")


            earnings_map = defaultdict(list)
            for earning in earnings_qs:
                earnings_map[earning.instructor].append(earning)


            payouts_to_create = []
            instructor_earning_ids_map = {}

            for instructor, earnings in earnings_map.items():
                total_amount = sum(e.net_amount for e in earnings)
                payout = InstructorPayout(
                    instructor=instructor,
                    amount=total_amount,
                    period=period or timezone.now().strftime("%Y-%m"),
                    processed_by=processed_by,
                    notes=notes,
                    status=InstructorPayout.PayoutStatusChoices.PENDING,
                    request_date=timezone.now(),
                )
                payouts_to_create.append(payout)
                instructor_earning_ids_map[instructor] = [e.id for e in earnings]


            InstructorPayout.objects.bulk_create(payouts_to_create)
            created_payouts = InstructorPayout.objects.filter(
                status=InstructorPayout.PayoutStatusChoices.PENDING,
                processed_by=processed_by,
                period=period or timezone.now().strftime("%Y-%m"),
            ).order_by('-request_date')

            payout_map = {payout.instructor: payout for payout in created_payouts}


            for instructor, earning_ids in instructor_earning_ids_map.items():
                InstructorEarning.objects.filter(id__in=earning_ids).update(
                    instructor_payout=payout_map[instructor]
                )

            return InstructorPayout.objects.filter(
                status=InstructorPayout.PayoutStatusChoices.PENDING,
                processed_by=processed_by,
                period=period or timezone.now().strftime("%Y-%m"),
            ).order_by('-request_date')

    except Exception as e:
        raise ValidationError(f"Error creating payouts: {str(e)}")

def admin_update_instructor_payout(payout_id, status, transaction_id, notes, fee, processed_date, period = None , processed_by=None):
    try:
        with transaction.atomic():
            payout = InstructorPayout.objects.select_for_update().get(id=payout_id)

            if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
                raise ValidationError("Only pending payouts can be updated.")

            payout.status = status
            payout.transaction_id = transaction_id
            payout.notes = notes
            payout.fee = fee
            payout.net_amount = payout.amount - fee
            payout.processed_date = processed_date or timezone.now()
            payout.period = period or payout.period
            payout.processed_by = processed_by or payout.processed_by

            payout.save()

            return InstructorPayoutSerializer(payout).data
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Payout not found.")
    except Exception as e:
        raise ValidationError(f"Error updating payout: {str(e)}")
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


def request_instructor_payout(instructor, amount, payout_method_id, notes='', period=None):
    """
    Instructor tự yêu cầu payout dựa trên available earnings.
    Optionally choose a saved payout method.
    """
    from payment_methods.models import InstructorPayoutMethod
    from decimal import Decimal

    with transaction.atomic():

        available = InstructorEarning.objects.filter(
            instructor=instructor,
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout_id__isnull=True,
            is_deleted=False,
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0')

        if Decimal(str(amount)) > available:
            raise ValidationError(
                f"Requested amount ({amount}) exceeds available balance ({available})."
            )


        payment_method_label = 'bank_transfer'
        bank_details = {}
        if payout_method_id:
            try:
                pm = InstructorPayoutMethod.objects.get(
                    id=payout_method_id, instructor=instructor, is_deleted=False
                )
                payment_method_label = pm.method_type
                bank_details = {
                    'bank_name': pm.bank_name,
                    'account_number': pm.account_number,
                    'account_name': pm.account_name,
                    'wallet_phone': pm.wallet_phone,
                    'nickname': pm.nickname,
                }
            except InstructorPayoutMethod.DoesNotExist:
                raise ValidationError({"payout_method_id": "Payout method not found."})

        payout = InstructorPayout.objects.create(
            instructor=instructor,
            amount=Decimal(str(amount)),
            payment_method=payment_method_label,
            period=period or timezone.now().strftime("%Y-%m"),
            notes=notes,
            status=InstructorPayout.PayoutStatusChoices.PENDING,
        )


        earnings_qs = InstructorEarning.objects.filter(
            instructor=instructor,
            status=InstructorEarning.StatusChoices.AVAILABLE,
            instructor_payout_id__isnull=True,
            is_deleted=False,
        ).order_by('created_at')

        covered = Decimal('0')
        earning_ids = []
        for earning in earnings_qs:
            if covered >= Decimal(str(amount)):
                break
            earning_ids.append(earning.id)
            covered += earning.net_amount

        InstructorEarning.objects.filter(id__in=earning_ids).update(
            instructor_payout=payout
        )

        serialized = InstructorPayoutSerializer(payout).data
        serialized['bank_details'] = bank_details
        return serialized


def admin_approve_payout(payout_id, admin, transaction_id=None, notes=None, fee=0):
    """Admin approves a pending payout → marks earnings as paid."""
    from decimal import Decimal

    with transaction.atomic():
        try:
            payout = InstructorPayout.objects.select_for_update().get(id=payout_id)
        except InstructorPayout.DoesNotExist:
            raise ValidationError("Payout not found.")

        if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
            raise ValidationError("Only pending payouts can be approved.")

        fee_dec = Decimal(str(fee or 0))
        payout.status = InstructorPayout.PayoutStatusChoices.PROCESSED
        payout.transaction_id = transaction_id
        payout.fee = fee_dec
        payout.net_amount = payout.amount - fee_dec
        payout.processed_date = timezone.now()
        payout.processed_by = admin
        if notes:
            payout.notes = notes
        payout.save()


        InstructorEarning.objects.filter(
            instructor_payout=payout
        ).update(status=InstructorEarning.StatusChoices.PAID)

        return InstructorPayoutSerializer(payout).data


def admin_reject_payout(payout_id, admin, notes=None):
    """Admin rejects a pending payout → releases earnings back to available."""
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

        return InstructorPayoutSerializer(payout).data




























































































































