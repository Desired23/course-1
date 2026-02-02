from rest_framework import serializers
from .models import QuizQuestion
from lessons.models import Lesson

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'lesson',
            'question_text',
            'question_type',
            'options',
            'correct_answer',
            'points',
            'explanation',
            'order_number',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at'
        ]
    
    def validate_lesson(self, value):
        """Validate lesson exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Lesson is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Lesson has been deleted.")
        return value
