from rest_framework import serializers
from .models import Review
from courses.models import Course
from users.models import User


class ReviewUserSerializer(serializers.Serializer):
    """Nested user summary inside review response."""
    user_id = serializers.IntegerField(source='id')
    full_name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True)


class ReviewSerializer(serializers.ModelSerializer):
    """Review with nested user info for public list endpoints."""
    review_id = serializers.IntegerField(source='id', read_only=True)
    user_info = ReviewUserSerializer(source='user', read_only=True)
    review_date = serializers.DateTimeField(source='created_at', read_only=True)
    updated_date = serializers.DateTimeField(source='updated_at', read_only=True)
    response_date = serializers.DateTimeField(source='response_at', read_only=True)

    class Meta:
        model = Review
        fields = [
            'review_id',
            'course',
            'user',
            'user_info',
            'rating',
            'comment',
            'review_date',
            'updated_date',
            'status',
            'likes',
            'report_count',
            'instructor_response',
            'response_date',
        ]
        read_only_fields = ['review_id', 'review_date', 'updated_date', 'likes', 'report_count', 'response_date']

    def validate_course(self, value):
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value

    def validate_user(self, value):
        if value is None:
            raise serializers.ValidationError("User is required.")
        return value