from django.db import models
from enrollments.models import Enrollment
from lessons.models import Lesson

class QuizResult(models.Model):
    id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='quiz_result_enrollment')
    lesson = models.ForeignKey(Lesson, on_delete= models.CASCADE, related_name='quiz_result_lesson')
    start_time = models.DateTimeField(null=True, blank=True)
    submit_time = models.DateTimeField(null=True, blank=True)
    time_taken = models.IntegerField(null=True, blank=True)
    total_questions = models.IntegerField(null=True, blank=True)
    correct_answers = models.IntegerField(null=True, blank=True, db_column='corret_answers')
    total_points = models.IntegerField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    answers = models.JSONField(null=True, blank=True)
    passed = models.BooleanField(default=False)
    attempt = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_quiz_results')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'QuizResult'
        constraints = [
            models.UniqueConstraint(fields=['enrollment', 'lesson'], name='unique_quiz_result')
        ]

    def __str__(self):
        return f"QuizResult {self.id}: Enrollment {self.enrollment}, Lesson {self.lesson}"