from rest_framework.exceptions import ValidationError
from .serializers import InstructorEarningSerializer
from .models import InstructorEarning
from django.db import transaction
from django.db.models import Q, Sum, F
from django.utils import timezone
from datetime import datetime, timedelta, timezone as dt_timezone
from instructor_payouts.models import InstructorPayout
from decimal import Decimal
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from payments.models import Payment

def exclude_open_refund_earnings(qs):
    from payment_details.models import Payment_Details
    open_refund_statuses = [
        Payment_Details.RefundStatus.PROCESSING,
        Payment_Details.RefundStatus.APPROVED,
        Payment_Details.RefundStatus.SUCCESS,
    ]
    return qs.exclude(
        Q(payment__payment_details__course=F('course')) &
        Q(payment__payment_details__is_deleted=False) &
        (
            Q(payment__payment_details__refund_status__in=open_refund_statuses) |
            Q(
                payment__payment_details__refund_status=Payment_Details.RefundStatus.PENDING,
                payment__payment_details__refund_request_time__isnull=False,
            )
        )
    )


def exclude_active_hold_earnings(qs):
    return qs.exclude(copyright_holds__status='active')


def resolve_instructor_rate_snapshot(instructor, source="retail"):
    if source == "subscription":
        raw_rate = instructor.level.plan_commission_rate if instructor.level else Decimal("30.00")
    else:
        raw_rate = instructor.level.commission_rate if instructor.level else Decimal("30.00")

    platform_rate = Decimal(str(raw_rate)).quantize(Decimal("0.01"))
    share_rate = (Decimal("100.00") - platform_rate).quantize(Decimal("0.01"))
    return {
        "platform_commission_rate": platform_rate,
        "instructor_share_rate": share_rate,
        "instructor_level_id_snapshot": instructor.level_id if instructor.level else None,
        "instructor_level_name_snapshot": instructor.level.name if instructor.level else None,
    }


def generate_instructor_earnings_from_payment(payment_id):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related(
                'payment_details__course__instructor__level'
            ).get(id=payment_id)
            results = []

            for detail in payment.payment_details.all():
                instructor = detail.course.instructor

                if not instructor:
                    continue

                snapshot = resolve_instructor_rate_snapshot(instructor, "retail")
                amount = detail.final_price
                net_amount = (amount * snapshot["instructor_share_rate"] / Decimal("100.00")).quantize(Decimal("0.01"))

                try:
                    earning, created = InstructorEarning.objects.get_or_create(
                        payment=payment,
                        course=detail.course,
                        instructor=instructor,
                        defaults={
                            'amount': amount,
                            'net_amount': net_amount,
                            'platform_commission_rate': snapshot["platform_commission_rate"],
                            'instructor_share_rate': snapshot["instructor_share_rate"],
                            'instructor_level_id_snapshot': snapshot["instructor_level_id_snapshot"],
                            'instructor_level_name_snapshot': snapshot["instructor_level_name_snapshot"],
                            'status': InstructorEarning.StatusChoices.PENDING,
                            'earning_date': timezone.now(),
                        }
                    )

                    results.append(InstructorEarningSerializer(earning).data)
                except Exception as ie:
                    try:
                        from django.db import IntegrityError
                        if isinstance(ie, IntegrityError):
                            existing = InstructorEarning.objects.filter(payment=payment, course=detail.course, instructor=instructor).first()
                            if existing:
                                results.append(InstructorEarningSerializer(existing).data)
                                continue
                    except Exception:
                        pass

                    raise

            return results

    except Payment.DoesNotExist:
        raise ValidationError("Không tìm thấy Payment.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi tạo earnings cho giảng viên: {str(e)}")
def get_instructor_earnings_by_instructor_id(instructor_id, status=None, source=None):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
        earnings = (
            InstructorEarning.objects
            .filter(instructor=instructor, is_deleted=False)
            .select_related('course', 'payment__user', 'user_subscription__user', 'user_subscription__payment', 'user_subscription__plan', 'instructor__user')
            .prefetch_related('copyright_holds', 'payment__payment_details')
            .order_by('-earning_date', '-id')
        )

        if status:
            earnings = earnings.filter(status=status)

        if source == 'retail':
            earnings = earnings.filter(payment__isnull=False, user_subscription__isnull=True)
        elif source == 'subscription':
            earnings = earnings.filter(payment__isnull=True, user_subscription__isnull=False)

        return earnings

    except Instructor.DoesNotExist:
        raise ValidationError("Không tìm thấy giảng viên.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi lấy earnings của giảng viên: {str(e)}")
