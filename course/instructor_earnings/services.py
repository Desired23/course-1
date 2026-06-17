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






def calculate_subscription_earnings_for_month(year: int, month: int):
    import calendar
    from collections import defaultdict
    from subscription_plans.models import UserSubscription, SubscriptionUsageEvent

    first_day = timezone.datetime(year, month, 1, tzinfo=dt_timezone.utc)
    last_day = timezone.datetime(
        year, month, calendar.monthrange(year, month)[1],
        23, 59, 59, tzinfo=dt_timezone.utc
    )

    subscriptions = UserSubscription.objects.filter(
        start_date__gte=first_day,
        start_date__lte=last_day,
        payment__isnull=False,
        is_deleted=False,
    ).select_related('plan', 'payment')

    created_earnings = []
    updated_earnings = []

    with transaction.atomic():
        for sub in subscriptions:
            plan_revenue = sub.plan.effective_price

            events = list(SubscriptionUsageEvent.objects.filter(
                user_subscription=sub,
                occurred_at__gte=first_day,
                occurred_at__lte=last_day,
                delta_seconds__gt=0,
            ))

            if not events:
                continue

            total_seconds = sum(e.delta_seconds for e in events)
            if total_seconds == 0:
                continue

            groups = defaultdict(list)
            for event in events:
                if event.instructor_id and event.course_id:
                    groups[(event.course_id, event.instructor_id)].append(event)

            for (course_id, instructor_id), group_events in groups.items():
                group_seconds = sum(e.delta_seconds for e in group_events)

                gross_allocated = (plan_revenue * Decimal(group_seconds) / Decimal(total_seconds)).quantize(Decimal('0.01'))

                net_amount = sum(
                    plan_revenue * Decimal(e.delta_seconds) / Decimal(total_seconds)
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
                    earning_period_start=first_day.date(),
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
                        'earning_period_end': last_day.date(),
                        'status': InstructorEarning.StatusChoices.PENDING,
                    }
                )

                if not created and earning.status in [
                    InstructorEarning.StatusChoices.PENDING,
                    InstructorEarning.StatusChoices.AVAILABLE,
                ]:
                    earning.amount = gross_allocated
                    earning.net_amount = net_amount
                    earning.platform_commission_rate = weighted_platform_rate
                    earning.instructor_share_rate = weighted_share_rate
                    earning.instructor_level_id_snapshot = level_id_snapshot
                    earning.instructor_level_name_snapshot = level_name_snapshot
                    earning.usage_share_rate = usage_share_rate
                    earning.usage_seconds = group_seconds
                    earning.earning_period_end = last_day.date()
                    earning.save()
                    updated_earnings.append(earning.id)

                if created:
                    created_earnings.append({
                        'earning_id': earning.id,
                        'course_id': course_id,
                        'instructor_id': instructor_id,
                        'subscription_id': sub.id,
                        'gross_allocated': str(gross_allocated),
                        'net_amount': str(net_amount),
                        'usage_seconds': group_seconds,
                        'total_seconds': total_seconds,
                        'usage_share_rate': str(usage_share_rate),
                    })

    return {
        'year': year,
        'month': month,
        'subscriptions_processed': subscriptions.count(),
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

        qs = InstructorEarning.objects.filter(
            instructor_id=instructor_id,
            is_deleted=False,
            earning_date__gte=first_day,
            earning_date__lt=month_end,
        )
        agg = qs.aggregate(
            retail_amount=Sum('amount', filter=Q(payment__isnull=False)),
            retail_net=Sum('net_amount', filter=Q(payment__isnull=False)),
            sub_amount=Sum('amount', filter=Q(user_subscription__isnull=False)),
            sub_net=Sum('net_amount', filter=Q(user_subscription__isnull=False)),
            sub_usage_seconds=Sum('usage_seconds', filter=Q(user_subscription__isnull=False)),
        )
        retail_net = agg['retail_net'] or Decimal('0')
        sub_net = agg['sub_net'] or Decimal('0')
        result.append({
            'date': first_day.strftime('%Y-%m'),
            'retail_gross': float(agg['retail_amount'] or 0),
            'retail_net': float(retail_net),
            'sub_gross': float(agg['sub_amount'] or 0),
            'sub_net': float(sub_net),
            'sub_usage_seconds': agg['sub_usage_seconds'] or 0,
            'total_net': float(retail_net + sub_net),
        })

    return result
