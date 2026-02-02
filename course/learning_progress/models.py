from django.db import models
from decimal import Decimal
from enrollments.models import Enrollment
from lessons.models import Lesson
from users.models import User
from courses.models import Course
class LearningProgress(models.Model):
    class StatusChoices(models.TextChoices):
        IN_PROGRESS = 'progress', 'progress'
        COMPLETED = 'completed', 'completed'
        PENDING = 'pending', 'pending'
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_progress_user')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='learning_progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='learning_progress_course')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='learning_progress_lesson')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))  
    last_accessed = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )
    start_time = models.DateTimeField(blank=True, null=True)
    completion_date = models.DateTimeField(blank=True, null=True)  
    time_spent = models.IntegerField(null=True, blank=True)  
    last_position = models.IntegerField(null=True, blank=True)  
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_learning_progress')
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'LearningProgress'
        constraints = [
            models.UniqueConstraint(fields=['user', 'lesson'], name='unique_user_lesson_progress')
        ]