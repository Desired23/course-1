from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, timezone as dt_timezone
from utils.revenue_reporting import (
    detail_has_open_refund,
    detail_is_final_for_report,
    detail_is_refund_eligible,
    earning_is_final_for_report,
    subscription_payment_is_final_for_report,
    success_refund_amount,
)


VALID_GROUP_BY = {'day', 'week', 'month', 'quarter', 'year'}


def _as_decimal(value):
    return Decimal(value or 0)


def _as_float(value):
    return float(_as_decimal(value))


def _apply_date_range(qs, field_name, date_from=None, date_to=None):
    if date_from:
        qs = qs.filter(**{f'{field_name}__gte': date_from})
    if date_to:
        qs = qs.filter(**{f'{field_name}__lte': date_to})
    return qs


def _period_label(value, group_by):
    if not value:
        return 'unknown'
    local = timezone.localtime(value) if timezone.is_aware(value) else value
    if group_by == 'day':
        return local.strftime('%Y-%m-%d')
    if group_by == 'week':
        iso = local.isocalendar()
        return f'{iso.year}-W{iso.week:02d}'
    if group_by == 'quarter':
        return f'{local.year}-Q{((local.month - 1) // 3) + 1}'
    if group_by == 'year':
        return str(local.year)
    return local.strftime('%Y-%m')


def _empty_revenue_classification():
    return {
        'retail_revenue': Decimal('0'),
        'subscription_revenue': Decimal('0'),
        'total_gross': Decimal('0'),
        'refunded_amount': Decimal('0'),
        'estimated_revenue': Decimal('0'),
        'realized_revenue': Decimal('0'),
        'transaction_count': 0,
    }


def _refund_success_amount(detail):
    return success_refund_amount(detail)


def _detail_has_open_or_success_refund(detail):
    return detail_has_open_refund(detail)


def _detail_is_refund_eligible(detail, enrollment, now=None):
    return detail_is_refund_eligible(detail, enrollment, now)


def _classify_completed_revenue(payments_qs):
    from enrollments.models import Enrollment
    from payment_details.models import Payment_Details
    from payments.models import Payment

    payments = list(payments_qs)
    result = _empty_revenue_classification()
    if not payments:
        return result

    payment_ids = [payment.id for payment in payments]
    details = list(
        Payment_Details.objects
        .filter(payment_id__in=payment_ids, is_deleted=False)
        .select_related('payment')
    )
    enrollment_map = {
        (enrollment.payment_id, enrollment.course_id): enrollment
        for enrollment in Enrollment.objects.filter(
            payment_id__in=payment_ids,
            is_deleted=False,
        )
    }
    detail_payment_ids = {detail.payment_id for detail in details}
    now = timezone.now()

    for detail in details:
        gross = _as_decimal(detail.final_price)
        refunded = _refund_success_amount(detail)
        net = max(gross - refunded, Decimal('0'))
        enrollment = enrollment_map.get((detail.payment_id, detail.course_id))

        result['estimated_revenue'] += net
        if detail_is_final_for_report(detail, enrollment, gross, now):
            result['retail_revenue'] += gross
            result['total_gross'] += gross
            result['refunded_amount'] += refunded
            result['realized_revenue'] += net
            result['transaction_count'] += 1

    for payment in payments:
        if payment.payment_type != Payment.PaymentType.SUBSCRIPTION or payment.id in detail_payment_ids:
            continue
        gross = _as_decimal(payment.total_amount)
        refunded = _as_decimal(payment.refund_amount)
        net = max(gross - refunded, Decimal('0'))
        result['estimated_revenue'] += net
        if subscription_payment_is_final_for_report(payment, gross, now):
            result['subscription_revenue'] += gross
            result['total_gross'] += gross
            result['refunded_amount'] += refunded
            result['realized_revenue'] += net
            result['transaction_count'] += 1
    return result


def get_admin_dashboard_stats(date_from=None, date_to=None):
    from users.models import User
    from instructors.models import Instructor
    from courses.models import Course
    from enrollments.models import Enrollment
    from payments.models import Payment
    from reviews.models import Review
    from supports.models import Support

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)


    users_qs = User.objects.filter(is_deleted=False)
    if date_from:
        users_qs = users_qs.filter(created_at__gte=date_from)
    if date_to:
        users_qs = users_qs.filter(created_at__lte=date_to)
    total_users = users_qs.count()
    new_users_this_month = users_qs.filter(created_at__gte=month_start).count()
    total_instructors = users_qs.filter(
        instructor__isnull=False, instructor__is_deleted=False
    ).count()
    active_students = users_qs.filter(
        status='active'
    ).exclude(instructor__is_deleted=False).exclude(admin__is_deleted=False).count()


    courses_qs = Course.objects.filter(is_deleted=False)
    if date_from:
        courses_qs = courses_qs.filter(created_at__gte=date_from)
    if date_to:
        courses_qs = courses_qs.filter(created_at__lte=date_to)
    total_courses = courses_qs.count()
    published_courses = courses_qs.filter(status='published').count()
    pending_courses = courses_qs.filter(status='pending').count()


    payments_qs = Payment.objects.filter(payment_status=Payment.PaymentStatus.COMPLETED)
    if date_from:
        payments_qs = payments_qs.filter(payment_date__gte=date_from)
    if date_to:
        payments_qs = payments_qs.filter(payment_date__lte=date_to)
    month_payments_qs = payments_qs.filter(payment_date__gte=month_start)
    today_payments_qs = payments_qs.filter(payment_date__gte=today_start)
    revenue_classification = _classify_completed_revenue(payments_qs)
    month_revenue_classification = _classify_completed_revenue(month_payments_qs)
    today_revenue_classification = _classify_completed_revenue(today_payments_qs)
    total_revenue = revenue_classification['estimated_revenue']
    this_month_revenue = month_revenue_classification['estimated_revenue']


    enrollments_qs = Enrollment.objects.filter(is_deleted=False)
    if date_from:
        enrollments_qs = enrollments_qs.filter(enrollment_date__gte=date_from)
    if date_to:
        enrollments_qs = enrollments_qs.filter(enrollment_date__lte=date_to)
    total_enrollments = enrollments_qs.count()
    this_month_enrollments = enrollments_qs.filter(enrollment_date__gte=month_start).count()
    completed_enrollments = enrollments_qs.filter(status='complete').count()
    completion_rate = round(
        completed_enrollments / total_enrollments * 100, 1
    ) if total_enrollments else 0


    reviews_qs = Review.objects.filter(is_deleted=False)
    if date_from:
        reviews_qs = reviews_qs.filter(created_at__gte=date_from)
    if date_to:
        reviews_qs = reviews_qs.filter(created_at__lte=date_to)
    pending_reviews = reviews_qs.filter(status='pending').count()


    pending_support_tickets = Support.objects.filter(
        is_deleted=False, status__in=['open', 'pending']
    ).count()


    platform_rating = reviews_qs.filter(status='approved').aggregate(avg=Avg('rating'))['avg'] or 0

    return {
        'total_users': total_users,
        'new_users_this_month': new_users_this_month,
        'total_instructors': total_instructors,
        'total_courses': total_courses,
        'published_courses': published_courses,
        'pending_courses': pending_courses,
        'total_revenue': float(total_revenue),
        'total_estimated_revenue': float(revenue_classification['estimated_revenue']),
        'total_realized_revenue': float(revenue_classification['realized_revenue']),
        'this_month_revenue': float(this_month_revenue),
        'this_month_estimated_revenue': float(month_revenue_classification['estimated_revenue']),
        'this_month_realized_revenue': float(month_revenue_classification['realized_revenue']),
        'today_estimated_revenue': float(today_revenue_classification['estimated_revenue']),
        'today_realized_revenue': float(today_revenue_classification['realized_revenue']),
        'total_enrollments': total_enrollments,
        'this_month_enrollments': this_month_enrollments,
        'active_students': active_students,
        'completion_rate': completion_rate,
        'pending_reviews': pending_reviews,
        'pending_support_tickets': pending_support_tickets,
        'platform_rating': round(float(platform_rating), 2),
    }


