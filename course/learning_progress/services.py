from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import LearningProgress
from .serializers import LearningProgressSerializer, CourseLearningProgressSerializer
from enrollments.models import Enrollment
from lessons.models import Lesson


def _broadcast_progress(user_id, data):
    channel_layer = get_channel_layer()
    if not channel_layer or not user_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"user_progress_{user_id}",
        {"type": "send_progress_update", "data": data},
    )

from courses.models import Course
from users.models import User


def _active_course_lessons(course):
    return Lesson.objects.filter(
        coursemodule__course=course,
        coursemodule__is_deleted=False,
        is_deleted=False
    )


def _course_progress_stats(user, course):
    total_lessons = _active_course_lessons(course).count()
    completed_lessons = LearningProgress.objects.filter(
        user=user,
        course=course,
        is_completed=True,
        is_deleted=False,
        lesson__is_deleted=False,
        lesson__coursemodule__is_deleted=False,
    ).count()
    total_time_spent = LearningProgress.objects.filter(
        user=user,
        course=course,
        is_deleted=False,
    ).aggregate(total_time=Sum('time_spent', default=0))['total_time'] or 0
    overall_progress = Decimal('0.00')
    if total_lessons > 0:
        overall_progress = (
            Decimal(completed_lessons) * Decimal('100') / Decimal(total_lessons)
        ).quantize(Decimal('0.01'))
    return {
        'total_lessons': total_lessons,
        'completed_lessons': completed_lessons,
        'total_time_spent': int(total_time_spent),
        'overall_progress': overall_progress,
    }


def _sync_enrollment_progress(enrollment, user, course):
    stats = _course_progress_stats(user, course)
    now = timezone.now()
    enrollment.progress = stats['overall_progress']
    enrollment.last_access_date = now
    is_fully_complete = stats['total_lessons'] > 0 and stats['completed_lessons'] >= stats['total_lessons']
    if is_fully_complete and (not course.certificate or enrollment.status == Enrollment.Status.Complete):
        enrollment.status = Enrollment.Status.Complete
        if not enrollment.completion_date:
            enrollment.completion_date = now
    elif not is_fully_complete and enrollment.status == Enrollment.Status.Complete and not course.certificate:
        enrollment.status = Enrollment.Status.Active
        enrollment.completion_date = None
    enrollment.save(update_fields=['progress', 'last_access_date', 'status', 'completion_date', 'updated_at'])
    return stats


def _apply_progress_data(learning_progress, progress_data):
    if 'progress_percentage' in progress_data:
        learning_progress.progress_percentage = Decimal(str(progress_data.get('progress_percentage')))
    if 'time_spent' in progress_data:
        learning_progress.time_spent = progress_data.get('time_spent')
    if 'is_completed' in progress_data:
        learning_progress.is_completed = progress_data.get('is_completed')
    if 'last_position' in progress_data:
        learning_progress.last_position = progress_data.get('last_position')
    if 'notes' in progress_data:
        learning_progress.notes = progress_data.get('notes')

    if learning_progress.is_completed:
        learning_progress.progress_percentage = Decimal('100.00')
        learning_progress.status = LearningProgress.StatusChoices.COMPLETED
        if not learning_progress.completion_date:
            learning_progress.completion_date = timezone.now()
    else:
        if learning_progress.progress_percentage > 0:
            learning_progress.status = LearningProgress.StatusChoices.IN_PROGRESS
        else:
            learning_progress.status = LearningProgress.StatusChoices.PENDING
        learning_progress.completion_date = None
    learning_progress.last_accessed = timezone.now()

