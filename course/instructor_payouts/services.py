from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from collections import defaultdict
from .models import InstructorPayout
from .serializers import InstructorPayoutSerializer
from instructor_earnings.models import InstructorEarning
from admins.models import Admin


def auto_create_instructor_payouts(processed_by=None, notes='', settle_first=True):
    """Tự động chi trả định kỳ cho giảng viên (mô hình Udemy).

    Không còn bước giảng viên gửi yêu cầu hay admin duyệt thủ công: đợt chạy này
    gom toàn bộ earning AVAILABLE chưa thuộc payout nào của từng giảng viên, tạo
    payout đã ở trạng thái PROCESSED (coi như đã chi trả) và đánh dấu earning PAID.
    Các payout PENDING còn tồn từ luồng cũ cũng được hoàn tất để không bị treo.
    """
    from payment_methods.models import InstructorPayoutMethod

    period = timezone.now().strftime("%Y-%m-%d %H:%M")
    notify = []

    try:
        settled_count = 0
        completed_pending = 0
        created = []
        with transaction.atomic():
            now = timezone.now()

            if settle_first:
                from instructor_earnings.services import update_earnings_available
                settled_count = update_earnings_available().count()

            from instructor_earnings.services import exclude_active_hold_earnings, exclude_open_refund_earnings

            # Hoàn tất các payout PENDING còn sót từ luồng duyệt thủ công cũ:
            # không còn ai duyệt nên đánh dấu PROCESSED để chúng không treo mãi.
            pending_payouts = InstructorPayout.objects.select_for_update().filter(
                status=InstructorPayout.PayoutStatusChoices.PENDING,
                is_deleted=False,
            )
            for payout in pending_payouts:
                payout.status = InstructorPayout.PayoutStatusChoices.PROCESSED
                payout.net_amount = payout.amount - (payout.fee or Decimal('0'))
                payout.processed_date = now
                if processed_by:
                    payout.processed_by = processed_by
                payout.save(update_fields=['status', 'net_amount', 'processed_date', 'processed_by', 'updated_at'])
                InstructorEarning.objects.filter(instructor_payout=payout).update(
                    status=InstructorEarning.StatusChoices.PAID
                )
                completed_pending += 1

            # Gom earning AVAILABLE chưa thuộc payout nào, bỏ qua earning đang bị
            # giữ (report bản quyền) hoặc còn refund đang mở.
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
                    net_amount=total_amount,
                    payment_method=payment_method,
                    period=period,
                    processed_by=processed_by,
                    notes=notes,
                    status=InstructorPayout.PayoutStatusChoices.PROCESSED,
                    processed_date=now,
                )
                InstructorEarning.objects.filter(
                    id__in=[e.id for e in earnings]
                ).update(
                    instructor_payout=payout,
                    status=InstructorEarning.StatusChoices.PAID,
                )

                notify.append((instructor.user_id, payout.id, total_amount))
                created.append({
                    'payout_id': payout.id,
                    'instructor_id': instructor.id,
                    'instructor_name': instructor.user.full_name,
                    'amount': str(total_amount),
                    'earnings_count': len(earnings),
                    'payment_method': payment_method or None,
                    'has_payout_method': default_method is not None,
                })

        for user_id, payout_id, amount in notify:
            try:
                from notifications.services import create_notification
                create_notification(
                    receiver_id=user_id,
                    title="Đã chi trả thu nhập",
                    message=f"Khoản chi trả #{payout_id} ({amount}) đã được xử lý.",
                    type='payment',
                    related_id=payout_id,
                    notification_code='payout_processed',
                )
            except Exception:
                pass

        return {
            'period': period,
            'settled_to_available': settled_count,
            'completed_pending': completed_pending,
            'payouts_created': len(created),
            'total_amount': str(sum((Decimal(c['amount']) for c in created), Decimal('0'))),
            'detail': created,
        }

    except Exception as e:
        raise ValidationError(f"Error creating payouts: {str(e)}")


def get_payouts_for_instructor(instructor_id, status=None, period=None):
    try:
        queryset = InstructorPayout.objects.select_related("instructor__user", "processed_by").filter(instructor=instructor_id)

        if status:
            queryset = queryset.filter(status=status)

        if period:
            queryset = queryset.filter(period=period)

        return queryset

    except Exception as e:
        raise ValidationError(f"Error retrieving payouts: {str(e)}")


def get_all_payouts_as_admin(status=None, period=None, processed_by=None, search=None):
    try:
        queryset = InstructorPayout.objects.select_related("instructor__user", "processed_by").all()

        if processed_by:
            queryset = queryset.filter(processed_by__admin=processed_by)
        if status:
            queryset = queryset.filter(status=status)
        if period:
            queryset = queryset.filter(period=period)
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(instructor__user__full_name__icontains=search)
                | Q(instructor__user__email__icontains=search)
                | Q(instructor__user__username__icontains=search)
            )

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
