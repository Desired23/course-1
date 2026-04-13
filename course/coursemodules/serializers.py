from rest_framework import serializers
from .models import CourseModule

class CourseModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = [
            'id',
            'course',
            'title',
            'description',
            'order_number',
            'duration',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at'
        ]