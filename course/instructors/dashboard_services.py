from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


def get_instructor_dashboard_stats(instructor):
    print(f"Calculating dashboard stats for instructor {instructor.id}...")
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    courses_qs = Course.objects.filter(instructor=instructor, is_deleted=False)
    course_ids = list(courses_qs.values_list('id', flat=True))

    status_counts = courses_qs.aggregate(
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
    total_students = enrollments_qs.values('user_id').distinct().count()
    new_students_this_month = enrollments_qs.filter(enrollment_date__gte=month_start).count()

    earnings_qs = InstructorEarning.objects.filter(
        instructor=instructor, is_deleted=False
    )
    total_earnings = earnings_qs.aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    this_month_earnings = earnings_qs.filter(
        created_at__gte=month_start
    ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')

    reviews_qs = Review.objects.filter(
        course_id__in=course_ids, is_deleted=False, status='approved'
    )
    avg_rating = reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0
    total_reviews = reviews_qs.count()

    course_stats = []
    for course in courses_qs.order_by('-created_at'):
        c_enrollments = Enrollment.objects.filter(course=course, is_deleted=False)
        c_new = c_enrollments.filter(enrollment_date__gte=month_start).count()
        c_total = c_enrollments.count()
        c_completed = c_enrollments.filter(status='complete').count()
        c_completion_rate = round(c_completed / c_total * 100, 1) if c_total else 0
        c_reviews = Review.objects.filter(course=course, is_deleted=False, status='approved')
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
        'total_courses': courses_qs.count(),
        'published_courses': published_count,
        'draft_courses': draft_count,
        'pending_courses': status_counts['pending'],
        'rejected_courses': status_counts['rejected'],
        'archived_courses': status_counts['archived'],
        'total_students': total_students,
        'new_students_this_month': new_students_this_month,
        'total_earnings': float(total_earnings),
        'this_month_earnings': float(this_month_earnings),
        'average_rating': round(float(avg_rating), 2),
        'total_reviews': total_reviews,
        'course_stats': course_stats,
    }


def get_course_analytics(instructor, course_id):
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from learning_progress.models import LearningProgress
    from payments.models import Payment
    from instructor_earnings.models import InstructorEarning as _IE

    try:
        course = Course.objects.get(id=course_id, instructor=instructor, is_deleted=False)
    except Course.DoesNotExist:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({"error": "Course not found or not owned by this instructor."})

    now = timezone.now()


    enrollment_trend = []
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
            created_at__gte=month_start, created_at__lt=month_end
        ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
        revenue_trend.append({
            'date': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
        })


    enrollments = Enrollment.objects.filter(course=course, is_deleted=False)
    not_started = enrollments.filter(progress=0).count()
    completed = enrollments.filter(status='complete').count()
    in_progress = enrollments.count() - not_started - completed


    from learning_progress.models import LearningProgress
    popular_lessons = (
        LearningProgress.objects
        .filter(course=course, is_deleted=False)
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
    total_revenue = earnings_qs.aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
    last_30_revenue = earnings_qs.filter(
        created_at__gte=last_30_start
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
            LearningProgress.objects
            .filter(course=course, is_deleted=False)
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


def get_instructor_analytics_timeseries(instructor, months=12):
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning
    from learning_progress.models import LearningProgress

    now = timezone.now()
    courses_qs = Course.objects.filter(instructor=instructor, is_deleted=False)
    course_ids = list(courses_qs.values_list('id', flat=True))

    revenue_trend = []
    enrollment_trend = []
    engagement_trend = []

    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        label = month_start.strftime('%Y-%m')


        rev = InstructorEarning.objects.filter(
            instructor=instructor, is_deleted=False,
            created_at__gte=month_start, created_at__lt=month_end
        ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
        revenue_trend.append({'date': label, 'revenue': float(rev)})


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
    for course in courses_qs.order_by('-total_students')[:5]:
        top_courses.append({
            'course_id': course.id,
            'title': course.title,
            'students': course.total_students or 0,
            'rating': float(course.rating or 0),
            'revenue': float(
                InstructorEarning.objects.filter(
                    course=course, instructor=instructor, is_deleted=False
                ).aggregate(t=Sum('net_amount'))['t'] or Decimal('0')
            ),
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
