from rest_framework import serializers
from rest_framework.reverse import reverse

from .models import LessonAttachment


class LessonAttachmentSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_id = serializers.IntegerField(source='lesson.coursemodule.course.id', read_only=True)
    course_title = serializers.CharField(source='lesson.coursemodule.course.title', read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = LessonAttachment
        fields = [
            'id',
            'lesson',
            'lesson_title',
            'course_id',
            'course_title',
            'title',
            'file_path',
            'file_type',
            'file_size',
            'download_count',
            'download_url',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'download_count']

    def get_download_url(self, obj):
        request = self.context.get('request')
        return reverse('lesson-attachment-download', kwargs={'attachment_id': obj.id}, request=request)
