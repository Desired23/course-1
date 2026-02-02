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
            # Bước 1: Lấy toàn bộ earnings đủ điều kiện
            earnings_qs = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.AVAILABLE,
                instructor_payout_id__isnull=True
            ).select_related('instructor_id')
            print(earnings_qs)

            if not earnings_qs.exists():
                raise ValidationError("No available earnings for payout.")

            # Bước 2: Gom earnings theo instructor_id
            earnings_map = defaultdict(list)
            for earning in earnings_qs:
                earnings_map[earning.instructor_id].append(earning)

            # Bước 3: Chuẩn bị danh sách payouts
            payouts_to_create = []
            instructor_earning_ids_map = {}

            for instructor_id, earnings in earnings_map.items():
                total_amount = sum(e.net_amount for e in earnings)
                payout = InstructorPayout(
                    instructor_id=instructor_id,
                    amount=total_amount,
                    period=period or timezone.now().strftime("%Y-%m"),
                    processed_by=processed_by,
                    notes=notes,
                    status=InstructorPayout.PayoutStatusChoices.PENDING,
                    request_date=timezone.now(),
                )
                payouts_to_create.append(payout)
                instructor_earning_ids_map[instructor_id] = [e.earning_id for e in earnings]

            # Bước 4: Tạo payouts hàng loạt (1 query duy nhất)
            InstructorPayout.objects.bulk_create(payouts_to_create)
            created_payouts = InstructorPayout.objects.filter(
                status=InstructorPayout.PayoutStatusChoices.PENDING,
                processed_by=processed_by,
                period=period or timezone.now().strftime("%Y-%m"),
            ).order_by('-request_date')
            # Bước 5: Map lại payouts theo instructor_id
            payout_map = {payout.instructor_id: payout for payout in created_payouts}

            # Bước 6: Gán instructor_payout_id cho các earning
            for instructor_id, earning_ids in instructor_earning_ids_map.items():
                InstructorEarning.objects.filter(earning_id__in=earning_ids).update(
                    instructor_payout_id=payout_map[instructor_id]
                )

            return InstructorPayoutSerializer(payouts_to_create, many=True).data

    except Exception as e:
        raise ValidationError(f"Error creating payouts: {str(e)}")

def admin_update_instructor_payout(payout_id, status, transaction_id, notes, fee, processed_date, period = None , processed_by=None):
    try:
        print(f"Updating payout with ID: {payout_id}, Status: {status}, Transaction ID: {transaction_id}, Notes: {notes}, Fee: {fee}, Processed Date: {processed_date}, Period: {period}, Processed By: {processed_by}")
        with transaction.atomic():
            payout = InstructorPayout.objects.select_for_update().get(payout_id=payout_id)

            if payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
                raise ValidationError("Only pending payouts can be updated.")
            # Cập nhật thông tin payout
            payout.status = status
            payout.transaction_id = transaction_id
            payout.notes = notes
            payout.fee = fee
            payout.net_amount = payout.amount - fee  # Tính toán net_amount sau khi trừ phí
            payout.processed_date = processed_date or timezone.now()
            payout.period = period or payout.period  # Giữ nguyên nếu không có period mới
            payout.processed_by = processed_by or payout.processed_by  # Giữ nguyên nếu không có processed_by mới

            payout.save()

            return InstructorPayoutSerializer(payout).data
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Payout not found.")
    except Exception as e:
        raise ValidationError(f"Error updating payout: {str(e)}")
def get_payouts_for_instructor(instructor_id, status=None, period=None):
    try:
        queryset = InstructorPayout.objects.filter(instructor_id=instructor_id)

        if status:
            queryset = queryset.filter(status=status)

        if period:
            queryset = queryset.filter(period=period)

        return InstructorPayoutSerializer(queryset, many=True).data

    except Exception as e:
        raise ValidationError(f"Error retrieving payouts: {str(e)}")
def get_all_payouts_as_admin(status=None, period=None, processed_by=None):
    try:
        queryset = InstructorPayout.objects.select_related("instructor_id", "processed_by").all()
        print(queryset)
        
        if processed_by:
            queryset = queryset.filter(processed_by__admin_id=processed_by)
        if status:
            queryset = queryset.filter(status=status)
        if period:
            queryset = queryset.filter(period=period)

        return InstructorPayoutSerializer(queryset, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving payouts: {str(e)}")
def get_payout_detail_by_id(payout_id):
    try:
        payout = InstructorPayout.objects.select_related("instructor_id", "processed_by").get(payout_id=payout_id)
        return InstructorPayoutSerializer(payout).data
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Payout not found.")
    except Exception as e:
        raise ValidationError(f"Error retrieving payout: {str(e)}")
def delete_instructor_payout(payout_id, admin_id):
    try:
        admin_check = Admin.objects.filter(admin_id=admin_id).exists()
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





















































# def auto_create_instructor_payouts(processed_by, transaction_id=None, notes='', period=None):
#     try:
#         with transaction.atomic():
#             # Lọc toàn bộ instructor có earnings đủ điều kiện mà chưa payout
#             instructors_with_earnings = InstructorEarning.objects.filter(
#                 status=InstructorEarning.StatusChoices.AVAILABLE,
#                 instructor_payout_id__isnull=True
#             ).values_list('instructor_id', flat=True).distinct()

#             payouts = []

#             for instructor_id in instructors_with_earnings:
#                 earnings = InstructorEarning.objects.filter(
#                     instructor_id=instructor_id,
#                     status=InstructorEarning.StatusChoices.AVAILABLE,
#                     instructor_payout_id__isnull=True
#                 )

#                 total_amount = earnings.aggregate(total=Sum('net_amount'))['total'] or Decimal('0.00')

#                 if total_amount > 0:
#                     payout = InstructorPayout.objects.create(
#                         instructor_id=instructor_id,
#                         amount=total_amount,
#                         period=period or timezone.now().strftime("%Y-%m"),
#                         processed_by=processed_by,
#                         transaction_id=transaction_id,
#                         notes=notes,
#                         status=InstructorPayout.PayoutStatusChoices.PENDING,
#                         request_date=timezone.now(),
#                     )

#                     earnings.update(instructor_payout_id=payout)
#                     payouts.append(payout)

#             return InstructorPayoutSerializer(payouts, many=True).data

#     except Exception as e:
#         raise ValidationError(f"Error creating payouts: {str(e)}")
# def admin_create_instructor_payout(processed_by, transaction_id=None, notes='', period=None):
#     try:

#         earnings = InstructorEarning.objects.filter(
#             status=InstructorEarning.StatusChoices.AVAILABLE,
#             instructor_payout_id__isnull=True  # tránh duplicate payout
#         )

#         if not earnings.exists():
#             raise ValidationError("No available earnings for this instructor.")

#         total_amount = earnings.aggregate(total=Sum('net_amount'))['total'] or Decimal('0.00')

#         payout = InstructorPayout.objects.create(
#             instructor_id=earnings.first().instructor_id,  # Lấy instructor từ earnings đầu tiên
#             amount=total_amount,
#             period=period or timezone.now().strftime("%Y-%m"),
#             processed_by=processed_by,
#             transaction_id=transaction_id,
#             notes=notes,
#             status=InstructorPayout.PayoutStatusChoices.PENDING,
#             request_date=timezone.now(),
#         )

        
#         earnings.update(instructor_payout_id=payout)

#         return InstructorPayoutSerializer(payout).data

#     except Exception as e:
#         raise ValidationError(f"Error creating payout: {str(e)}")