def get_instructor_earnings(status=None, earning_id=None, source=None):
    try:
        if earning_id:
            earning = InstructorEarning.objects.get(id=earning_id, is_deleted=False)
            return InstructorEarningSerializer(earning).data
        else:
            earnings = (
                InstructorEarning.objects
                .filter(is_deleted=False)
                .select_related('course', 'payment__user', 'user_subscription__user', 'user_subscription__payment', 'user_subscription__plan', 'instructor__user')
                .prefetch_related('copyright_holds', 'payment__payment_details')
                .order_by('-earning_date', '-id')
            )
            if status:
                earnings = earnings.filter(status=status)
            if source == 'retail':
                earnings = earnings.filter(payment__isnull=False, user_subscription__isnull=True)
            elif source == 'subscription':
                earnings = earnings.filter(payment__isnull=True, user_subscription__isnull=False)
            return earnings

    except Exception as e:
        raise ValidationError(f"Lỗi khi lấy tất cả earnings của giảng viên: {str(e)}")
def update_instructor_earning_status(earning_id, new_status):
    try:
        if new_status not in [choice[0] for choice in InstructorEarning.StatusChoices.choices]:
            raise ValidationError("Trạng thái không hợp lệ.")
        earning = InstructorEarning.objects.get(id=earning_id)
        if earning.status == 'paid':
            raise ValidationError("Thu nhập đã được thanh toán, không thể cập nhật.")
        earning.status = new_status
        earning.save()

        return InstructorEarningSerializer(earning).data

    except InstructorEarning.DoesNotExist:
        raise ValidationError("Không tìm thấy earnings.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật trạng thái earnings: {str(e)}")
def update_instructor_earning_with_payout(payout_id):
    try:
        with transaction.atomic():
            payout = InstructorPayout.objects.prefetch_related(
                'earnings__instructor__user'
            ).get(id=payout_id)

            earnings = payout.earnings.all()

            if payout.status == InstructorPayout.PayoutStatusChoices.PROCESSED:
                new_status = InstructorEarning.StatusChoices.PAID
                assign_payout = payout
            elif payout.status in [
                InstructorPayout.PayoutStatusChoices.CANCELLED,
                InstructorPayout.PayoutStatusChoices.FAILED
            ]:
                new_status = InstructorEarning.StatusChoices.CANCELLED
                assign_payout = None
            else:
                return InstructorEarning.objects.none()

            for earning in earnings:
                if earning.status == InstructorEarning.StatusChoices.AVAILABLE:
                    earning.status = new_status
                    earning.instructor_payout = assign_payout
                    earning.save()
            return InstructorEarning.objects.filter(id__in=earnings.values_list('id', flat=True))
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Không tìm thấy Payout.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật earnings với payout: {str(e)}")
def update_earnings_available():
    try:
        from django.db.models import Q
        with transaction.atomic():
            from django.conf import settings
            refund_days = settings.REFUND_DAYS
            refund_time = timezone.now() - timedelta(days=refund_days)

            from payment_details.models import Payment_Details
            open_refund_statuses = [
                Payment_Details.RefundStatus.PROCESSING,
                Payment_Details.RefundStatus.APPROVED,
                Payment_Details.RefundStatus.SUCCESS,
            ]
            retail_earnings = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.PENDING,
                payment__isnull=False,
                payment__payment_date__lt=refund_time,
                user_subscription__isnull=True,
            ).exclude(
                Q(payment__payment_details__course=F('course')) &
                Q(payment__payment_details__is_deleted=False) &
                (
                    Q(payment__payment_details__refund_status__in=open_refund_statuses) |
                    Q(
                        payment__payment_details__refund_status=Payment_Details.RefundStatus.PENDING,
                        payment__payment_details__refund_request_time__isnull=False,
                    )
                )
            ).select_for_update()

            sub_settle_time = timezone.now() - timedelta(days=1)
            subscription_earnings = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.PENDING,
                payment__isnull=True,
                user_subscription__isnull=False,
                user_subscription__payment__payment_status=Payment.PaymentStatus.COMPLETED,
                earning_date__lt=sub_settle_time,
            ).select_for_update()

            all_pending = list(retail_earnings) + list(subscription_earnings)
            for earning in all_pending:
                earning.status = InstructorEarning.StatusChoices.AVAILABLE
                earning.save(update_fields=['status', 'updated_at'])

            updated_ids = [e.id for e in all_pending]
            return InstructorEarning.objects.filter(id__in=updated_ids)

    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật earnings thành AVAILABLE: {str(e)}")






