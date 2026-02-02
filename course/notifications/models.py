from django.db import models
from users.models import User


class Notification(models.Model):
    class TypeChoise( models.TextChoices):
        SYSTEM = 'system'
        COURSE = 'course'
        PAYMENT = 'payment'
        PROMOTION = 'promotion'
        OTHER = 'other'
    title = models.CharField(max_length=255)
    id = models.AutoField(primary_key=True)
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')  # Ai gửi/tạo thông báo
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_notifications')  # Gửi cho ai
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_notifications')
    is_deleted = models.BooleanField(default=False)
    type = models.CharField(
        max_length=10,
        choices=TypeChoise.choices,
        default=TypeChoise.SYSTEM
    )
    notification_code = models.CharField(max_length=255, blank=True, null=True)
    related_id = models.IntegerField(blank=True, null=True)
    def __str__(self):
        return f"Notification for {self.notification_code}: {self.title[:20]}..."

