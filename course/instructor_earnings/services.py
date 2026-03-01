from rest_framework.exceptions import ValidationError
from .serializers import InstructorEarningSerializer
from .models import InstructorEarning
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from instructor_payouts.models import InstructorPayout
from decimal import Decimal
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from payments.models import Payment

def generate_instructor_earnings_from_payment(payment_id):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related(
                'payment_details__course__instructor'
            ).get(id=payment_id)
            results = []

            for detail in payment.payment_details.all():
                instructor = detail.course.instructor
                # print("detail:", detail.__dict__)
                if not instructor:
                    continue  # Bỏ qua nếu chưa gán instructor cho khóa học

                # Tính commission_rate
                if not instructor or not instructor.level:
                    commission_rate = Decimal("30.00")
                else:
                    commission_rate = instructor.level.commission_rate

                amount = detail.final_price
                net_amount = amount * (Decimal(100) - commission_rate) / Decimal(100)

                earning = InstructorEarning.objects.create(
                    instructor=instructor,
                    course=detail.course,
                    payment=payment,
                    amount=amount,
                    net_amount=net_amount,
                    status=InstructorEarning.StatusChoices.PENDING,
                    earning_date=timezone.now()
                )

                results.append(InstructorEarningSerializer(earning).data)

            return results

    except Payment.DoesNotExist:
        raise ValidationError("Không tìm thấy Payment.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi tạo earnings cho giảng viên: {str(e)}")
def get_instructor_earnings_by_instructor_id(instructor_id, status=None, source=None):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
        earnings = InstructorEarning.objects.filter(instructor=instructor)

        if status:
            earnings = earnings.filter(status=status)

        # source filter: 'retail' | 'subscription'
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
            earning = InstructorEarning.objects.get(id=earning_id)
            return InstructorEarningSerializer(earning).data
        else:
            earnings = InstructorEarning.objects.all()
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
# gán trạng thái cho earnings từ payout khi đã thanh toán hoặc hủy ,
# chỉ chuyển từ AVAILABLE sang PAID hoặc CANCELLED
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
                return InstructorEarning.objects.none()  # Trạng thái không hợp lệ thì không làm gì cả

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
def update_earnings_available(): #cronjob
    """
    Chuyển InstructorEarning từ PENDING → AVAILABLE sau khi hết thời gian refund.
    Xử lý cả 2 nguồn:
    - Bán lẻ: earnings có payment, chờ hết refund window
    - Subscription: earnings có user_subscription, luôn chuyển AVAILABLE ngay
      (vì subscription revenue không có chính sách refund 1 khóa riêng lẻ)
    """
    try:
        from django.db.models import Q
        with transaction.atomic():
            from django.conf import settings
            refund_days = settings.REFUND_DAYS
            refund_time = timezone.now() - timedelta(days=refund_days)

            # Nguồn bán lẻ: payment không null và đã qua refund window
            retail_earnings = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.PENDING,
                payment__isnull=False,
                payment__payment_date__lt=refund_time,
                user_subscription__isnull=True,
            )
            # Nguồn subscription: không có payment, chỉ cần đủ 1 ngày để settle
            sub_settle_time = timezone.now() - timedelta(days=1)
            subscription_earnings = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.PENDING,
                payment__isnull=True,
                user_subscription__isnull=False,
                earning_date__lt=sub_settle_time,
            )

            all_pending = list(retail_earnings) + list(subscription_earnings)
            for earning in all_pending:
                earning.status = InstructorEarning.StatusChoices.AVAILABLE
                earning.save(update_fields=['status', 'updated_at'])

            updated_ids = [e.id for e in all_pending]
            return InstructorEarning.objects.filter(id__in=updated_ids)

    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật earnings thành AVAILABLE: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Subscription Revenue Sharing
# ─────────────────────────────────────────────────────────────────────────────