def _month_bounds(year: int, month: int):
    """Tra (month_start, next_month_start) o UTC, can tren EXCLUSIVE.

    Dung can tren exclusive de tranh bug bo sot event luc 23:59:59.x cuoi thang.
    """
    month_start = timezone.datetime(year, month, 1, tzinfo=dt_timezone.utc)
    if month == 12:
        next_month_start = timezone.datetime(year + 1, 1, 1, tzinfo=dt_timezone.utc)
    else:
        next_month_start = timezone.datetime(year, month + 1, 1, tzinfo=dt_timezone.utc)
    return month_start, next_month_start


def _subscription_month_pool(sub, month_start, next_month_start):
    """Phan doanh thu cua subscription duoc ghi nhan cho thang [month_start, next_month_start).

    Pro-rate theo thoi luong ky active roi vao thang. Dung ky thuat lam tron luy ke
    (cumulative rounding) de tong cac thang = dung effective_price, khong lech xu.

    Lifetime (end_date=None): ghi nhan tron gia 1 lan, o thang dau tien co usage.
    """
    price = sub.plan.effective_price
    period_start = sub.start_date

    if sub.end_date is None:
        already_recognized = InstructorEarning.objects.filter(
            user_subscription=sub,
            is_deleted=False,
            earning_period_start__lt=month_start.date(),
        ).exists()
        return Decimal('0.00') if already_recognized else price.quantize(Decimal('0.01'))

    period_end = sub.end_date
    total_seconds = int((period_end - period_start).total_seconds())
    if total_seconds <= 0:
        return Decimal('0.00')

    def cumulative(boundary):
        """Doanh thu luy ke da ghi nhan tu period_start den min(period_end, boundary)."""
        end = min(period_end, boundary)
        secs = int((end - period_start).total_seconds())
        if secs <= 0:
            return Decimal('0.00')
        if secs >= total_seconds:
            return price.quantize(Decimal('0.01'))
        return (price * Decimal(secs) / Decimal(total_seconds)).quantize(Decimal('0.01'))

    return cumulative(next_month_start) - cumulative(month_start)


