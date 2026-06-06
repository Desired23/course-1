from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timezone as dt_timezone


def get_admin_dashboard_stats():
    from users.models import User
    from instructors.models import Instructor
    from courses.models import Course
    from enrollments.models import Enrollment
    from payments.models import Payment
    from reviews.models import Review
    from supports.models import Support

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


    total_users = User.objects.filter(is_deleted=False).count()
    new_users_this_month = User.objects.filter(is_deleted=False, created_at__gte=month_start).count()
    total_instructors = User.objects.filter(
        is_deleted=False, instructor__isnull=False, instructor__is_deleted=False
    ).count()
    active_students = User.objects.filter(
        is_deleted=False, status='active'
    ).filter(
        Q(admin__isnull=True) | Q(admin__is_deleted=True),
        Q(instructor__isnull=True) | Q(instructor__is_deleted=True),
    ).count()


    courses_qs = Course.objects.filter(is_deleted=False)
    total_courses = courses_qs.count()
    published_courses = courses_qs.filter(status='published').count()
    pending_courses = courses_qs.filter(status='pending').count()


    payments_qs = Payment.objects.filter(payment_status=Payment.PaymentStatus.COMPLETED)
    total_revenue = payments_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
    this_month_revenue = payments_qs.filter(
        payment_date__gte=month_start
    ).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')


    enrollments_qs = Enrollment.objects.filter(is_deleted=False)
    total_enrollments = enrollments_qs.count()
    this_month_enrollments = enrollments_qs.filter(enrollment_date__gte=month_start).count()
    completed_enrollments = enrollments_qs.filter(status='complete').count()
    completion_rate = round(
        completed_enrollments / total_enrollments * 100, 1
    ) if total_enrollments else 0


    pending_reviews = Review.objects.filter(is_deleted=False, status='pending').count()


    pending_support_tickets = Support.objects.filter(
        is_deleted=False, status__in=['open', 'pending']
    ).count()


    platform_rating = Review.objects.filter(
        is_deleted=False, status='approved'
    ).aggregate(avg=Avg('rating'))['avg'] or 0

    return {
        'total_users': total_users,
        'new_users_this_month': new_users_this_month,
        'total_instructors': total_instructors,
        'total_courses': total_courses,
        'published_courses': published_courses,
        'pending_courses': pending_courses,
        'total_revenue': float(total_revenue),
        'this_month_revenue': float(this_month_revenue),
        'total_enrollments': total_enrollments,
        'this_month_enrollments': this_month_enrollments,
        'active_students': active_students,
        'completion_rate': completion_rate,
        'pending_reviews': pending_reviews,
        'pending_support_tickets': pending_support_tickets,
        'platform_rating': round(float(platform_rating), 2),
    }


def get_admin_revenue_analytics(months=6):
    from payments.models import Payment
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

        revenue = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_date__gte=month_start,
            payment_date__lt=month_end,
        ).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')

        result.append({
            'date': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
        })
    return result


def get_admin_user_analytics(months=6):
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
        ).count()
        result.append({
            'date': month_start.strftime('%Y-%m'),
            'new_users': new_users,
        })
    return result


def get_admin_course_analytics():
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review

    top_courses = (
        Course.objects.filter(is_deleted=False, status='published')
        .annotate(
            enrollment_count=Count('enrollment_course', filter=Q(enrollment_course__is_deleted=False)),
            avg_rating=Avg('reviews_course__rating', filter=Q(reviews_course__is_deleted=False, reviews_course__status='approved')),
        )
        .order_by('-enrollment_count')[:10]
    )

    return [
        {
            'course_id': c.id,
            'title': c.title,
            'instructor_name': c.instructor.user.full_name if c.instructor and c.instructor.user else None,
            'enrollment_count': c.enrollment_count,
            'rating': round(float(c.avg_rating or 0), 2),
        }
        for c in top_courses
    ]


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
    from payment_details.models import Payment_Details

    qs = Payment.objects.filter(
        payment_status=Payment.PaymentStatus.COMPLETED,
        is_deleted=False,
    )
    if date_from:
        qs = qs.filter(payment_date__gte=date_from)
    if date_to:
        qs = qs.filter(payment_date__lte=date_to)

    retail_qs = qs.filter(payment_type=Payment.PaymentType.COURSE_PURCHASE)
    sub_qs = qs.filter(payment_type=Payment.PaymentType.SUBSCRIPTION)

    retail_revenue = retail_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
    subscription_revenue = sub_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
    refunded = Payment_Details.objects.filter(
        payment__in=qs,
        refund_status=Payment_Details.RefundStatus.SUCCESS,
        is_deleted=False,
    ).aggregate(t=Sum('refund_amount'))['t'] or Decimal('0')
    gross = retail_revenue + subscription_revenue

    return {
        'retail_revenue': float(retail_revenue),
        'subscription_revenue': float(subscription_revenue),
        'total_gross': float(gross),
        'total_refunded': float(refunded),
        'net_revenue': float(gross - refunded),
        'retail_count': retail_qs.count(),
        'subscription_count': sub_qs.count(),
    }


def get_admin_revenue_monthly_breakdown(months=12):
    from payments.models import Payment
    from payment_details.models import Payment_Details

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
        retail = qs.filter(payment_type=Payment.PaymentType.COURSE_PURCHASE).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        subscription = qs.filter(payment_type=Payment.PaymentType.SUBSCRIPTION).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        refunded = Payment_Details.objects.filter(
            payment__in=qs,
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            is_deleted=False,
        ).aggregate(t=Sum('refund_amount'))['t'] or Decimal('0')
        gross = retail + subscription
        result.append({
            'date': month_start.strftime('%Y-%m'),
            'retail': float(retail),
            'subscription': float(subscription),
            'gross': float(gross),
            'refunded': float(refunded),
            'net': float(gross - refunded),
        })
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
        .annotate(revenue=Sum('final_price'), transactions=Count('id'))
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