def update_learning_progress(user_id, lesson_id, progress_data):
    try:
        user = User.objects.get(id=user_id)
        lesson = Lesson.objects.select_related('coursemodule__course').get(id=lesson_id)
        course = lesson.coursemodule.course if lesson.coursemodule else None

        if not course:
            raise ValidationError({"lesson_id": "Lesson does not belong to any course."})

        enrollment = Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
        if not enrollment:
            raise ValidationError({"enrollment": "User is not enrolled in the course."})

        learning_progress, _created = LearningProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'enrollment': enrollment,
                'course': course,
                'start_time': timezone.now()
            }
        )

        learning_progress.enrollment = enrollment
        learning_progress.course = course
        _apply_progress_data(learning_progress, progress_data)
        learning_progress.save()
        _sync_enrollment_progress(enrollment, user, course)

        return LearningProgressSerializer(learning_progress).data

    except User.DoesNotExist:
        raise ValidationError({"user_id": "User not found."})
    except Lesson.DoesNotExist:
        raise ValidationError({"lesson_id": "Lesson not found."})
    except Exception as e:
        raise ValidationError(f"Error updating learning progress: {str(e)}")

def update_lesson_progress(lesson_id, user_id, progress_data):
    try:
        user = User.objects.get(id=user_id)
        lesson = Lesson.objects.select_related('coursemodule__course').get(id=lesson_id)
        course = lesson.coursemodule.course if lesson.coursemodule else None
        enrollment =  Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
        if not enrollment:
            raise ValidationError({"enrollment": "User is not enrolled in the course."})
        if not course:
            raise ValidationError({"lesson_id": "Lesson does not belong to any course."})
        learning_progress, _created = LearningProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'enrollment': enrollment,
                'course': course,
                'start_time': timezone.now()
            }
        )
        learning_progress.enrollment = enrollment
        learning_progress.course = course
        _apply_progress_data(learning_progress, progress_data)
        learning_progress.save()
        progress_stats = _sync_enrollment_progress(enrollment, user, course)
        data = LearningProgressSerializer(learning_progress).data
        _broadcast_progress(user_id, {
            'lesson_id': lesson_id,
            'course_id': learning_progress.course_id,
            'progress_percentage': float(learning_progress.progress_percentage),
            'is_completed': learning_progress.is_completed,
            'last_position': learning_progress.last_position,
            'overall_progress': float(progress_stats['overall_progress']),
            'completed_lessons': progress_stats['completed_lessons'],
            'total_lessons': progress_stats['total_lessons'],
        })
        return data
    except User.DoesNotExist:
        raise ValidationError({"user_id": "User not found."})
    except Lesson.DoesNotExist:
        raise ValidationError({"lesson_id": "Lesson not found."})

def get_course_progress(user_id, course_id):

    try:
        user = User.objects.get(id=user_id)
        course = Course.objects.get(id=course_id)


        stats = _course_progress_stats(user, course)
        total_lessons = stats['total_lessons']

        if total_lessons == 0:
            raise ValidationError({"course_id": "Course has no lessons."})


        progresses = list(LearningProgress.objects.filter(
            user=user,
            course=course,
            is_deleted=False,
            lesson__is_deleted=False,
            lesson__coursemodule__is_deleted=False,
        ).values(
            'lesson_id',
            'progress_percentage',
            'is_completed',
            'last_position',
            'last_accessed',
            'notes',
        ).order_by('lesson_id'))


        lesson_data = [
            {
                'lesson_id': p['lesson_id'],
                'progress_percentage': p['progress_percentage'],
                'is_completed': p['is_completed'],
                'last_position': p['last_position'],
                'last_access_date': p['last_accessed'],
                'notes': p['notes'],
            }
            for p in progresses
        ]

        result = {
            'course_id': course_id,
            'overall_progress': float(stats['overall_progress']),
            'total_lessons': total_lessons,
            'completed_lessons': stats['completed_lessons'],
            'total_time_spent': stats['total_time_spent'],
            'lessons': lesson_data
        }

        return result

    except User.DoesNotExist:
        raise ValidationError({"user_id": "User not found."})
    except Course.DoesNotExist:
        raise ValidationError({"course_id": "Course not found."})
    except Exception as e:
        raise ValidationError(f"Error retrieving course progress: {str(e)}")