def get_admin_revenue_analytics(months=6, date_from=None, date_to=None):
    from payments.models import Payment
    from payment_details.models import Payment_Details
    from datetime import timedelta

    now = timezone.now()
    result = []
    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        revenue_qs = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_date__gte=month_start,
            payment_date__lt=month_end,
        )
        if date_from:
            revenue_qs = revenue_qs.filter(payment_date__gte=date_from)
        if date_to:
            revenue_qs = revenue_qs.filter(payment_date__lte=date_to)
        gross = revenue_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        refunded = Payment_Details.objects.filter(
            payment__in=revenue_qs,
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            is_deleted=False,
        ).aggregate(t=Sum('refund_amount'))['t'] or Decimal('0')

        result.append({
            'date': month_start.strftime('%Y-%m'),
            'revenue': float(gross - refunded),
        })
    return result


def get_admin_user_analytics(months=6, date_from=None, date_to=None):
    from users.models import User
    from datetime import timedelta

    now = timezone.now()
    result = []
    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        new_users = User.objects.filter(
            is_deleted=False,
            created_at__gte=month_start,
            created_at__lt=month_end,
        )
        if date_from:
            new_users = new_users.filter(created_at__gte=date_from)
        if date_to:
            new_users = new_users.filter(created_at__lte=date_to)
        new_users = new_users.count()
        result.append({
            'date': month_start.strftime('%Y-%m'),
            'new_users': new_users,
        })
    return result