def calculate_subscription_earnings_for_month(year: int, month: int):
    from collections import defaultdict
    from subscription_plans.models import UserSubscription, SubscriptionUsageEvent

    month_start, next_month_start = _month_bounds(year, month)

    # Chi tinh cho thang da ket thuc: usage da chot, so tien on dinh, recompute idempotent.
    if next_month_start > timezone.now():
        return {
            'year': year,
            'month': month,
            'subscriptions_processed': 0,
            'earnings_created': 0,
            'earnings_updated': 0,
            'skipped_reason': 'month_not_ended',
            'detail': [],
        }

    # Subscription active trong thang = ky [start_date, end_date] giao voi thang,
    # va da thanh toan thanh cong (loai refund/chua hoan tat).
    subscriptions = UserSubscription.objects.filter(
        is_deleted=False,
        payment__isnull=False,
        payment__payment_status=Payment.PaymentStatus.COMPLETED,
        start_date__lt=next_month_start,
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=month_start)
    ).select_related('plan', 'payment')

    period_end_date = (next_month_start - timedelta(days=1)).date()
    created_earnings = []
    updated_earnings = []
    processed = 0

    with transaction.atomic():
        for sub in subscriptions:
            processed += 1
            month_pool = _subscription_month_pool(sub, month_start, next_month_start)
            if month_pool <= 0:
                continue

            events = list(SubscriptionUsageEvent.objects.filter(
                user_subscription=sub,
                occurred_at__gte=month_start,
                occurred_at__lt=next_month_start,
                delta_seconds__gt=0,
                instructor_id__isnull=False,
                course_id__isnull=False,
            ))

            if not events:
                continue

            total_seconds = sum(e.delta_seconds for e in events)
            if total_seconds <= 0:
                continue

            groups = defaultdict(list)
            for event in events:
                groups[(event.course_id, event.instructor_id)].append(event)

            for (course_id, instructor_id), group_events in groups.items():
                group_seconds = sum(e.delta_seconds for e in group_events)

                gross_allocated = (month_pool * Decimal(group_seconds) / Decimal(total_seconds)).quantize(Decimal('0.01'))

                net_amount = sum(
                    month_pool * Decimal(e.delta_seconds) / Decimal(total_seconds)
                    * e.instructor_share_rate_snapshot / Decimal('100')
                    for e in group_events
                ).quantize(Decimal('0.01'))

                weighted_platform_rate = (
                    sum(e.platform_commission_rate_snapshot * e.delta_seconds for e in group_events)
                    / Decimal(group_seconds)
                ).quantize(Decimal('0.01'))

                weighted_share_rate = (
                    sum(e.instructor_share_rate_snapshot * e.delta_seconds for e in group_events)
                    / Decimal(group_seconds)
                ).quantize(Decimal('0.01'))

                usage_share_rate = (Decimal(group_seconds) / Decimal(total_seconds) * Decimal('100')).quantize(Decimal('0.0001'))

                level_id_snapshot = group_events[0].instructor_level_id_snapshot
                level_name_snapshot = group_events[0].instructor_level_name_snapshot

                earning, created = InstructorEarning.objects.get_or_create(
                    user_subscription=sub,
                    course_id=course_id,
                    instructor_id=instructor_id,
                    earning_period_start=month_start.date(),
                    defaults={
                        'payment': None,
                        'amount': gross_allocated,
                        'net_amount': net_amount,
                        'platform_commission_rate': weighted_platform_rate,
                        'instructor_share_rate': weighted_share_rate,
                        'instructor_level_id_snapshot': level_id_snapshot,
                        'instructor_level_name_snapshot': level_name_snapshot,
                        'usage_share_rate': usage_share_rate,
                        'usage_seconds': group_seconds,
                        'earning_period_end': period_end_date,
                        'status': InstructorEarning.StatusChoices.PENDING,
                    }
                )

                # Chi cap nhat khi con PENDING: khong dong vao earning da AVAILABLE/PAID/CANCELLED.
                if not created and earning.status == InstructorEarning.StatusChoices.PENDING:
                    earning.amount = gross_allocated
                    earning.net_amount = net_amount
                    earning.platform_commission_rate = weighted_platform_rate
                    earning.instructor_share_rate = weighted_share_rate
                    earning.instructor_level_id_snapshot = level_id_snapshot
                    earning.instructor_level_name_snapshot = level_name_snapshot
                    earning.usage_share_rate = usage_share_rate
                    earning.usage_seconds = group_seconds
                    earning.earning_period_end = period_end_date
                    earning.save()
                    updated_earnings.append(earning.id)

                if created:
                    created_earnings.append({
                        'earning_id': earning.id,
                        'course_id': course_id,
                        'instructor_id': instructor_id,
                        'subscription_id': sub.id,
                        'month_pool': str(month_pool),
                        'gross_allocated': str(gross_allocated),
                        'net_amount': str(net_amount),
                        'usage_seconds': group_seconds,
                        'total_seconds': total_seconds,
                        'usage_share_rate': str(usage_share_rate),
                    })

    return {
        'year': year,
        'month': month,
        'subscriptions_processed': processed,
        'earnings_created': len(created_earnings),
        'earnings_updated': len(updated_earnings),
        'detail': created_earnings,
    }






def get_instructor_earnings_summary(instructor_id):
    from django.db.models import Sum, Count, Q
    from decimal import Decimal

    try:
        instructor = Instructor.objects.get(id=instructor_id)
    except Instructor.DoesNotExist:
        raise ValidationError("Không tìm thấy giảng viên.")

    base_qs = InstructorEarning.objects.filter(instructor=instructor, is_deleted=False)

    def _agg(qs):
        result = qs.aggregate(
            total_net=Sum('net_amount'),
            total_amount=Sum('amount'),
            count=Count('id'),
            total_usage_seconds=Sum('usage_seconds'),
        )
        active_hold_qs = qs.filter(copyright_holds__status='active').distinct()
        held_active = active_hold_qs.aggregate(net=Sum('net_amount'))['net'] or Decimal('0.00')
        available_payable = exclude_active_hold_earnings(
            qs.filter(status=InstructorEarning.StatusChoices.AVAILABLE)
        ).aggregate(net=Sum('net_amount'))['net'] or Decimal('0.00')
        return {
            'count': result['count'] or 0,
            'total_amount': str(result['total_amount'] or Decimal('0.00')),
            'total_net_amount': str(result['total_net'] or Decimal('0.00')),
            'total_usage_seconds': result['total_usage_seconds'] or 0,
            'held_active_net_amount': str(held_active),
            'available_payable_net_amount': str(available_payable),
        }

    def _status_breakdown(qs):
        breakdown = {}
        for s in InstructorEarning.StatusChoices.values:
            agg = qs.filter(status=s).aggregate(
                net=Sum('net_amount'), count=Count('id')
            )
            breakdown[s] = {
                'count': agg['count'] or 0,
                'net_amount': str(agg['net'] or Decimal('0.00')),
            }
        return breakdown

    retail_qs = base_qs.filter(payment__isnull=False, user_subscription__isnull=True)
    sub_qs = base_qs.filter(payment__isnull=True, user_subscription__isnull=False)

    retail_agg = _agg(retail_qs)
    retail_agg['by_status'] = _status_breakdown(retail_qs)

    sub_agg = _agg(sub_qs)
    sub_agg['by_status'] = _status_breakdown(sub_qs)

    all_agg = _agg(base_qs)

    return {
        'instructor_id': instructor_id,
        'instructor_name': instructor.user.full_name,
        'total': all_agg,
        'retail': retail_agg,
        'subscription': sub_agg,
    }


