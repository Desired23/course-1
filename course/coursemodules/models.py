from django.db import models
from courses.models import Course

class CourseModule(models.Model):
    MODULE_STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
    ]

    module_id = models.AutoField(primary_key=True)
    course_id = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')  # CourseID
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    order_number = models.IntegerField()
    duration = models.IntegerField(null=True, blank=True)  # Thời lượng tính bằng phút
    status = models.CharField(max_length=10, choices=MODULE_STATUS_CHOICES, default='Draft')
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'CourseModules'

    def __str__(self):
        return f"{self.title} (Module {self.module_id})"