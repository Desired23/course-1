"""
Instructor dashboard analytics services.
Provides stats for:
  - Overall dashboard summary
  - Per-course analytics (enrollment trend, revenue trend, student progress, rating distribution)
"""
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


def get_instructor_dashboard_stats(instructor):
    print(f"Calculating dashboard stats for instructor {instructor.id}...")
    """
    Returns overall dashboard stats for an instructor.
    """
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from qnas.models import QnA
    from instructor_earnings.models import InstructorEarning

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    courses_qs = Course.objects.filter(instructor=instructor, is_deleted=False)
    course_ids = list(courses_qs.values_list('id', flat=True))

    published_count = courses_qs.filter(status='published').count()
    draft_count = courses_qs.exclude(status='published').count()

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

    pending_questions = QnA.objects.filter(
        course_id__in=course_ids, is_deleted=False, status='unanswered'
    ).count()


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
        'total_students': total_students,
        'new_students_this_month': new_students_this_month,
        'total_earnings': float(total_earnings),
        'this_month_earnings': float(this_month_earnings),
        'average_rating': round(float(avg_rating), 2),
        'total_reviews': total_reviews,
        'pending_questions': pending_questions,
        'course_stats': course_stats,
    }


def get_course_analytics(instructor, course_id):
    """
    Detailed analytics for a single course owned by the instructor.
    """
    from courses.models import Course
    from enrollments.models import Enrollment
    from reviews.models import Review
    from learning_progress.models import LearningProgress
    from payments.models import Payment

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
    }


def get_instructor_analytics_timeseries(instructor, months=12):
    """
    Returns overall time-series data across all instructor courses.
    Used by InstructorAnalyticsPage for charts (revenue, enrollments, engagement by month).
    """
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
