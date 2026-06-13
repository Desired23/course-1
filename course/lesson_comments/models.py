from django.db import models
from users.models import User
from lessons.models import Lesson


class LessonComment(models.Model):
    STATUS_CHOICES = [
        ('active', 'active'),
        ('deleted', 'deleted'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_comments')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='comments')
    parent_comment = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    content = models.TextField()
    votes = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_lesson_comments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'LessonComments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment {self.id} by User {self.user.id} on Lesson {self.lesson.id}"