def get_admin_course_analytics(date_from=None, date_to=None):
    from courses.models import Course
    from enrollments.models import Enrollment
    from payment_details.models import Payment_Details
    from reviews.models import Review

    payment_details = Payment_Details.objects.filter(
        is_deleted=False,
        payment__is_deleted=False,
        payment__payment_status='completed',
    )
    if date_from:
        payment_details = payment_details.filter(payment__payment_date__gte=date_from)
    if date_to:
        payment_details = payment_details.filter(payment__payment_date__lte=date_to)

    top_revenue = list(
        payment_details.values('course_id')
        .annotate(
            gross=Coalesce(Sum('final_price'), Decimal('0')),
            refunded=Coalesce(
                Sum('refund_amount', filter=Q(refund_status=Payment_Details.RefundStatus.SUCCESS)),
                Decimal('0'),
            ),
            transactions=Count('id'),
        )
        .annotate(revenue=F('gross') - F('refunded'))
        .order_by('-revenue')[:10]
    )
    course_map = {
        c.id: c
        for c in Course.objects.filter(
            id__in=[row['course_id'] for row in top_revenue],
            is_deleted=False,
        ).select_related('instructor__user')
    }

    result = []
    for row in top_revenue:
        c = course_map.get(row['course_id'])
        if not c:
            continue
        enrollment_count = Enrollment.objects.filter(course=c, is_deleted=False).count()
        avg_rating = Review.objects.filter(
            course=c, is_deleted=False, status='approved'
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        result.append({
            'course_id': c.id,
            'title': c.title,
            'instructor_name': c.instructor.user.full_name if c.instructor and c.instructor.user else None,
            'enrollment_count': enrollment_count,
            'revenue': float(row['revenue'] or 0),
            'transactions': row['transactions'],
            'rating': round(float(avg_rating), 2),
        })
    return result


def _month_bounds(now, months_back):
    month_index = now.month - 1 - months_back
    year = now.year + (month_index // 12)
    month = (month_index % 12) + 1
    start = datetime(year, month, 1, tzinfo=dt_timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=dt_timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=dt_timezone.utc)
    return start, end


def get_admin_revenue_breakdown(date_from=None, date_to=None):
    from payments.models import Payment

    qs = Payment.objects.filter(
        payment_status=Payment.PaymentStatus.COMPLETED,
        is_deleted=False,
    )
    qs = _apply_date_range(qs, 'payment_date', date_from, date_to)

    retail_qs = qs.filter(payment_type=Payment.PaymentType.COURSE_PURCHASE)
    sub_qs = qs.filter(payment_type=Payment.PaymentType.SUBSCRIPTION)
    revenue = _classify_completed_revenue(qs)
    total_gross = revenue['total_gross']
    refunded = revenue['refunded_amount']
    refund_rate = round(float(refunded / total_gross * 100), 2) if total_gross else 0

    return {
        'retail_revenue': _as_float(revenue['retail_revenue']),
        'subscription_revenue': _as_float(revenue['subscription_revenue']),
        'total_gross': _as_float(total_gross),
        'total_refunded': _as_float(refunded),
        'net_revenue': _as_float(revenue['estimated_revenue']),
        'retail_count': retail_qs.count(),
        'subscription_count': sub_qs.count(),
        'estimated_revenue': _as_float(revenue['estimated_revenue']),
        'realized_revenue': _as_float(revenue['realized_revenue']),
        'refunded_amount': _as_float(refunded),
        'transaction_count': revenue['transaction_count'],
        'refund_rate': refund_rate,
    }


def get_admin_revenue_monthly_breakdown(months=12, date_from=None, date_to=None, group_by='month'):
    from payments.models import Payment

    if group_by not in VALID_GROUP_BY:
        group_by = 'month'
    if date_from or date_to or group_by in {'day', 'week'}:
        base_qs = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.COMPLETED,
            is_deleted=False,
        )
        base_qs = _apply_date_range(base_qs, 'payment_date', date_from, date_to)
        payment_groups = {}
        for payment in base_qs.only('id', 'payment_date').order_by('payment_date'):
            payment_groups.setdefault(_period_label(payment.payment_date, group_by), []).append(payment.id)

        rows = []
        for label in sorted(payment_groups):
            qs = Payment.objects.filter(id__in=payment_groups[label])
            revenue = _classify_completed_revenue(qs)
            gross = revenue['total_gross']
            refunded = revenue['refunded_amount']
            refund_rate = round(float(refunded / gross * 100), 2) if gross else 0
            rows.append({
                'date': label,
                'retail': _as_float(revenue['retail_revenue']),
                'subscription': _as_float(revenue['subscription_revenue']),
                'gross': _as_float(gross),
                'refunded': _as_float(refunded),
                'net': _as_float(revenue['estimated_revenue']),
                'transactions': revenue['transaction_count'],
                'estimated_revenue': _as_float(revenue['estimated_revenue']),
                'realized_revenue': _as_float(revenue['realized_revenue']),
                'refunded_amount': _as_float(refunded),
                'transaction_count': revenue['transaction_count'],
                'refund_rate': refund_rate,
            })
        return rows

    now = timezone.now()
    result = []
    for i in range(months - 1, -1, -1):
        month_start, month_end = _month_bounds(now, i)
        qs = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.COMPLETED,
            is_deleted=False,
            payment_date__gte=month_start,
            payment_date__lt=month_end,
        )
        qs = _apply_date_range(qs, 'payment_date', date_from, date_to)
        revenue = _classify_completed_revenue(qs)
        gross = revenue['total_gross']
        refunded = revenue['refunded_amount']
        refund_rate = round(float(refunded / gross * 100), 2) if gross else 0
        result.append({
            'date': month_start.strftime('%Y-%m'),
            'retail': _as_float(revenue['retail_revenue']),
            'subscription': _as_float(revenue['subscription_revenue']),
            'gross': _as_float(gross),
            'refunded': _as_float(refunded),
            'net': _as_float(revenue['estimated_revenue']),
            'transactions': revenue['transaction_count'],
            'estimated_revenue': _as_float(revenue['estimated_revenue']),
            'realized_revenue': _as_float(revenue['realized_revenue']),
            'refunded_amount': _as_float(refunded),
            'transaction_count': revenue['transaction_count'],
            'refund_rate': refund_rate,
        })
    if group_by in {'quarter', 'year'}:
        grouped = {}
        for row in result:
            year = row['date'][:4]
            month = int(row['date'][5:7])
            key = f"{year}-Q{((month - 1) // 3) + 1}" if group_by == 'quarter' else year
            target = grouped.setdefault(key, {
                'date': key,
                'retail': 0,
                'subscription': 0,
                'gross': 0,
                'refunded': 0,
                'net': 0,
                'transactions': 0,
                'estimated_revenue': 0,
                'realized_revenue': 0,
                'refunded_amount': 0,
                'transaction_count': 0,
                'refund_rate': 0,
            })
            for field in ['retail', 'subscription', 'gross', 'refunded', 'net', 'transactions', 'estimated_revenue', 'realized_revenue', 'refunded_amount', 'transaction_count']:
                target[field] += row.get(field, 0) or 0
            target['refund_rate'] = round((target['refunded_amount'] / target['gross'] * 100), 2) if target['gross'] else 0
        return [grouped[key] for key in sorted(grouped)]
    return result


def get_admin_commission_analytics(date_from=None, date_to=None):
    from instructor_earnings.models import InstructorEarning

    qs = InstructorEarning.objects.filter(is_deleted=False)
    if date_from:
        qs = qs.filter(earning_date__gte=date_from)
    if date_to:
        qs = qs.filter(earning_date__lte=date_to)

    agg = qs.aggregate(total_amount=Sum('amount'), total_net=Sum('net_amount'))
    total_amount = agg['total_amount'] or Decimal('0')
    total_net = agg['total_net'] or Decimal('0')
    platform_revenue = total_amount - total_net

    per_instructor = (
        qs.values('instructor__id', 'instructor__user__full_name')
        .annotate(
            earnings=Sum('net_amount'),
            gross=Sum('amount'),
            retail_earnings=Sum('net_amount', filter=Q(payment__isnull=False)),
            sub_earnings=Sum('net_amount', filter=Q(user_subscription__isnull=False)),
            pending=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PENDING)),
            available=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.AVAILABLE)),
            paid=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PAID)),
        )
        .order_by('-earnings')[:20]
    )

    return {
        'total_instructor_earnings': float(total_net),
        'total_platform_revenue': float(platform_revenue),
        'total_gross': float(total_amount),
        'platform_share_pct': round(float(platform_revenue / total_amount * 100), 2) if total_amount else 0,
        'instructor_share_pct': round(float(total_net / total_amount * 100), 2) if total_amount else 0,
        'per_instructor': [
            {
                'instructor_id': r['instructor__id'],
                'instructor_name': r['instructor__user__full_name'],
                'total_earnings': float(r['earnings'] or 0),
                'gross': float(r['gross'] or 0),
                'retail_earnings': float(r['retail_earnings'] or 0),
                'sub_earnings': float(r['sub_earnings'] or 0),
                'pending': float(r['pending'] or 0),
                'available': float(r['available'] or 0),
                'paid': float(r['paid'] or 0),
            }
            for r in per_instructor
        ],
    }


