from django.db import models
from users.models import User

class Admin(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin', null=True, unique=True)
    department = models.CharField(max_length=100)
    role = models.CharField(max_length=100, default='none')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_admins')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'Admin'

    def __str__(self):
        return f"{self.user.username} - {self.role} ({self.id})"