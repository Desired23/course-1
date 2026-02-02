from rest_framework import serializers
from .models import Review
from courses.models import Course
from users.models import User


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'id',
            'course',
            'user',
            'rating',
            'comment',
            'created_at',
            'updated_at',
            'status',
            'likes',
            'report_count',
            'instructor_response',
            'response_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'likes', 'report_count', 'response_at']
    
    def validate_course(self, value):
        """Validate course exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value
    
    def validate_user(self, value):
        """Validate user exists"""
        if value is None:
            raise serializers.ValidationError("User is required.")
        return value