def get_admin_refund_analytics(date_from=None, date_to=None):
    from payment_details.models import Payment_Details

    qs = Payment_Details.objects.filter(is_deleted=False).exclude(refund_request_time__isnull=True)
    if date_from:
        qs = qs.filter(refund_request_time__gte=date_from)
    if date_to:
        qs = qs.filter(refund_request_time__lte=date_to)

    statuses = [choice[0] for choice in Payment_Details.RefundStatus.choices]
    breakdown = {}
    for s in statuses:
        agg = qs.filter(refund_status=s).aggregate(count=Count('id'), amount=Sum('refund_amount'))
        breakdown[s] = {
            'count': agg['count'] or 0,
            'amount': float(agg['amount'] or 0),
        }

    return {
        'total_requests': qs.count(),
        'total_refunded_amount': breakdown.get(Payment_Details.RefundStatus.SUCCESS, {}).get('amount', 0),
        'breakdown': breakdown,
    }


def get_admin_top_courses_by_revenue(limit=10, date_from=None, date_to=None):
    from payment_details.models import Payment_Details

    pd_qs = Payment_Details.objects.filter(
        is_deleted=False,
        payment__payment_status='completed',
        payment__is_deleted=False,
    )
    if date_from:
        pd_qs = pd_qs.filter(payment__payment_date__gte=date_from)
    if date_to:
        pd_qs = pd_qs.filter(payment__payment_date__lte=date_to)

    top = (
        pd_qs.values('course__id', 'course__title', 'course__instructor__user__full_name')
        .annotate(
            gross=Coalesce(Sum('final_price'), Decimal('0')),
            refunded=Coalesce(
                Sum('refund_amount', filter=Q(refund_status=Payment_Details.RefundStatus.SUCCESS)),
                Decimal('0'),
            ),
            transactions=Count('id'),
        )
        .annotate(revenue=F('gross') - F('refunded'))
        .order_by('-revenue')[:limit]
    )
    return [
        {
            'course_id': r['course__id'],
            'title': r['course__title'],
            'instructor_name': r['course__instructor__user__full_name'],
            'revenue': float(r['revenue'] or 0),
            'transactions': r['transactions'],
        }
        for r in top
    ]


def get_admin_revenue_by_course(limit=50, date_from=None, date_to=None):
    from courses.models import Course
    from enrollments.models import Enrollment
    from instructor_earnings.models import InstructorEarning
    from payment_details.models import Payment_Details

    qs = Payment_Details.objects.filter(
        is_deleted=False,
        payment__payment_status='completed',
        payment__is_deleted=False,
    ).select_related(
        'course',
        'course__instructor__user',
        'course__category',
        'payment',
    )
    qs = _apply_date_range(qs, 'payment__payment_date', date_from, date_to)

    rows_by_course = {}
    detail_rows = list(qs)
    enrollment_map = {
        (enrollment.payment_id, enrollment.course_id): enrollment
        for enrollment in Enrollment.objects.filter(
            payment_id__in=[detail.payment_id for detail in detail_rows],
            is_deleted=False,
        )
    }
    now = timezone.now()

    for detail in detail_rows:
        course = detail.course
        if not course:
            continue
        gross = _as_decimal(detail.final_price)
        refunded = _refund_success_amount(detail)
        net = max(gross - refunded, Decimal('0'))
        enrollment = enrollment_map.get((detail.payment_id, detail.course_id))
        if not detail_is_final_for_report(detail, enrollment, gross, now):
            continue
        row = rows_by_course.setdefault(course.id, {
            'course_id': course.id,
            'title': course.title,
            'instructor_name': course.instructor.user.full_name if course.instructor and course.instructor.user else None,
            'category_name': course.category.name if course.category else 'Uncategorized',
            'retail_revenue': Decimal('0'),
            'subscription_revenue': Decimal('0'),
            'revenue': Decimal('0'),
            'refunded': Decimal('0'),
            'realized_revenue': Decimal('0'),
            'transaction_count': 0,
            'retail_transaction_count': 0,
            'subscription_transaction_count': 0,
        })
        row['retail_revenue'] += gross
        row['revenue'] += gross
        row['refunded'] += refunded
        row['transaction_count'] += 1
        row['retail_transaction_count'] += 1
        row['realized_revenue'] += net

    sub_qs = InstructorEarning.objects.filter(
        is_deleted=False,
        user_subscription__isnull=False,
    ).select_related('course', 'course__instructor__user', 'course__category', 'user_subscription__payment')
    sub_qs = _apply_date_range(sub_qs, 'earning_date', date_from, date_to)
    for earning in sub_qs:
        course = earning.course
        if not course:
            continue
        if not earning_is_final_for_report(earning, now):
            continue
        row = rows_by_course.setdefault(course.id, {
            'course_id': course.id,
            'title': course.title,
            'instructor_name': course.instructor.user.full_name if course.instructor and course.instructor.user else None,
            'category_name': course.category.name if course.category else 'Uncategorized',
            'retail_revenue': Decimal('0'),
            'subscription_revenue': Decimal('0'),
            'revenue': Decimal('0'),
            'refunded': Decimal('0'),
            'realized_revenue': Decimal('0'),
            'transaction_count': 0,
            'retail_transaction_count': 0,
            'subscription_transaction_count': 0,
        })
        amount = _as_decimal(earning.amount)
        row['subscription_revenue'] += amount
        row['revenue'] += amount
        row['realized_revenue'] += amount
        row['transaction_count'] += 1
        row['subscription_transaction_count'] += 1

    course_ids = list(rows_by_course)
    enrollment_qs = Enrollment.objects.filter(course_id__in=course_ids, is_deleted=False)
    enrollment_qs = _apply_date_range(enrollment_qs, 'enrollment_date', date_from, date_to)
    enrollment_counts = {
        row['course_id']: row['count']
        for row in enrollment_qs.values('course_id').annotate(count=Count('id'))
    }

    known_courses = {
        course.id: course
        for course in Course.objects.filter(id__in=course_ids, is_deleted=False).select_related('instructor__user', 'category')
    }

    result = []
    for course_id, row in rows_by_course.items():
        course = known_courses.get(course_id)
        if not course:
            continue
        revenue = row['revenue']
        refunded = row['refunded']
        net_revenue = revenue - refunded
        result.append({
            'course_id': course_id,
            'title': row['title'],
            'instructor_name': row['instructor_name'],
            'category_name': row['category_name'],
            'revenue': _as_float(revenue),
            'retail_revenue': _as_float(row['retail_revenue']),
            'subscription_revenue': _as_float(row['subscription_revenue']),
            'refunded': _as_float(refunded),
            'net_revenue': _as_float(net_revenue),
            'realized_revenue': _as_float(row['realized_revenue']),
            'transactions': row['transaction_count'],
            'transaction_count': row['transaction_count'],
            'retail_transaction_count': row['retail_transaction_count'],
            'subscription_transaction_count': row['subscription_transaction_count'],
            'enrollments': enrollment_counts.get(course_id, 0),
            'enrollment_count': enrollment_counts.get(course_id, 0),
        })
    result.sort(key=lambda item: (item['realized_revenue'], item['revenue']), reverse=True)
    return result[:limit]


