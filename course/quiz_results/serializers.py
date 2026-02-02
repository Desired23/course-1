from rest_framework import serializers
from .models import QuizResult
from enrollments.models import Enrollment
from lessons.models import Lesson

class QuizResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizResult
        fields = [
            'id',
            'Enrollment',
            'Lesson',
            'start_time',
            'submit_time',
            'time_taken',
            'total_questions',
            'corret_answers',
            'total_points',
            'score',
            'answers',
            'passed',
            'attempt'
        ]
        read_only_fields = [
            'id'
        ]
    
    def validate_enrollment(self, value):
        """Validate enrollment exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Enrollment is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Enrollment has been deleted.")
        return value
    
    def validate_lesson(self, value):
        """Validate lesson exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Lesson is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Lesson has been deleted.")
        return value 