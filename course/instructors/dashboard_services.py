from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from utils.revenue_reporting import earning_is_final_for_report


VALID_GROUP_BY = {'day', 'week', 'month', 'quarter', 'year'}


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


def _course_refund_rate(course, earnings_qs):
    from payment_details.models import Payment_Details

    if hasattr(earnings_qs, 'filter'):
        retail_earnings = list(earnings_qs.filter(course=course, payment__isnull=False))
    else:
        retail_earnings = [
            earning for earning in earnings_qs
            if earning.course_id == course.id and earning.payment_id
        ]
    transaction_count = len(retail_earnings)
    if not transaction_count:
        return 0
    payment_ids = [earning.payment_id for earning in retail_earnings]
    refunded_count = Payment_Details.objects.filter(
        payment_id__in=payment_ids,
        course=course,
        is_deleted=False,
        refund_status=Payment_Details.RefundStatus.SUCCESS,
    ).count()
    return round(refunded_count / transaction_count * 100, 1)


def _level_progress_item(label, current, target, value_type='number'):
    target_value = float(target or 0)
    current_value = float(current or 0)
    return {
        'label': label,
        'current': current_value,
        'target': target_value,
        'value_type': value_type,
        'progress': 100 if target_value <= 0 else round(min(current_value / target_value * 100, 100), 1),
        'met': target_value <= 0 or current_value >= target_value,
    }


