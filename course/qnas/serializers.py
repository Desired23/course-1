from rest_framework import serializers
from .models import QnA
from courses.models import Course
from lessons.models import Lesson
from users.models import User

class QnASerializer(serializers.ModelSerializer):
    class Meta:
        model = QnA
        fields = [
            'id',
            'course',
            'lesson',
            'question',
            'user',
            'created_at',
            'status',
            'views'
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True}
        }
    
    def validate_course(self, value):
        """Validate course exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value
    
    def validate_lesson(self, value):
        """Validate lesson exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Lesson is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Lesson has been deleted.")
        return value
    
    def validate_user(self, value):
        """Validate user exists"""
        if value is None:
            raise serializers.ValidationError("User is required.")
        return value