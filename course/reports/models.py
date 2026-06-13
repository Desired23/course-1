from django.db import models
from users.models import User


class Report(models.Model):
    class TargetType(models.TextChoices):
        REVIEW = 'review', 'review'
        QUESTION = 'question', 'question'
        ANSWER = 'answer', 'answer'
        BLOG_POST = 'blog_post', 'blog_post'
        BLOG_COMMENT = 'blog_comment', 'blog_comment'
        LESSON_COMMENT = 'lesson_comment', 'lesson_comment'
        COURSE = 'course', 'course'
        MESSAGE = 'message', 'message'

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        OFFENSIVE = 'offensive', 'Nội dung phản cảm'
        HARASSMENT = 'harassment', 'Quấy rối / bắt nạt'
        COPYRIGHT = 'copyright', 'Vi phạm bản quyền'
        MISINFORMATION = 'misinformation', 'Thông tin sai lệch'
        OTHER = 'other', 'Khác'

    class Status(models.TextChoices):
        PENDING = 'pending', 'pending'
        REVIEWING = 'reviewing', 'reviewing'
        RESOLVED = 'resolved', 'resolved'
        DISMISSED = 'dismissed', 'dismissed'

    reporter = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reports_made'
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.IntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices, default=Reason.OTHER)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    resolved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reports_resolved'
    )
    action_taken = models.CharField(max_length=20, blank=True)
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id', 'status']),
            models.Index(fields=['reporter', 'target_type', 'target_id']),
        ]

    def __str__(self):
        return f"Report #{self.id} on {self.target_type}:{self.target_id} by user {self.reporter_id}"
