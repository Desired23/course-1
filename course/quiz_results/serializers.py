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


class QuizAnswerResultSerializer(serializers.Serializer):
    """Serializer for individual answer result"""
    question_id = serializers.IntegerField()
    selected_option_id = serializers.IntegerField(allow_null=True)
    text_answer = serializers.CharField(allow_null=True, allow_blank=True)
    is_correct = serializers.BooleanField()
    points_earned = serializers.DecimalField(max_digits=5, decimal_places=2)
    correct_answer_explanation = serializers.CharField(allow_blank=True)


class QuizResultDetailSerializer(serializers.Serializer):
    """Serializer for quiz result detail response"""
    quiz_result_id = serializers.IntegerField()
    quiz_id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_points = serializers.DecimalField(max_digits=5, decimal_places=2)
    earned_points = serializers.DecimalField(max_digits=5, decimal_places=2)
    passing_score = serializers.IntegerField()
    passed = serializers.BooleanField()
    time_spent = serializers.IntegerField()
    submitted_at = serializers.DateTimeField()
    answers = QuizAnswerResultSerializer(many=True, required=False)


class UserQuizHistorySerializer(serializers.Serializer):
    """Serializer for user quiz history"""
    quiz_result_id = serializers.IntegerField()
    lesson_id = serializers.IntegerField()
    lesson_title = serializers.CharField()
    course_title = serializers.CharField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    passed = serializers.BooleanField()
    attempt = serializers.IntegerField()
    submitted_at = serializers.DateTimeField()
    time_spent = serializers.IntegerField() 