def get_admin_revenue_by_category(limit=20, date_from=None, date_to=None):
    from payment_details.models import Payment_Details

    qs = Payment_Details.objects.filter(
        is_deleted=False,
        payment__payment_status='completed',
        payment__is_deleted=False,
    )
    if date_from:
        qs = qs.filter(payment__payment_date__gte=date_from)
    if date_to:
        qs = qs.filter(payment__payment_date__lte=date_to)

    rows = (
        qs.values('course__category__id', 'course__category__name')
        .annotate(
            revenue=Sum('final_price'),
            refunded=Sum('refund_amount', filter=Q(refund_status=Payment_Details.RefundStatus.SUCCESS)),
            transactions=Count('id'),
            course_count=Count('course_id', distinct=True),
        )
        .order_by('-revenue')[:limit]
    )

    result = []
    for row in rows:
        revenue = row['revenue'] or Decimal('0')
        refunded = row['refunded'] or Decimal('0')
        result.append({
            'category_id': row['course__category__id'],
            'category_name': row['course__category__name'] or 'Uncategorized',
            'revenue': float(revenue),
            'refunded': float(refunded),
            'net_revenue': float(revenue - refunded),
            'transactions': row['transactions'],
            'course_count': row['course_count'],
        })
    return result


def get_admin_revenue_by_instructor(limit=20, date_from=None, date_to=None):
    from instructor_earnings.models import InstructorEarning

    qs = (
        InstructorEarning.objects
        .filter(is_deleted=False)
        .select_related('instructor__user', 'payment', 'user_subscription__payment')
        .prefetch_related('payment__payment_details', 'payment__enrollments')
    )
    qs = _apply_date_range(qs, 'earning_date', date_from, date_to)

    rows_by_instructor = {}
    now = timezone.now()
    for earning in qs:
        if not earning_is_final_for_report(earning, now):
            continue
        row = rows_by_instructor.setdefault(earning.instructor_id, {
            'instructor_id': earning.instructor_id,
            'instructor_name': earning.instructor.user.full_name if earning.instructor and earning.instructor.user else None,
            'gross': Decimal('0'),
            'instructor_earnings': Decimal('0'),
            'retail_revenue': Decimal('0'),
            'subscription_revenue': Decimal('0'),
            'pending': Decimal('0'),
            'available': Decimal('0'),
            'paid': Decimal('0'),
            'transactions': 0,
        })
        gross = _as_decimal(earning.amount)
        net = _as_decimal(earning.net_amount)
        row['gross'] += gross
        row['instructor_earnings'] += net
        if earning.payment_id:
            row['retail_revenue'] += gross
        if earning.user_subscription_id:
            row['subscription_revenue'] += gross
        if earning.status == InstructorEarning.StatusChoices.PENDING:
            row['pending'] += net
        if earning.status == InstructorEarning.StatusChoices.AVAILABLE:
            row['available'] += net
        if earning.status == InstructorEarning.StatusChoices.PAID:
            row['paid'] += net
        row['transactions'] += 1

    result = []
    for row in rows_by_instructor.values():
        result.append({
            'instructor_id': row['instructor_id'],
            'instructor_name': row['instructor_name'],
            'gross': _as_float(row['gross']),
            'instructor_earnings': _as_float(row['instructor_earnings']),
            'platform_revenue': _as_float(row['gross'] - row['instructor_earnings']),
            'retail_revenue': _as_float(row['retail_revenue']),
            'subscription_revenue': _as_float(row['subscription_revenue']),
            'pending': _as_float(row['pending']),
            'available': _as_float(row['available']),
            'paid': _as_float(row['paid']),
            'transactions': row['transactions'],
        })
    result.sort(key=lambda row: row['gross'], reverse=True)
    return result


