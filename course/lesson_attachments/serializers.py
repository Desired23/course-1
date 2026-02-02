from rest_framework import serializers
from .models import LessonAttachment

class LessonAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonAttachment
        fields = [
            'id',  # Tương ứng với AttachmentID
            'lesson',      # Tương ứng với LessonID (ForeignKey)
            'title',
            'file_path',
            'file_type',
            'file_size',
            'download_count',
            'created_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'download_count'
        ]