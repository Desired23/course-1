from django.db import models
from users.models import User
import uuid
class ActivityLog(models.Model):
    ACTION_CHOICES = [
    (item, item.replace("_", " ").title()) for item in [
        "LOGIN", "LOGOUT", "FAILED_LOGIN", "REGISTER", "EMAIL_VERIFIED", "PASSWORD_CHANGED", "PROFILE_UPDATED",
        "CREATE", "UPDATE", "DELETE",
        "PAYMENT_INITIATED", "PAYMENT_SUCCESS", "PAYMENT_FAILED",
        "REFUND_REQUESTED", "REFUND_APPROVED", "REFUND_REJECTED",
        "ENROLL", "VIEW_LESSON",
        "COMMENT", "REPLY", "LIKE_COMMENT", "DISLIKE_COMMENT", "REPORT_COMMENT",
        "COURSE_APPROVED", "COURSE_REJECTED", "USER_BANNED", "USER_UNBANNED", "EMAIL_SENT", "SYSTEM_CONFIGURED","OTHER"
        ]
]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField(null=True, blank=True)
    entity_type = models.CharField(max_length=100, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    trace_id = models.UUIDField(max_length=100, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    class Meta:
        db_table = 'activity_logs'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    def __str__(self):
        return f"ActivityLog {self.id} by User {self.user.id if self.user else 'Unknown'} - Action: {self.action}"