def get_instructor_dashboard_stats(instructor, date_from=None, date_to=None):
    print(f"Calculating dashboard stats for instructor {instructor.id}...")
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning
    from instructor_payouts.models import InstructorPayout
    from instructor_levels.services import (
        check_and_upgrade_instructor_level,
        get_default_instructor_level,
        get_next_instructor_level,
    )
    from subscription_plans.models import SubscriptionUsage

    check_and_upgrade_instructor_level(instructor)

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    courses_qs = Course.objects.filter(instructor=instructor, is_deleted=False)
    courses_for_counts = _apply_date_range(courses_qs, 'created_at', date_from, date_to) if date_from or date_to else courses_qs
    course_ids = list(courses_qs.values_list('id', flat=True))

    status_counts = courses_for_counts.aggregate(
        published=Count('id', filter=Q(status='published')),
        pending=Count('id', filter=Q(status='pending')),
        draft=Count('id', filter=Q(status='draft')),
        rejected=Count('id', filter=Q(status='rejected')),
        archived=Count('id', filter=Q(status='archived')),
    )
    published_count = status_counts['published']
    draft_count = status_counts['draft']

    enrollments_qs = Enrollment.objects.filter(
        course_id__in=course_ids, is_deleted=False, status='active'
    )
    enrollments_qs = _apply_date_range(enrollments_qs, 'enrollment_date', date_from, date_to)
    total_students = enrollments_qs.values('user_id').distinct().count()
    new_students_this_month = (
        enrollments_qs
        .filter(enrollment_date__gte=month_start)
        .values('user_id')
        .distinct()
        .count()
    )

    earnings_qs = InstructorEarning.objects.filter(
        instructor=instructor, is_deleted=False
    )
    earnings_qs = _apply_date_range(earnings_qs, 'earning_date', date_from, date_to)
    total_earnings = earnings_qs.aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    this_month_earnings = earnings_qs.filter(
        earning_date__gte=month_start
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    pending_earnings = earnings_qs.filter(
        status=InstructorEarning.StatusChoices.PENDING,
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    available_earnings = earnings_qs.filter(
        status=InstructorEarning.StatusChoices.AVAILABLE,
        instructor_payout__isnull=True,
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    this_month_pending_earnings = earnings_qs.filter(
        status=InstructorEarning.StatusChoices.PENDING,
        earning_date__gte=month_start,
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    this_month_available_earnings = earnings_qs.filter(
        status=InstructorEarning.StatusChoices.AVAILABLE,
        instructor_payout__isnull=True,
        earning_date__gte=month_start,
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')

    payouts_qs = InstructorPayout.objects.filter(
        instructor=instructor,
        is_deleted=False,
    )
    pending_payouts_qs = _apply_date_range(
        payouts_qs.filter(status=InstructorPayout.PayoutStatusChoices.PENDING),
        'request_date',
        date_from,
        date_to,
    )
    processed_payouts_qs = _apply_date_range(
        payouts_qs.filter(status=InstructorPayout.PayoutStatusChoices.PROCESSED),
        'processed_date',
        date_from,
        date_to,
    )
    pending_payouts = sum(
        (payout.net_amount if payout.net_amount is not None else payout.amount)
        for payout in pending_payouts_qs
    )
    realized_earnings = sum(
        (payout.net_amount if payout.net_amount is not None else payout.amount)
        for payout in processed_payouts_qs
    )
    this_month_pending_payouts = sum(
        (payout.net_amount if payout.net_amount is not None else payout.amount)
        for payout in pending_payouts_qs.filter(request_date__gte=month_start)
    )
    this_month_realized_earnings = sum(
        (payout.net_amount if payout.net_amount is not None else payout.amount)
        for payout in processed_payouts_qs.filter(processed_date__gte=month_start)
    )
    estimated_earnings = pending_earnings + available_earnings + pending_payouts
    this_month_estimated_earnings = (
        this_month_pending_earnings
        + this_month_available_earnings
        + this_month_pending_payouts
    )

    reviews_qs = Review.objects.filter(
        course_id__in=course_ids, is_deleted=False, status='approved'
    )
    reviews_qs = _apply_date_range(reviews_qs, 'created_at', date_from, date_to)
    avg_rating = reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0
    total_reviews = reviews_qs.count()
    total_content_minutes = courses_for_counts.aggregate(t=Sum('duration'))['t'] or 0
    total_plan_minutes = (
        SubscriptionUsage.objects
        .filter(course__instructor=instructor)
        .aggregate(t=Sum('consumed_minutes'))['t'] or 0
    )

    level = instructor.level or get_default_instructor_level()
    using_default_level = instructor.level is None and level is not None
    next_level = get_next_instructor_level(level)
    level_progress = None
    if level:
        level_progress = {
            'level_name': level.name,
            'level_description': level.description,
            'target_level_name': next_level.name if next_level else None,
            'target_level_description': next_level.description if next_level else None,
            'commission_rate': float(level.commission_rate or 0),
            'plan_commission_rate': float(level.plan_commission_rate or 0),
            'locked': instructor.level_locked,
            'using_default': using_default_level,
            'is_max_level': next_level is None,
            'items': [
                _level_progress_item('students', total_students, next_level.min_students, 'number'),
                _level_progress_item('revenue', total_earnings, next_level.min_revenue, 'money'),
                _level_progress_item('plan_minutes', total_plan_minutes, next_level.min_plan_minutes, 'minutes'),
            ] if next_level else [],
        }

    course_stats = []
    for course in courses_qs.order_by('-created_at'):
        c_enrollments = Enrollment.objects.filter(course=course, is_deleted=False)
        c_enrollments = _apply_date_range(c_enrollments, 'enrollment_date', date_from, date_to)
        c_new = c_enrollments.filter(enrollment_date__gte=month_start).count()
        c_total = c_enrollments.count()
        c_completed = c_enrollments.filter(status='complete').count()
        c_completion_rate = round(c_completed / c_total * 100, 1) if c_total else 0
        c_reviews = Review.objects.filter(course=course, is_deleted=False, status='approved')
        c_reviews = _apply_date_range(c_reviews, 'created_at', date_from, date_to)
        c_rating = c_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        c_earnings = earnings_qs.filter(course=course).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')

        course_stats.append({
            'course_id': course.id,
            'title': course.title,
            'total_students': c_total,
            'new_students_this_month': c_new,
            'rating': round(float(c_rating), 2),
            'total_reviews': c_reviews.count(),
            'earnings': float(c_earnings),
            'completion_rate': c_completion_rate,
        })

    return {
        'total_courses': courses_for_counts.count(),
        'published_courses': published_count,
        'draft_courses': draft_count,
        'pending_courses': status_counts['pending'],
        'rejected_courses': status_counts['rejected'],
        'archived_courses': status_counts['archived'],
        'total_students': total_students,
        'new_students_this_month': new_students_this_month,
        'total_earnings': float(total_earnings),
        'this_month_earnings': float(this_month_earnings),
        'estimated_earnings': float(estimated_earnings),
        'this_month_estimated_earnings': float(this_month_estimated_earnings),
        'pending_earnings': float(pending_earnings),
        'available_earnings': float(available_earnings),
        'pending_payouts': float(pending_payouts),
        'realized_earnings': float(realized_earnings),
        'this_month_realized_earnings': float(this_month_realized_earnings),
        'average_rating': round(float(avg_rating), 2),
        'total_reviews': total_reviews,
        'total_content_minutes': total_content_minutes,
        'total_content_hours': round(total_content_minutes / 60, 2),
        'total_plan_minutes': total_plan_minutes,
        'level_progress': level_progress,
        'course_stats': course_stats,
    }


def get_course_analytics(instructor, course_id, date_from=None, date_to=None, group_by='month'):
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning as _IE

    try:
        course = Course.objects.get(id=course_id, instructor=instructor, is_deleted=False)
    except Course.DoesNotExist:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({"error": "Course not found or not owned by this instructor."})

    if group_by not in VALID_GROUP_BY:
        group_by = 'month'
    now = timezone.now()


    enrollment_trend = []
    if date_from or date_to:
        trend_qs = Enrollment.objects.filter(course=course, is_deleted=False)
        trend_qs = _apply_date_range(trend_qs, 'enrollment_date', date_from, date_to)
        grouped = {}
        for value in trend_qs.values_list('enrollment_date', flat=True):
            label = _period_label(value, group_by)
            grouped[label] = grouped.get(label, 0) + 1
        enrollment_trend = [{'date': label, 'enrollments': grouped[label]} for label in sorted(grouped)]
    else:
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )

            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            count = Enrollment.objects.filter(
                course=course, is_deleted=False,
                enrollment_date__gte=month_start, enrollment_date__lt=month_end
            ).count()
            enrollment_trend.append({
                'date': month_start.strftime('%Y-%m'),
                'enrollments': count,
            })


    from instructor_earnings.models import InstructorEarning
    revenue_trend = []
    if date_from or date_to:
        trend_qs = InstructorEarning.objects.filter(course=course, instructor=instructor, is_deleted=False)
        trend_qs = _apply_date_range(trend_qs, 'earning_date', date_from, date_to)
        grouped = {}
        for row in trend_qs.values('earning_date', 'net_amount'):
            label = _period_label(row['earning_date'], group_by)
            grouped[label] = grouped.get(label, Decimal('0')) + (row['net_amount'] or Decimal('0'))
        revenue_trend = [{'date': label, 'revenue': float(grouped[label])} for label in sorted(grouped)]
    else:
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            revenue = InstructorEarning.objects.filter(
                course=course, instructor=instructor, is_deleted=False,
                earning_date__gte=month_start, earning_date__lt=month_end
            ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
            revenue_trend.append({
                'date': month_start.strftime('%Y-%m'),
                'revenue': float(revenue),
            })

    enrollments = Enrollment.objects.filter(course=course, is_deleted=False)
    enrollments = _apply_date_range(enrollments, 'enrollment_date', date_from, date_to)
    not_started = enrollments.filter(progress=0).count()
    completed = enrollments.filter(status='complete').count()
    in_progress = enrollments.count() - not_started - completed


    from learning_progress.models import LearningProgress
    progress_qs = LearningProgress.objects.filter(course=course, is_deleted=False)
    progress_qs = _apply_date_range(progress_qs, 'last_accessed', date_from, date_to)
    popular_lessons = (
        progress_qs
        .values('lesson_id', 'lesson__title')
        .annotate(views=Count('id'), avg_completion=Avg('progress_percentage'))
        .order_by('-views')[:5]
    )
    popular_lessons_data = [
        {
            'lesson_id': row['lesson_id'],
            'title': row['lesson__title'],
            'views': row['views'],
            'avg_completion_rate': round(row['avg_completion'] or 0, 1),
        }
        for row in popular_lessons
    ]


    from reviews.models import Review
    reviews_qs = Review.objects.filter(course=course, is_deleted=False, status='approved')
    reviews_qs = _apply_date_range(reviews_qs, 'created_at', date_from, date_to)
    rating_dist = {f'{i}_star': 0 for i in range(1, 6)}
    for row in reviews_qs.values('rating').annotate(cnt=Count('id')):
        key = f"{int(row['rating'])}_star"
        if key in rating_dist:
            rating_dist[key] = row['cnt']
    avg_rating = reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0
    total_reviews = reviews_qs.count()


    total_students = enrollments.count()
    completion_rate = round(completed / total_students * 100, 1) if total_students else 0

    last_30_start = now - timedelta(days=30)
    earnings_qs = InstructorEarning.objects.filter(
        course=course, instructor=instructor, is_deleted=False
    )
    earnings_qs = _apply_date_range(earnings_qs, 'earning_date', date_from, date_to)
    total_revenue = earnings_qs.aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    last_30_revenue = earnings_qs.filter(
        earning_date__gte=last_30_start
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    last_30_enrollments = enrollments.filter(enrollment_date__gte=last_30_start).count()

    from payment_details.models import Payment_Details
    payment_ids = list(enrollments.exclude(payment=None).values_list('payment_id', flat=True))
    refunded = (
        Payment_Details.objects.filter(
            payment_id__in=payment_ids,
            refund_status=Payment_Details.RefundStatus.SUCCESS,
            is_deleted=False,
        ).values('payment_id').distinct().count()
        if payment_ids else 0
    )
    refund_rate = round(refunded / total_students * 100, 1) if total_students else 0


    lesson_stats = {
        row['lesson_id']: {
            'views': row['views'],
            'completion_rate': round(float(row['avg_completion'] or 0), 1),
        }
        for row in (
            progress_qs
            .values('lesson_id')
            .annotate(views=Count('id'), avg_completion=Avg('progress_percentage'))
        )
    }

    # real aggregations for instructor tab
    inst_course_ids = list(
        Course.objects.filter(instructor=instructor, is_deleted=False).values_list('id', flat=True)
    )
    inst_total_courses = len(inst_course_ids)
    inst_total_students = (
        Enrollment.objects.filter(course_id__in=inst_course_ids, is_deleted=False).values('user_id').distinct().count()
    )
    inst_avg_rating_val = (
        Review.objects.filter(course_id__in=inst_course_ids, is_deleted=False, status='approved')
        .aggregate(avg=Avg('rating'))['avg'] or 0
    )
    inst_total_revenue = float(
        _IE.objects.filter(instructor=instructor, is_deleted=False)
        .aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    )

    return {
        'course_id': course.id,
        'title': course.title,
        'enrollment_trend': enrollment_trend,
        'revenue_trend': revenue_trend,
        'student_progress': {
            'not_started': not_started,
            'in_progress': in_progress,
            'completed': completed,
        },
        'popular_lessons': popular_lessons_data,
        'rating_distribution': rating_dist,
        'lesson_stats': lesson_stats,
        'summary': {
            'total_students': total_students,
            'total_revenue': float(total_revenue),
            'completion_rate': completion_rate,
            'average_rating': round(float(avg_rating), 2),
            'total_reviews': total_reviews,
            'refund_rate': refund_rate,
            'last_30_days': {
                'enrollments': last_30_enrollments,
                'revenue': float(last_30_revenue),
            },
        },
        'instructor_stats': {
            'total_courses': inst_total_courses,
            'total_students': inst_total_students,
            'average_rating': round(float(inst_avg_rating_val), 2),
            'total_revenue': inst_total_revenue,
        },
    }

def get_instructor_analytics_timeseries(instructor, months=12, date_from=None, date_to=None, group_by='month'):
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning
    from learning_progress.models import LearningProgress

    if group_by not in VALID_GROUP_BY:
        group_by = 'month'
    now = timezone.now()
    courses_qs = Course.objects.filter(instructor=instructor, is_deleted=False)
    course_ids = list(courses_qs.values_list('id', flat=True))

    revenue_trend = []
    enrollment_trend = []
    engagement_trend = []

    if date_from or date_to:
        revenue_groups = {}
        revenue_qs = _apply_date_range(
            InstructorEarning.objects
            .filter(instructor=instructor, is_deleted=False)
            .select_related('course', 'payment', 'user_subscription__payment')
            .prefetch_related('payment__payment_details', 'payment__enrollments'),
            'earning_date',
            date_from,
            date_to,
        )
        finalized_earnings = [
            earning for earning in revenue_qs
            if earning_is_final_for_report(earning, now)
        ]
        for earning in finalized_earnings:
            label = _period_label(earning.earning_date, group_by)
            target = revenue_groups.setdefault(label, {
                'revenue': Decimal('0'),
                'retail_revenue': Decimal('0'),
                'subscription_revenue': Decimal('0'),
                'transaction_count': 0,
            })
            amount = earning.net_amount or Decimal('0')
            target['revenue'] += amount
            if earning.payment_id:
                target['retail_revenue'] += amount
            if earning.user_subscription_id:
                target['subscription_revenue'] += amount
            target['transaction_count'] += 1
        revenue_trend = [
            {
                'date': label,
                'revenue': float(revenue_groups[label]['revenue']),
                'retail_revenue': float(revenue_groups[label]['retail_revenue']),
                'subscription_revenue': float(revenue_groups[label]['subscription_revenue']),
                'transaction_count': revenue_groups[label]['transaction_count'],
            }
            for label in sorted(revenue_groups)
        ]

        enrollment_groups = {}
        enrollment_qs = _apply_date_range(
            Enrollment.objects.filter(course_id__in=course_ids, is_deleted=False),
            'enrollment_date',
            date_from,
            date_to,
        )
        for value in enrollment_qs.values_list('enrollment_date', flat=True):
            label = _period_label(value, group_by)
            enrollment_groups[label] = enrollment_groups.get(label, 0) + 1
        enrollment_trend = [{'date': label, 'enrollments': enrollment_groups[label]} for label in sorted(enrollment_groups)]

        progress_qs = LearningProgress.objects.filter(course_id__in=course_ids, is_deleted=False)
        active_qs = _apply_date_range(progress_qs, 'last_accessed', date_from, date_to)
        completion_qs = _apply_date_range(progress_qs.filter(is_completed=True), 'completion_date', date_from, date_to)
        engagement_groups = {}
        for value in active_qs.values_list('last_accessed', flat=True):
            label = _period_label(value, group_by)
            engagement_groups.setdefault(label, {'active_learners': set(), 'completions': 0})
        for row in active_qs.values('last_accessed', 'user_id'):
            label = _period_label(row['last_accessed'], group_by)
            engagement_groups.setdefault(label, {'active_learners': set(), 'completions': 0})['active_learners'].add(row['user_id'])
        for value in completion_qs.values_list('completion_date', flat=True):
            label = _period_label(value, group_by)
            engagement_groups.setdefault(label, {'active_learners': set(), 'completions': 0})['completions'] += 1
        engagement_trend = [
            {
                'date': label,
                'active_learners': len(engagement_groups[label]['active_learners']),
                'completions': engagement_groups[label]['completions'],
            }
            for label in sorted(engagement_groups)
        ]

        top_courses = []
        for course in courses_qs.order_by('-total_students'):
            course_earnings = [
                earning for earning in finalized_earnings
                if earning.course_id == course.id
            ]
            course_revenue = {
                'revenue': sum((earning.net_amount or Decimal('0') for earning in course_earnings), Decimal('0')),
                'retail_revenue': sum((earning.net_amount or Decimal('0') for earning in course_earnings if earning.payment_id), Decimal('0')),
                'subscription_revenue': sum((earning.net_amount or Decimal('0') for earning in course_earnings if earning.user_subscription_id), Decimal('0')),
                'transaction_count': len(course_earnings),
            }
            if not course_revenue['transaction_count'] and not enrollment_qs.filter(course=course).exists():
                continue
            top_courses.append({
                'course_id': course.id,
                'title': course.title,
                'students': enrollment_qs.filter(course=course).values('user_id').distinct().count(),
                'rating': float(course.rating or 0),
                'revenue': float(course_revenue['revenue']),
                'retail_revenue': float(course_revenue['retail_revenue']),
                'subscription_revenue': float(course_revenue['subscription_revenue']),
                'transaction_count': course_revenue['transaction_count'],
                'refund_rate': _course_refund_rate(course, finalized_earnings),
            })

        reviews_qs = _apply_date_range(
            Review.objects.filter(course_id__in=course_ids, is_deleted=False, status='approved'),
            'created_at',
            date_from,
            date_to,
        )
        rating_dist = {f'{i}_star': 0 for i in range(1, 6)}
        for row in reviews_qs.values('rating').annotate(cnt=Count('id')):
            key = f"{int(row['rating'])}_star"
            if key in rating_dist:
                rating_dist[key] = row['cnt']

        return {
            'revenue_trend': revenue_trend,
            'enrollment_trend': enrollment_trend,
            'engagement_trend': engagement_trend,
            'top_courses': sorted(top_courses, key=lambda row: (row['students'], row['revenue']), reverse=True),
            'rating_distribution': rating_dist,
        }

    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        label = month_start.strftime('%Y-%m')


        revenue_qs = (
            InstructorEarning.objects
            .filter(
                instructor=instructor, is_deleted=False,
                earning_date__gte=month_start, earning_date__lt=month_end,
            )
            .select_related('course', 'payment', 'user_subscription__payment')
            .prefetch_related('payment__payment_details', 'payment__enrollments')
        )
        finalized_earnings = [
            earning for earning in revenue_qs
            if earning_is_final_for_report(earning, now)
        ]
        rev = {
            'revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_earnings), Decimal('0')),
            'retail_revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_earnings if earning.payment_id), Decimal('0')),
            'subscription_revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_earnings if earning.user_subscription_id), Decimal('0')),
            'transaction_count': len(finalized_earnings),
        }
        revenue_trend.append({
            'date': label,
            'revenue': float(rev['revenue']),
            'retail_revenue': float(rev['retail_revenue']),
            'subscription_revenue': float(rev['subscription_revenue']),
            'transaction_count': rev['transaction_count'],
        })


        enr_count = Enrollment.objects.filter(
            course_id__in=course_ids, is_deleted=False,
            enrollment_date__gte=month_start, enrollment_date__lt=month_end
        ).count()
        enrollment_trend.append({'date': label, 'enrollments': enr_count})


        active_learners = LearningProgress.objects.filter(
            course_id__in=course_ids, is_deleted=False,
            last_accessed__gte=month_start, last_accessed__lt=month_end
        ).values('user_id').distinct().count()

        completions = LearningProgress.objects.filter(
            course_id__in=course_ids, is_deleted=False,
            is_completed=True,
            completion_date__gte=month_start, completion_date__lt=month_end
        ).count()

        engagement_trend.append({
            'date': label,
            'active_learners': active_learners,
            'completions': completions,
        })


    top_courses = []
    for course in courses_qs.order_by('-total_students'):
        course_earnings_qs = (
            InstructorEarning.objects
            .filter(course=course, instructor=instructor, is_deleted=False)
            .select_related('course', 'payment', 'user_subscription__payment')
            .prefetch_related('payment__payment_details', 'payment__enrollments')
        )
        finalized_course_earnings = [
            earning for earning in course_earnings_qs
            if earning_is_final_for_report(earning, now)
        ]
        course_revenue = {
            'revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_course_earnings), Decimal('0')),
            'retail_revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_course_earnings if earning.payment_id), Decimal('0')),
            'subscription_revenue': sum((earning.net_amount or Decimal('0') for earning in finalized_course_earnings if earning.user_subscription_id), Decimal('0')),
            'transaction_count': len(finalized_course_earnings),
        }
        top_courses.append({
            'course_id': course.id,
            'title': course.title,
            'students': course.total_students or 0,
            'rating': float(course.rating or 0),
            'revenue': float(course_revenue['revenue']),
            'retail_revenue': float(course_revenue['retail_revenue']),
            'subscription_revenue': float(course_revenue['subscription_revenue']),
            'transaction_count': course_revenue['transaction_count'],
            'refund_rate': _course_refund_rate(course, finalized_course_earnings),
        })


    reviews_qs = Review.objects.filter(
        course_id__in=course_ids, is_deleted=False, status='approved'
    )
    rating_dist = {f'{i}_star': 0 for i in range(1, 6)}
    for row in reviews_qs.values('rating').annotate(cnt=Count('id')):
        key = f"{int(row['rating'])}_star"
        if key in rating_dist:
            rating_dist[key] = row['cnt']

    return {
        'revenue_trend': revenue_trend,
        'enrollment_trend': enrollment_trend,
        'engagement_trend': engagement_trend,
        'top_courses': top_courses,
        'rating_distribution': rating_dist,
    }
