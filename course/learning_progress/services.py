from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .models import LearningProgress
from .serializers import LearningProgressSerializer
from enrollments.models import Enrollment
from lessons.models import Lesson
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import LearningProgress
from .serializers import LearningProgressSerializer

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.db.models import Avg
from .models import LearningProgress, Enrollment
from .serializers import LearningProgressSerializer

def update_learning_progress(enrollment_id, lesson_id, progress_data):
    try:
        with transaction.atomic(): 
            print(f"Updating learning progress for enrollment_id: {enrollment_id}, lesson_id: {lesson_id}, progress_data: {progress_data}")
            enrollment = Enrollment.objects.get(pk=enrollment_id)
            lesson = Lesson.objects.get(pk=lesson_id)
            learning_progress, created = LearningProgress.objects.get_or_create(
                enrollment_id=enrollment,
                lesson_id=lesson,
                defaults={
                    'progress': progress_data['progress'],
                    'status': progress_data['status'],
                    'start_time': timezone.now(),
                    'last_accessed': timezone.now()
                }
            )

            if not created:
                learning_progress.status = progress_data.get('status', learning_progress.status)
                learning_progress.progress = progress_data.get('progress', learning_progress.progress)
                learning_progress.last_position = progress_data.get('last_position', learning_progress.last_position)
                learning_progress.time_spent = progress_data.get('time_spent', learning_progress.time_spent)
                learning_progress.notes = progress_data.get('notes', learning_progress.notes)
                learning_progress.last_accessed = timezone.now()
                if learning_progress.status == LearningProgress.StatusChoices.COMPLETED:
                    learning_progress.completion_time = timezone.now()
                else:
                    learning_progress.completion_time = None
                learning_progress.save()

            # Tính lại % hoàn thành toàn khóa
            overall_progress = LearningProgress.objects.filter(
                enrollment_id=enrollment_id
            ).aggregate(avg=Avg('progress'))['avg'] or 0

            # Cập nhật vào Enrollment
            enrollment.progress = overall_progress
            enrollment.save()

        return LearningProgressSerializer(learning_progress).data

    except Exception as e:
        raise ValidationError(f"Error updating learning progress: {str(e)}")


def get_learning_progress(data):
    try:
        learning_progress = LearningProgress.objects.get(
            enrollment_id=data.enrollment_id,
            lesson_id=data.lesson_id
        )
        return LearningProgressSerializer(learning_progress).data
    except LearningProgress.DoesNotExist:
        raise ValidationError("Learning progress not found.")
    except Exception as e:
        raise ValidationError(f"An error occurred: {str(e)}")
def get_all_learning_progress_by_enrollment(enrollment_id):
    try:
        learning_progress = LearningProgress.objects.filter(enrollment_id=enrollment_id)
        return LearningProgressSerializer(learning_progress, many=True).data
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

