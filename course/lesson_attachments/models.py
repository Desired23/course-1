from django.db import models
from lessons.models import Lesson

class LessonAttachment(models.Model):
    id = models.AutoField(primary_key=True)
    lesson = models.ForeignKey(Lesson,on_delete=models.CASCADE,related_name='attachments', null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    file_path = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, null=True, blank=True)
    file_size = models.IntegerField(null=True, blank=True)
    download_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_lesson_attachments')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'LessonAttachments'

    def __str__(self):
        return self.title or f'Attachment {self.id}'
