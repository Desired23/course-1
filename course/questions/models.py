from django.db import models
from users.models import User


class Question(models.Model):
    STATUS_CHOICES = [
        ('open', 'open'),
        ('closed', 'closed'),
        ('duplicate', 'duplicate'),
        ('hidden', 'hidden'),
    ]

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='questions_author'
    )
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    views = models.IntegerField(default=0)
    score = models.IntegerField(default=0)
    answer_count = models.IntegerField(default=0)
    report_count = models.PositiveIntegerField(default=0)
    last_report_reason = models.TextField(null=True, blank=True)
    last_reported_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deleted_questions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Questions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Question {self.id}: {self.title}"