def get_admin_earning_payout_metrics(limit=100, date_from=None, date_to=None):
    from instructor_earnings.models import InstructorEarning
    from instructor_payouts.models import InstructorPayout

    earning_qs = InstructorEarning.objects.filter(is_deleted=False)
    if date_from:
        earning_qs = earning_qs.filter(earning_date__gte=date_from)
    if date_to:
        earning_qs = earning_qs.filter(earning_date__lte=date_to)

    payout_request_qs = InstructorPayout.objects.filter(is_deleted=False)
    if date_from:
        payout_request_qs = payout_request_qs.filter(request_date__gte=date_from)
    if date_to:
        payout_request_qs = payout_request_qs.filter(request_date__lte=date_to)

    payout_processed_qs = InstructorPayout.objects.filter(
        is_deleted=False,
        status=InstructorPayout.PayoutStatusChoices.PROCESSED,
    )
    if date_from:
        payout_processed_qs = payout_processed_qs.filter(processed_date__gte=date_from)
    if date_to:
        payout_processed_qs = payout_processed_qs.filter(processed_date__lte=date_to)

    earning_totals = earning_qs.aggregate(
        gross=Sum('amount'),
        instructor_earnings=Sum('net_amount'),
        retail_earnings=Sum('net_amount', filter=Q(payment__isnull=False)),
        subscription_earnings=Sum('net_amount', filter=Q(user_subscription__isnull=False)),
        pending=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PENDING)),
        available=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.AVAILABLE)),
        paid=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PAID)),
        cancelled=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.CANCELLED)),
        count=Count('id'),
    )

    payout_rows = list(payout_request_qs.values('status').annotate(
        amount=Sum('amount'),
        fee=Sum('fee'),
        net_amount=Sum('net_amount'),
        count=Count('id'),
    ))
    payout_by_status = {
        row['status']: {
            'count': row['count'],
            'amount': float(row['amount'] or 0),
            'fee': float(row['fee'] or 0),
            'net_amount': float(row['net_amount'] or row['amount'] or 0),
        }
        for row in payout_rows
    }

    earnings_by_instructor = {
        row['instructor__id']: row
        for row in earning_qs.values('instructor__id', 'instructor__user__full_name')
        .annotate(
            gross=Sum('amount'),
            instructor_earnings=Sum('net_amount'),
            pending=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PENDING)),
            available=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.AVAILABLE)),
            paid=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PAID)),
            retail_earnings=Sum('net_amount', filter=Q(payment__isnull=False)),
            subscription_earnings=Sum('net_amount', filter=Q(user_subscription__isnull=False)),
            earning_count=Count('id'),
        )
    }
    payout_requests_by_instructor = {
        row['instructor__id']: row
        for row in payout_request_qs.values('instructor__id', 'instructor__user__full_name')
        .annotate(
            payout_requested=Sum('amount'),
            payout_fee=Sum('fee'),
            payout_net=Sum('net_amount'),
            payout_pending=Sum('amount', filter=Q(status=InstructorPayout.PayoutStatusChoices.PENDING)),
            payout_failed=Sum('amount', filter=Q(status=InstructorPayout.PayoutStatusChoices.FAILED)),
            payout_cancelled=Sum('amount', filter=Q(status=InstructorPayout.PayoutStatusChoices.CANCELLED)),
            payout_count=Count('id'),
        )
    }
    payout_processed_by_instructor = {
        row['instructor__id']: row
        for row in payout_processed_qs.values('instructor__id', 'instructor__user__full_name')
        .annotate(
            payout_processed=Sum('amount'),
            payout_processed_net=Sum('net_amount'),
            payout_processed_fee=Sum('fee'),
            payout_processed_count=Count('id'),
        )
    }

    instructor_ids = set(earnings_by_instructor) | set(payout_requests_by_instructor) | set(payout_processed_by_instructor)
    per_instructor = []
    for instructor_id in instructor_ids:
        earning = earnings_by_instructor.get(instructor_id, {})
        payout = payout_requests_by_instructor.get(instructor_id, {})
        processed_payout = payout_processed_by_instructor.get(instructor_id, {})
        instructor_name = (
            earning.get('instructor__user__full_name')
            or payout.get('instructor__user__full_name')
            or processed_payout.get('instructor__user__full_name')
        )
        instructor_earnings = earning.get('instructor_earnings') or Decimal('0')
        pending = earning.get('pending') or Decimal('0')
        available = earning.get('available') or Decimal('0')
        paid = earning.get('paid') or Decimal('0')
        payable = pending + available
        payout_processed = processed_payout.get('payout_processed') or Decimal('0')
        payout_processed_net = processed_payout.get('payout_processed_net') or Decimal('0')
        payout_pending = payout.get('payout_pending') or Decimal('0')
        per_instructor.append({
            'instructor_id': instructor_id,
            'instructor_name': instructor_name,
            'gross': float(earning.get('gross') or 0),
            'instructor_earnings': float(instructor_earnings),
            'retail_earnings': float(earning.get('retail_earnings') or 0),
            'subscription_earnings': float(earning.get('subscription_earnings') or 0),
            'pending_earnings': float(pending),
            'available_earnings': float(available),
            'paid_earnings': float(paid),
            'payout_requested': float(payout.get('payout_requested') or 0),
            'payout_processed': float(payout_processed),
            'payout_processed_net': float(payout_processed_net),
            'payout_pending': float(payout_pending),
            'payout_failed': float(payout.get('payout_failed') or 0),
            'payout_cancelled': float(payout.get('payout_cancelled') or 0),
            'payout_fee': float(payout.get('payout_fee') or 0),
            'payout_processed_fee': float(processed_payout.get('payout_processed_fee') or 0),
            'earning_count': earning.get('earning_count') or 0,
            'payout_count': payout.get('payout_count') or 0,
            'payout_processed_count': processed_payout.get('payout_processed_count') or 0,
            'payable_earnings': float(payable),
            'unpaid_balance': float(payable),
            'settlement_gap': float(paid - payout_processed_net),
        })

    per_instructor.sort(key=lambda row: row['payable_earnings'], reverse=True)

    processed = payout_by_status.get(InstructorPayout.PayoutStatusChoices.PROCESSED, {})
    pending_payout = payout_by_status.get(InstructorPayout.PayoutStatusChoices.PENDING, {})
    failed = payout_by_status.get(InstructorPayout.PayoutStatusChoices.FAILED, {})
    cancelled = payout_by_status.get(InstructorPayout.PayoutStatusChoices.CANCELLED, {})
    payable_earnings = (earning_totals['pending'] or Decimal('0')) + (earning_totals['available'] or Decimal('0'))
    processed_totals = payout_processed_qs.aggregate(
        amount=Sum('amount'),
        net_amount=Sum('net_amount'),
        fee=Sum('fee'),
        count=Count('id'),
    )

    return {
        'total_gross_earnings': float(earning_totals['gross'] or 0),
        'total_instructor_earnings': float(earning_totals['instructor_earnings'] or 0),
        'retail_earnings': float(earning_totals['retail_earnings'] or 0),
        'subscription_earnings': float(earning_totals['subscription_earnings'] or 0),
        'pending_earnings': float(earning_totals['pending'] or 0),
        'available_earnings': float(earning_totals['available'] or 0),
        'payable_earnings': float(payable_earnings),
        'paid_earnings': float(earning_totals['paid'] or 0),
        'cancelled_earnings': float(earning_totals['cancelled'] or 0),
        'earning_count': earning_totals['count'] or 0,
        'payout_requested': float(payout_request_qs.aggregate(t=Sum('amount'))['t'] or 0),
        'payout_processed': float(processed_totals['amount'] or 0),
        'payout_processed_net': float(processed_totals['net_amount'] or 0),
        'payout_pending': pending_payout.get('amount', 0),
        'payout_failed': failed.get('amount', 0),
        'payout_cancelled': cancelled.get('amount', 0),
        'payout_fee': float(payout_request_qs.aggregate(t=Sum('fee'))['t'] or 0),
        'payout_processed_fee': float(processed_totals['fee'] or 0),
        'payout_count': payout_request_qs.count(),
        'payout_processed_count': processed_totals['count'] or 0,
        'payout_by_status': payout_by_status,
        'per_instructor': per_instructor[:limit],
    }