def calculate_subscription_earnings_for_month(year: int, month: int):
    """
    Tính và tạo InstructorEarning cho tất cả subscription thanh toán trong tháng
    dựa trên SubscriptionUsage (consumed_minutes).

    Công thức:
        earning = plan_revenue × (1 - plan_commission_rate/100) × (instructor_minutes / total_plan_minutes)

    - plan_revenue     : effective_price của plan tại thời điểm subscription
    - plan_commission_rate : lấy từ InstructorLevel.plan_commission_rate của instructor (fallback 30%)
    - instructor_minutes   : sum(consumed_minutes) cho các course của instructor trong sub đó
    - total_plan_minutes   : tổng consumed_minutes của toàn bộ sub đó

    Chỉ tạo earning nếu chưa tồn tại (idempotent theo unique_together user_subscription+course+instructor).
    Trả về danh sách earning được tạo.
    """
    import calendar
    from django.db.models import Sum
    from subscription_plans.models import UserSubscription, SubscriptionUsage
    from instructors.models import Instructor

    # Lấy subscriptions có start_date trong tháng (đã thanh toán = có payment)
    first_day = timezone.datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = timezone.datetime(
        year, month, calendar.monthrange(year, month)[1],
        23, 59, 59, tzinfo=timezone.utc
    )

    subscriptions = UserSubscription.objects.filter(
        start_date__gte=first_day,
        start_date__lte=last_day,
        payment__isnull=False,
        is_deleted=False,
    ).select_related('plan', 'payment')

    created_earnings = []

    with transaction.atomic():
        for sub in subscriptions:
            plan_revenue = sub.plan.effective_price

            # Tổng consumed_minutes của toàn subscription
            total_minutes_row = SubscriptionUsage.objects.filter(
                user_subscription=sub
            ).aggregate(total=Sum('consumed_minutes'))
            total_minutes = total_minutes_row['total'] or 0

            if total_minutes == 0:
                continue  # Không ai học → bỏ qua

            # Aggregate theo instructor (thông qua course)
            instructor_usage = (
                SubscriptionUsage.objects
                .filter(user_subscription=sub)
                .values('course__instructor__id', 'course__id')
                .annotate(instructor_minutes=Sum('consumed_minutes'))
                .filter(course__instructor__isnull=False, instructor_minutes__gt=0)
            )

            for row in instructor_usage:
                instructor_id = row['course__instructor__id']
                course_id = row['course__id']
                instructor_minutes = row['instructor_minutes']

                try:
                    instructor = Instructor.objects.select_related('level').get(id=instructor_id)
                except Instructor.DoesNotExist:
                    continue

                # Commission rate từ level của instructor
                if instructor.level and instructor.level.plan_commission_rate is not None:
                    commission_rate = instructor.level.plan_commission_rate
                else:
                    commission_rate = Decimal('30.00')

                # Tính earning
                share_ratio = Decimal(str(instructor_minutes)) / Decimal(str(total_minutes))
                instructor_pool = plan_revenue * (Decimal('100') - commission_rate) / Decimal('100')
                net_amount = (instructor_pool * share_ratio).quantize(Decimal('0.01'))

                # Tạo earning (idempotent)
                earning, created = InstructorEarning.objects.get_or_create(
                    user_subscription=sub,
                    course_id=course_id,
                    instructor=instructor,
                    defaults={
                        'payment': None,
                        'amount': plan_revenue,
                        'net_amount': net_amount,
                        'status': InstructorEarning.StatusChoices.PENDING,
                    }
                )

                if created:
                    created_earnings.append({
                        'earning_id': earning.id,
                        'instructor': instructor.user.full_name,
                        'course_id': course_id,
                        'subscription_id': sub.id,
                        'net_amount': str(net_amount),
                        'instructor_minutes': instructor_minutes,
                        'total_minutes': total_minutes,
                        'commission_rate': str(commission_rate),
                    })

    return {
        'year': year,
        'month': month,
        'subscriptions_processed': subscriptions.count(),
        'earnings_created': len(created_earnings),
        'detail': created_earnings,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Instructor Earnings Summary (cả 2 nguồn: retail + subscription)
# ─────────────────────────────────────────────────────────────────────────────

def get_instructor_earnings_summary(instructor_id):
    """
    Tổng hợp thu nhập của instructor theo 2 nguồn:
    - retail: từ bán lẻ khóa học (có payment)
    - subscription: từ revenue sharing (có user_subscription)
    Bao gồm breakdown theo status (pending/available/paid/cancelled).
    """
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
        )
        return {
            'count': result['count'] or 0,
            'total_amount': str(result['total_amount'] or Decimal('0.00')),
            'total_net_amount': str(result['total_net'] or Decimal('0.00')),
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
