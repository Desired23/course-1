from django.db import models
from admins.models import Admin

class SystemsSetting(models.Model):
    id = models.AutoField(primary_key=True)
    setting_group = models.CharField(max_length=100)
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.TextField()
    description = models.CharField(max_length=255)
    admin = models.ForeignKey(Admin, on_delete=models.SET_NULL, related_name='settings_admin', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_system_settings')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'SystemsSettings'

    def __str__(self):
        return f"{self.setting_key} = {self.setting_value}"