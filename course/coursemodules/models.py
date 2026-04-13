from django.db import models
from courses.models import Course

class CourseModule(models.Model):
    MODULE_STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
    ]

    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, related_name='modules', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    order_number = models.IntegerField()
    duration = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=MODULE_STATUS_CHOICES, default='Draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_course_modules')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'CourseModules'

    def __str__(self):
        return f"{self.title} (Module {self.id})"