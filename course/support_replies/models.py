from django.db import models
from users.models import User
from admins.models import Admin
from supports.models import Support

class SupportReply(models.Model):
    id = models.AutoField(primary_key=True)
    support = models.ForeignKey(Support, on_delete=models.CASCADE, related_name='replies')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_replies')
    admin = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_replies')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_support_replies')
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f'Reply by {self.id} to {self.message} at {self.created_at}'