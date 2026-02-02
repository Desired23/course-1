from django.db import models
from decimal import Decimal

class InstructorLevel(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)  # Ví dụ: Bronze, Silver, Gold
    description = models.TextField(blank=True, null=True)
    min_students = models.IntegerField(default=0)  # Hoặc doanh thu tối thiểu
    min_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_instructor_levels')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'InstructorLevels'

    def __str__(self):
        return f"{self.name} ({self.commission_rate}%)"
