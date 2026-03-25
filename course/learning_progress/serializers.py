from rest_framework import serializers
from .models import LearningProgress
from courses.models import Course
from lessons.models import Lesson

class LearningProgressSerializer(serializers.ModelSerializer):
    progress_id = serializers.IntegerField(source='id', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    lesson_id = serializers.IntegerField(source='lesson.id', read_only=True)
    course_id = serializers.IntegerField(source='course.id', read_only=True)
    last_access_date = serializers.DateTimeField(source='last_accessed', read_only=True)
    notes = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    
    class Meta:
        model = LearningProgress
        fields = [
            'progress_id',
            'user_id',
            'lesson_id',
            'course_id',
            'progress_percentage',
            'time_spent',
            'is_completed',
            'last_position',
            'notes',
            'last_access_date',
            'completion_date'
        ]
        read_only_fields = ['id', 'user', 'last_accessed']
    
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

class CourseLearningProgressSerializer(serializers.Serializer):
    """Serializer for course-level learning progress summary"""
    course_id = serializers.IntegerField()
    overall_progress = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    total_time_spent = serializers.IntegerField()
    lessons = LearningProgressSerializer(many=True)