def get_admin_subscription_metrics(date_from=None, date_to=None):
    from payments.models import Payment
    from subscription_plans.models import SubscriptionPlan, UserSubscription

    payment_qs = Payment.objects.filter(
        payment_status=Payment.PaymentStatus.COMPLETED,
        payment_type=Payment.PaymentType.SUBSCRIPTION,
        is_deleted=False,
    )
    if date_from:
        payment_qs = payment_qs.filter(payment_date__gte=date_from)
    if date_to:
        payment_qs = payment_qs.filter(payment_date__lte=date_to)

    sub_qs = UserSubscription.objects.filter(is_deleted=False)
    new_qs = sub_qs
    cancelled_qs = sub_qs.exclude(cancelled_at__isnull=True)
    expired_qs = sub_qs.exclude(end_date__isnull=True).filter(status=UserSubscription.Status.EXPIRED)
    if date_from:
        new_qs = new_qs.filter(start_date__gte=date_from)
        cancelled_qs = cancelled_qs.filter(cancelled_at__gte=date_from)
        expired_qs = expired_qs.filter(end_date__gte=date_from)
    if date_to:
        new_qs = new_qs.filter(start_date__lte=date_to)
        cancelled_qs = cancelled_qs.filter(cancelled_at__lte=date_to)
        expired_qs = expired_qs.filter(end_date__lte=date_to)

    active_qs = sub_qs.filter(status=UserSubscription.Status.ACTIVE)
    now = timezone.now()
    active_qs = active_qs.filter(Q(end_date__isnull=True) | Q(end_date__gte=now))

    revenue_by_plan = {
        row['subscription_plan_id']: row['revenue'] or Decimal('0')
        for row in payment_qs.values('subscription_plan_id').annotate(revenue=Sum('total_amount'))
    }
    payment_count_by_plan = {
        row['subscription_plan_id']: row['count']
        for row in payment_qs.values('subscription_plan_id').annotate(count=Count('id'))
    }

    plans = SubscriptionPlan.objects.filter(is_deleted=False).order_by('price', 'id')
    per_plan = []
    total_new = 0
    total_cancelled = 0
    total_expired = 0
    total_active = 0
    denominator_total = 0

    for plan in plans:
        plan_new = new_qs.filter(plan=plan).count()
        plan_cancelled = cancelled_qs.filter(plan=plan).count()
        plan_expired = expired_qs.filter(plan=plan).count()
        plan_active = active_qs.filter(plan=plan).count()
        active_at_start = 0
        if date_from:
            active_at_start = sub_qs.filter(plan=plan, start_date__lt=date_from).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=date_from),
            ).filter(
                Q(cancelled_at__isnull=True) | Q(cancelled_at__gt=date_from),
            ).count()
        denominator = active_at_start + plan_new
        cancel_condition = Q(cancelled_at__isnull=False)
        expire_condition = Q(status=UserSubscription.Status.EXPIRED, end_date__isnull=False)
        if date_from:
            cancel_condition &= Q(cancelled_at__gte=date_from)
            expire_condition &= Q(end_date__gte=date_from)
        if date_to:
            cancel_condition &= Q(cancelled_at__lte=date_to)
            expire_condition &= Q(end_date__lte=date_to)
        churn_qs = sub_qs.filter(plan=plan).filter(cancel_condition | expire_condition)
        churned = churn_qs.distinct().count()
        churn_rate = round(churned / denominator * 100, 2) if denominator else 0

        total_new += plan_new
        total_cancelled += plan_cancelled
        total_expired += plan_expired
        total_active += plan_active
        denominator_total += denominator

        per_plan.append({
            'plan_id': plan.id,
            'plan_name': plan.name,
            'duration_type': plan.duration_type,
            'revenue': float(revenue_by_plan.get(plan.id, Decimal('0'))),
            'payments': payment_count_by_plan.get(plan.id, 0),
            'new_subscribers': plan_new,
            'cancelled_subscribers': plan_cancelled,
            'expired_subscribers': plan_expired,
            'active_subscribers': plan_active,
            'churn_rate': churn_rate,
        })

    total_revenue = payment_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
    cancel_condition = Q(cancelled_at__isnull=False)
    expire_condition = Q(status=UserSubscription.Status.EXPIRED, end_date__isnull=False)
    if date_from:
        cancel_condition &= Q(cancelled_at__gte=date_from)
        expire_condition &= Q(end_date__gte=date_from)
    if date_to:
        cancel_condition &= Q(cancelled_at__lte=date_to)
        expire_condition &= Q(end_date__lte=date_to)
    churn_qs = sub_qs.filter(cancel_condition | expire_condition)
    total_churned = churn_qs.distinct().count()
    return {
        'total_revenue': float(total_revenue),
        'new_subscribers': total_new,
        'cancelled_subscribers': total_cancelled,
        'expired_subscribers': total_expired,
        'active_subscribers': total_active,
        'churn_rate': round(total_churned / denominator_total * 100, 2) if denominator_total else 0,
        'per_plan': per_plan,
    }


