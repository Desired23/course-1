from django.db import models
from decimal import Decimal
from users.models import User
from instructor_levels.models import InstructorLevel    

class Instructor(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, unique=True, related_name='instructor', null=True)
    bio = models.TextField(null=True, blank=True)
    specialization = models.CharField(max_length=255, null=True, blank=True)
    qualification = models.CharField(max_length=255, null=True, blank=True)
    experience = models.IntegerField(null=True, blank=True)

    social_links = models.JSONField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))

    total_students = models.IntegerField(default=0)
    total_courses = models.IntegerField(default=0)

    payment_info = models.JSONField(null=True, blank=True)
    level = models.ForeignKey(InstructorLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='instructors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_instructors')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'Instructors'

    def __str__(self):
        return f"Instructor {self.id} - {self.user.full_name} - {self.level.name if self.level else 'No Level'}"
