from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from decimal import Decimal
from .models import LearningProgress
from .serializers import LearningProgressSerializer, CourseLearningProgressSerializer
from enrollments.models import Enrollment
from lessons.models import Lesson

from courses.models import Course
from users.models import User

def update_learning_progress(user_id, lesson_id, progress_data):
    """
    POST /api/learning-progress/update/
    Update or create learning progress for a user's lesson
    """
    try:
        user = User.objects.get(id=user_id)
        lesson = Lesson.objects.select_related('coursemodule__course').get(id=lesson_id)
        course = lesson.coursemodule.course if lesson.coursemodule else None  # type: ignore
        
        if not course:
            raise ValidationError({"lesson_id": "Lesson does not belong to any course."})
        
        enrollment = Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
        if not enrollment:
            raise ValidationError({"enrollment": "User is not enrolled in the course."})

        learning_progress, created = LearningProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'enrollment': enrollment,
                'course': course,
                'progress_percentage': Decimal(str(progress_data.get('progress_percentage', 0))),
                'time_spent': progress_data.get('time_spent', 0),
                'is_completed': progress_data.get('is_completed', False),
                'last_position': progress_data.get('last_position'),
                'notes': progress_data.get('notes'),
                'start_time': timezone.now()
            }
        )
        
        if not created:
            learning_progress.enrollment = enrollment
            learning_progress.course = course
            # Update existing record
            learning_progress.progress_percentage = Decimal(str(progress_data.get('progress_percentage', learning_progress.progress_percentage)))
            learning_progress.time_spent = progress_data.get('time_spent', learning_progress.time_spent)
            learning_progress.is_completed = progress_data.get('is_completed', learning_progress.is_completed)
            learning_progress.last_position = progress_data.get('last_position', learning_progress.last_position)
            if 'notes' in progress_data:
                learning_progress.notes = progress_data.get('notes')
            
            # Set completion date if just completed
            if learning_progress.is_completed and not learning_progress.completion_date:
                learning_progress.completion_date = timezone.now()
            
            learning_progress.last_accessed = timezone.now()
            learning_progress.save()
        
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
        course = lesson.coursemodule.course if lesson.coursemodule else None  # type: ignore
        enrollment =  Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
        if not enrollment:
            raise ValidationError({"enrollment": "User is not enrolled in the course."})
        if not course:
            raise ValidationError({"lesson_id": "Lesson does not belong to any course."})
        learning_progress, created = LearningProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={
                'enrollment': enrollment,
                'course': course,
                'progress_percentage': Decimal(str(progress_data.get('progress_percentage', 0))),
                'time_spent': progress_data.get('time_spent', 0),
                'is_completed': progress_data.get('is_completed', False),
                'last_position': progress_data.get('last_position'),
                'notes': progress_data.get('notes'),
                'start_time': timezone.now()
            }
        )
        if not created:
            learning_progress.enrollment = enrollment
            learning_progress.course = course
            learning_progress.progress_percentage = Decimal(str(progress_data.get('progress_percentage', learning_progress.progress_percentage)))
            learning_progress.time_spent = progress_data.get('time_spent', learning_progress.time_spent)
            learning_progress.is_completed = progress_data.get('is_completed', learning_progress.is_completed)
            learning_progress.last_position = progress_data.get('last_position', learning_progress.last_position)
            if 'notes' in progress_data:
                learning_progress.notes = progress_data.get('notes')
            if learning_progress.is_completed and not learning_progress.completion_date:
                learning_progress.completion_date = timezone.now()
            learning_progress.last_accessed = timezone.now()
            learning_progress.save()
        return LearningProgressSerializer(learning_progress).data
    except User.DoesNotExist:
        raise ValidationError({"user_id": "User not found."})
    except Lesson.DoesNotExist:
        raise ValidationError({"lesson_id": "Lesson not found."})

def get_course_progress(user_id, course_id):

    try:
        user = User.objects.get(id=user_id)
        course = Course.objects.get(id=course_id)
        
        # Count total lessons in course (1 query)
        from coursemodules.models import CourseModule
        from django.db.models import Count as CountFunc
        total_lessons = Lesson.objects.filter(
            coursemodule__course=course, 
            coursemodule__is_deleted=False,
            is_deleted=False
        ).count()
        
        if total_lessons == 0:
            raise ValidationError({"course_id": "Course has no lessons."})
        
        # Get ALL progress data + aggregates in 1 query
        stats = LearningProgress.objects.filter(
            user=user,
            course=course,
            is_deleted=False
        ).aggregate(
            total_time=Sum('time_spent', default=0),
            avg_progress=Avg('progress_percentage', default=Decimal('0.00')),
            completed_count=CountFunc('id', filter=Q(is_completed=True))
        )
        
        # Get lesson-level progress (1 query)
        progresses = list(LearningProgress.objects.filter(
            user=user,
            course=course,
            is_deleted=False
        ).values(
            'lesson_id', 
            'progress_percentage', 
            'is_completed',
            'last_position',
            'last_accessed',
            'notes',
        ).order_by('lesson_id'))
        
        # Format lesson data (no extra queries)
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
            'overall_progress': float(stats['avg_progress'] or Decimal('0.00')),
            'total_lessons': total_lessons,
            'completed_lessons': stats['completed_count'] or 0,
            'total_time_spent': int(stats['total_time'] or 0),
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
    """
    GET /api/students/my-stats/
    Returns aggregated learning statistics for the authenticated student.
    """
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

    # Total time spent (seconds) across all learning progress records
    total_time_spent = LearningProgress.objects.filter(
        user=user, is_deleted=False
    ).aggregate(t=Sum('time_spent'))['t'] or 0

    # Certificates
    certificates_earned = Certificate.objects.filter(user=user, is_deleted=False, revoked=False).count()

    # Quiz stats
    quiz_results = QuizResult.objects.filter(
        enrollment__user=user, is_deleted=False
    )
    total_quizzes = quiz_results.count()
    avg_quiz_score = quiz_results.aggregate(avg=Avg('score'))['avg'] or 0

    # Recent activity — last 10 completed lessons
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

    # Learning streak: count consecutive days with learning activity ending today
    # Single query to get all distinct activity dates in the last 90 days
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
