from rest_framework import serializers
from .models import Lesson
from coursemodules.models import CourseModule

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id',
            'coursemodule',
            'title',
            'description',
            'content_type',
            'content',
            'video_url',
            'file_path',
            'duration',
            'is_free',
            'order',
            'status',
            'created_at',
            'updated_at',
        ]
    
    def validate_coursemodule(self, value):
        """Validate coursemodule exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Coursemodule is required.")
        
        try:
            coursemodule = CourseModule.objects.get(id=value.id, is_deleted=False)
        except CourseModule.DoesNotExist:
            raise serializers.ValidationError("Coursemodule does not exist or has been deleted.")
        
        return value
