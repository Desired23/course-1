"""
Admin system-wide dashboard analytics services.
"""
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from decimal import Decimal


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
    total_instructors = User.objects.filter(is_deleted=False, user_type='instructor').count()
    active_students = User.objects.filter(
        is_deleted=False, user_type='student', status='active'
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
    """Monthly revenue breakdown for the last N months."""
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
    """Monthly new user registrations."""
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
    """Top courses by enrollment + quick status summary."""
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
