from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timezone as dt_timezone


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
    total_revenue = payments_qs.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
    this_month_revenue = payments_qs.filter(
        payment_date__gte=month_start
    ).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')


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
        'this_month_revenue': float(this_month_revenue),
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
        )
        if date_from:
            revenue = revenue.filter(payment_date__gte=date_from)
        if date_to:
            revenue = revenue.filter(payment_date__lte=date_to)
        revenue = revenue.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')

        result.append({
            'date': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
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
        .annotate(revenue=Sum('final_price'), transactions=Count('id'))
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


def get_admin_revenue_monthly_breakdown(months=12, date_from=None, date_to=None):
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
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
        retail = qs.filter(payment_type=Payment.PaymentType.COURSE_PURCHASE).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        subscription = qs.filter(payment_type=Payment.PaymentType.SUBSCRIPTION).aggregate(t=Sum('total_amount'))['t'] or Decimal('0')
        transactions = qs.count()
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
            'transactions': transactions,
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


def get_admin_revenue_by_course(limit=50, date_from=None, date_to=None):
    from enrollments.models import Enrollment
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

    rows = list(
        qs.values(
            'course__id',
            'course__title',
            'course__instructor__user__full_name',
            'course__category__name',
        )
        .annotate(
            revenue=Sum('final_price'),
            refunded=Sum('refund_amount', filter=Q(refund_status=Payment_Details.RefundStatus.SUCCESS)),
            transactions=Count('id'),
        )
        .order_by('-revenue')[:limit]
    )

    enrollment_counts = {
        row['course_id']: row['count']
        for row in (
            Enrollment.objects
            .filter(course_id__in=[r['course__id'] for r in rows], is_deleted=False)
            .values('course_id')
            .annotate(count=Count('id'))
        )
    }

    result = []
    for row in rows:
        revenue = row['revenue'] or Decimal('0')
        refunded = row['refunded'] or Decimal('0')
        course_id = row['course__id']
        result.append({
            'course_id': course_id,
            'title': row['course__title'],
            'instructor_name': row['course__instructor__user__full_name'],
            'category_name': row['course__category__name'] or 'Uncategorized',
            'revenue': float(revenue),
            'refunded': float(refunded),
            'net_revenue': float(revenue - refunded),
            'transactions': row['transactions'],
            'enrollments': enrollment_counts.get(course_id, 0),
        })
    return result


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

    qs = InstructorEarning.objects.filter(is_deleted=False)
    if date_from:
        qs = qs.filter(earning_date__gte=date_from)
    if date_to:
        qs = qs.filter(earning_date__lte=date_to)

    rows = (
        qs.values('instructor__id', 'instructor__user__full_name')
        .annotate(
            gross=Sum('amount'),
            instructor_earnings=Sum('net_amount'),
            retail_revenue=Sum('amount', filter=Q(payment__isnull=False)),
            subscription_revenue=Sum('amount', filter=Q(user_subscription__isnull=False)),
            pending=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PENDING)),
            available=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.AVAILABLE)),
            paid=Sum('net_amount', filter=Q(status=InstructorEarning.StatusChoices.PAID)),
            transactions=Count('id'),
        )
        .order_by('-gross')[:limit]
    )

    result = []
    for row in rows:
        gross = row['gross'] or Decimal('0')
        instructor_earnings = row['instructor_earnings'] or Decimal('0')
        result.append({
            'instructor_id': row['instructor__id'],
            'instructor_name': row['instructor__user__full_name'],
            'gross': float(gross),
            'instructor_earnings': float(instructor_earnings),
            'platform_revenue': float(gross - instructor_earnings),
            'retail_revenue': float(row['retail_revenue'] or 0),
            'subscription_revenue': float(row['subscription_revenue'] or 0),
            'pending': float(row['pending'] or 0),
            'available': float(row['available'] or 0),
            'paid': float(row['paid'] or 0),
            'transactions': row['transactions'],
        })
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
