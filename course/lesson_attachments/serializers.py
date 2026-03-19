from rest_framework import serializers
from .models import LessonAttachment


class LessonAttachmentSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_id = serializers.IntegerField(source='lesson.coursemodule.course.id', read_only=True)
    course_title = serializers.CharField(source='lesson.coursemodule.course.title', read_only=True)

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
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'download_count']