def get_subscription_revenue_breakdown_by_course(instructor_id, search=None, sort_by='earnings_desc'):
    from django.db.models import Sum, Count, F

    try:
        instructor = Instructor.objects.get(id=instructor_id)
    except Instructor.DoesNotExist:
        raise ValidationError('Khong tim thay giang vien.')

    base_qs = (
        InstructorEarning.objects
        .filter(
            instructor=instructor,
            is_deleted=False,
            payment__isnull=True,
            user_subscription__isnull=False,
        )
    )

    if search:
        base_qs = base_qs.filter(course__title__icontains=search)

    total_usage_seconds = base_qs.aggregate(total=Sum('usage_seconds'))['total'] or 0

    breakdown_qs = (
        base_qs
        .values('course_id')
        .annotate(
            course_title=F('course__title'),
            earnings=Sum('net_amount'),
            total_usage_seconds=Sum('usage_seconds'),
            records_count=Count('id'),
        )
    )

    ordering_map = {
        'earnings_desc': '-earnings',
        'earnings_asc': 'earnings',
        'course_asc': 'course_title',
        'course_desc': '-course_title',
        'share_desc': '-total_usage_seconds',
        'share_asc': 'total_usage_seconds',
    }
    breakdown_qs = breakdown_qs.order_by(ordering_map.get(sort_by, '-earnings'), 'course_id')
    return breakdown_qs, total_usage_seconds


def get_instructor_earnings_by_month(instructor_id, months=12):
    try:
        Instructor.objects.get(id=instructor_id)
    except Instructor.DoesNotExist:
        raise ValidationError("Khong tim thay giang vien.")

    now = timezone.now()
    result = []
    for i in range(months - 1, -1, -1):
        month_index = now.month - 1 - i
        year = now.year + (month_index // 12)
        month = (month_index % 12) + 1
        first_day = datetime(year, month, 1, tzinfo=dt_timezone.utc)
        if month == 12:
            month_end = datetime(year + 1, 1, 1, tzinfo=dt_timezone.utc)
        else:
            month_end = datetime(year, month + 1, 1, tzinfo=dt_timezone.utc)

        # Retail: gom theo earning_date (thoi diem phat sinh).
        retail_agg = InstructorEarning.objects.filter(
            instructor_id=instructor_id,
            is_deleted=False,
            payment__isnull=False,
            earning_date__gte=first_day,
            earning_date__lt=month_end,
        ).aggregate(
            retail_amount=Sum('amount'),
            retail_net=Sum('net_amount'),
        )

        # Subscription: gom theo earning_period_start (thang doanh thu thuc su thuoc ve),
        # vi earning_date la thoi diem cron chay (thang sau) nen se lech thang neu dung no.
        sub_agg = InstructorEarning.objects.filter(
            instructor_id=instructor_id,
            is_deleted=False,
            user_subscription__isnull=False,
            earning_period_start__gte=first_day.date(),
            earning_period_start__lt=month_end.date(),
        ).aggregate(
            sub_amount=Sum('amount'),
            sub_net=Sum('net_amount'),
            sub_usage_seconds=Sum('usage_seconds'),
        )

        retail_net = retail_agg['retail_net'] or Decimal('0')
        sub_net = sub_agg['sub_net'] or Decimal('0')
        result.append({
            'date': first_day.strftime('%Y-%m'),
            'retail_gross': float(retail_agg['retail_amount'] or 0),
            'retail_net': float(retail_net),
            'sub_gross': float(sub_agg['sub_amount'] or 0),
            'sub_net': float(sub_net),
            'sub_usage_seconds': sub_agg['sub_usage_seconds'] or 0,
            'total_net': float(retail_net + sub_net),
        })

    return result
