from django.db import models
from courses.models import Course
from lessons.models import Lesson
from enrollments.models import Enrollment
from users.models import User

class QnA(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        ANSWERED = 'Answered', 'Answered'
        CLOSED = 'Closed', 'Closed'

    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='qna_course')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='qna_lesson')
    question = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qna_user', db_column='user_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_qnas')
    is_deleted = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    views = models.IntegerField(default=0)

    class Meta:
        db_table = 'QnA'


    def __str__(self):
        return f"QnA #{self.id}: Student {self.user.id}"