def get_admin_promotion_stats(date_from=None, date_to=None, limit=100):
    from enrollments.models import Enrollment
    from payment_details.models import Payment_Details
    from payments.models import Payment
    from promotions.models import Promotion

    promotions = (
        Promotion.objects
        .filter(is_deleted=False)
        .select_related('admin__user', 'instructor__user')
        .order_by('-created_at')[:limit]
    )
    result = []
    for promotion in promotions:
        detail_qs = Payment_Details.objects.filter(
            promotion=promotion,
            is_deleted=False,
            payment__is_deleted=False,
            payment__payment_status=Payment.PaymentStatus.COMPLETED,
        ).select_related('payment')
        detail_qs = _apply_date_range(detail_qs, 'payment__payment_date', date_from, date_to)
        detail_rows = list(detail_qs)
        enrollment_map = {
            (enrollment.payment_id, enrollment.course_id): enrollment
            for enrollment in Enrollment.objects.filter(
                payment_id__in=[detail.payment_id for detail in detail_rows],
                is_deleted=False,
            )
        }
        now = timezone.now()
        finalized_details = [
            detail
            for detail in detail_rows
            if detail_is_final_for_report(
                detail,
                enrollment_map.get((detail.payment_id, detail.course_id)),
                _as_decimal(detail.final_price),
                now,
            )
        ]
        detail_payment_ids = {detail.payment_id for detail in finalized_details}
        detail_usage = len(detail_payment_ids)
        detail_discount = sum((_as_decimal(detail.discount) for detail in finalized_details), Decimal('0'))
        detail_revenue = sum(
            (max(_as_decimal(detail.final_price) - _refund_success_amount(detail), Decimal('0')) for detail in finalized_details),
            Decimal('0'),
        )

        payment_qs = Payment.objects.filter(
            promotion=promotion,
            is_deleted=False,
            payment_status=Payment.PaymentStatus.COMPLETED,
        ).prefetch_related('payment_details', 'enrollments')
        payment_qs = _apply_date_range(payment_qs, 'payment_date', date_from, date_to)

        payment_discount = Decimal('0')
        payment_revenue = Decimal('0')
        payment_usage = 0
        for payment in payment_qs:
            payment_details = [detail for detail in payment.payment_details.all() if not detail.is_deleted]
            payment_enrollments = {enrollment.course_id: enrollment for enrollment in payment.enrollments.all() if not enrollment.is_deleted}
            if payment_details:
                if not all(
                    detail_is_final_for_report(
                        detail,
                        payment_enrollments.get(detail.course_id),
                        _as_decimal(detail.final_price),
                        now,
                    )
                    for detail in payment_details
                ):
                    continue
            elif not subscription_payment_is_final_for_report(payment, payment.total_amount, now):
                continue
            detail_discount_total = sum((_as_decimal(detail.discount) for detail in payment_details), Decimal('0'))
            extra_discount = _as_decimal(payment.discount_amount) - detail_discount_total
            if extra_discount > 0:
                payment_discount += extra_discount
            if payment.id not in detail_payment_ids:
                payment_usage += 1
                payment_revenue += max(_as_decimal(payment.total_amount) - _as_decimal(payment.refund_amount), Decimal('0'))

        owner_type = 'admin' if promotion.admin_id else 'instructor' if promotion.instructor_id else 'platform'
        owner_name = None
        if promotion.admin and promotion.admin.user:
            owner_name = promotion.admin.user.full_name or promotion.admin.user.email
        elif promotion.instructor and promotion.instructor.user:
            owner_name = promotion.instructor.user.full_name or promotion.instructor.user.email

        result.append({
            'promotion_id': promotion.id,
            'code': promotion.code,
            'owner_type': owner_type,
            'owner_name': owner_name,
            'used_count': detail_usage + payment_usage,
            'discount_amount': _as_float(detail_discount + payment_discount),
            'total_discount': _as_float(detail_discount + payment_discount),
            'revenue_after_discount': _as_float(detail_revenue + payment_revenue),
            'status': promotion.status,
        })
    result.sort(key=lambda row: (row['used_count'], row['revenue_after_discount']), reverse=True)
    return result


def get_admin_creation_stats(date_from=None, date_to=None, group_by='month'):
    from instructor_payouts.models import InstructorPayout
    from instructors.models import Instructor
    from payment_details.models import Payment_Details
    from payments.models import Payment
    from users.models import User

    if group_by not in VALID_GROUP_BY:
        group_by = 'month'

    empty_row = {
        'new_users': 0,
        'new_instructors': 0,
        'new_orders': 0,
        'new_refunds': 0,
        'new_payouts': 0,
    }
    periods = {}

    def add_counts(qs, date_field, target_field):
        qs = _apply_date_range(qs, date_field, date_from, date_to)
        qs = qs.exclude(**{f'{date_field}__isnull': True})
        for value in qs.values_list(date_field, flat=True):
            label = _period_label(value, group_by)
            row = periods.setdefault(label, {'period': label, **empty_row})
            row[target_field] += 1

    add_counts(User.objects.filter(is_deleted=False), 'created_at', 'new_users')
    add_counts(Instructor.objects.filter(is_deleted=False), 'created_at', 'new_instructors')
    add_counts(Payment.objects.filter(is_deleted=False), 'created_at', 'new_orders')
    add_counts(Payment_Details.objects.filter(is_deleted=False), 'refund_request_time', 'new_refunds')
    add_counts(InstructorPayout.objects.filter(is_deleted=False), 'request_date', 'new_payouts')

    return [periods[key] for key in sorted(periods)]


def get_admin_best_selling_courses(limit=20, date_from=None, date_to=None):
    from courses.models import Course

    revenue_rows = get_admin_revenue_by_course(max(limit * 5, 100), date_from, date_to)
    course_ids = [row['course_id'] for row in revenue_rows]
    course_map = {
        course.id: course
        for course in Course.objects.filter(id__in=course_ids, is_deleted=False).select_related('instructor__user')
    }

    result = []
    for revenue_row in revenue_rows:
        course = course_map.get(revenue_row['course_id'])
        if not course:
            continue
        finalized_count = revenue_row.get('transaction_count', 0)
        result.append({
            'course_id': course.id,
            'title': course.title,
            'instructor_name': course.instructor.user.full_name if course.instructor and course.instructor.user else None,
            'enrollment_count': finalized_count,
            'retail_enrollment_count': revenue_row.get('retail_transaction_count', 0),
            'subscription_enrollment_count': revenue_row.get('subscription_transaction_count', 0),
            'revenue': revenue_row.get('net_revenue', 0),
            'realized_revenue': revenue_row.get('realized_revenue', 0),
            'refunded': revenue_row.get('refunded', 0),
            'rating': float(course.rating or 0),
        })
    result.sort(key=lambda item: (item['enrollment_count'], item['revenue']), reverse=True)
    return result[:limit]
