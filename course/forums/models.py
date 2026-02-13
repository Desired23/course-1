from django.db import models
from users.models import User
from courses.models import Course

class Forum(models.Model):
    STATUS_CHOICES = [
    ('active', 'active'),
    ('archived', 'archived'),
    ('deleted', 'deleted'),
    ]

    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True, blank=True, related_name='forums_course')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forums_user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_forums')
    is_deleted = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='archived')

    class Meta:
        db_table = 'Forums'

    def __str__(self):
        return f"{self.title} (ID: {self.id}) - {self.user.id})"