def get_learning_progress(data):
    try:
        enrollment_id = data.get('enrollment_id') if isinstance(data, dict) else getattr(data, 'enrollment_id', None)
        lesson_id = data.get('lesson_id') if isinstance(data, dict) else getattr(data, 'lesson_id', None)
        learning_progress = LearningProgress.objects.get(
            enrollment=enrollment_id,
            lesson=lesson_id
        )
        return LearningProgressSerializer(learning_progress).data
    except LearningProgress.DoesNotExist:
        raise ValidationError("Learning progress not found.")
    except Exception as e:
        raise ValidationError(f"An error occurred: {str(e)}")
def get_all_learning_progress_by_enrollment(enrollment_id):
    try:
        learning_progress = LearningProgress.objects.filter(enrollment=enrollment_id)
        return learning_progress
    except Exception as e:
        raise ValidationError(f"An error occurred: {str(e)}")
def delete_learning_progress(enrollment_id, lesson_id):
    try:
        learning_progress = LearningProgress.objects.get(
            enrollment_id=enrollment_id,
            lesson_id=lesson_id
        )
        learning_progress.delete()
        return {"message": "Learning progress deleted successfully."}
    except LearningProgress.DoesNotExist:
        raise ValidationError("Learning progress not found.")
    except Exception as e:
        raise ValidationError(f"An error occurred: {str(e)}")


def get_student_stats(user):
    from enrollments.models import Enrollment
    from certificates.models import Certificate
    from quiz_results.models import QuizResult
    from activity_logs.models import ActivityLog
    from django.db.models import Avg, Sum, Count
    from django.utils import timezone
    from datetime import timedelta

    enrollments = Enrollment.objects.filter(user=user, is_deleted=False)
    total_enrolled = enrollments.count()
    courses_completed = enrollments.filter(status='complete').count()
    courses_in_progress = enrollments.filter(status='active').exclude(progress=0).count()


    total_time_spent = LearningProgress.objects.filter(
        user=user, is_deleted=False
    ).aggregate(t=Sum('time_spent'))['t'] or 0


    certificates_earned = Certificate.objects.filter(user=user, is_deleted=False, revoked=False).count()


    quiz_results = QuizResult.objects.filter(
        enrollment__user=user, is_deleted=False
    )
    total_quizzes = quiz_results.count()
    avg_quiz_score = quiz_results.aggregate(avg=Avg('score'))['avg'] or 0


    recent_lp = LearningProgress.objects.filter(
        user=user, is_deleted=False, is_completed=True
    ).select_related('course', 'lesson').order_by('-last_accessed')[:10]

    recent_activity = [
        {
            'activity_type': 'lesson_completed',
            'course_title': lp.course.title if lp.course else None,
            'lesson_title': lp.lesson.title if lp.lesson else None,
            'timestamp': lp.last_accessed,
        }
        for lp in recent_lp
    ]



    today = timezone.now().date()
    cutoff = today - timedelta(days=90)
    activity_dates = set(
        LearningProgress.objects.filter(
            user=user,
            is_deleted=False,
            last_accessed__date__gte=cutoff,
        ).values_list('last_accessed__date', flat=True).distinct()
    )

    streak_days = 0
    check_date = today
    while check_date in activity_dates:
        streak_days += 1
        check_date -= timedelta(days=1)

    return {
        'total_courses_enrolled': total_enrolled,
        'courses_in_progress': courses_in_progress,
        'courses_completed': courses_completed,
        'total_time_spent': total_time_spent,
        'certificates_earned': certificates_earned,
        'total_quizzes_taken': total_quizzes,
        'average_quiz_score': round(float(avg_quiz_score), 1),
        'recent_activity': recent_activity,
        'learning_streak': {
            'current_streak': streak_days,
        },
    }
