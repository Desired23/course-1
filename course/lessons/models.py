from django.db import models
from coursemodules.models import CourseModule

class Lesson(models.Model):
    class ContentType(models.TextChoices):
        VIDEO = 'video'
        TEXT = 'text'
        QUIZ = 'quiz'
        CODE = 'code'
        ASSIGNMENT = 'assignment'
        FILE = 'file'
        LINK = 'link'

    class Status(models.TextChoices):
        DRAFT = 'draft'
        PUBLISHED = 'published'

    id = models.AutoField(primary_key=True)
    coursemodule = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='lessons')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    content = models.TextField(blank=True, null=True)
    video_url = models.CharField(max_length=255, blank=True, null=True)
    video_public_id = models.CharField(max_length=500, blank=True, null=True)
    file_path = models.CharField(max_length=255, blank=True, null=True)
    duration = models.IntegerField(blank=True, null=True)
    is_free = models.BooleanField(default=False)
    order = models.IntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_lessons')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Lesson {self.id}  Lesson {self.title}"
