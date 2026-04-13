from rest_framework import serializers
from .models import QuizQuestion, QuizTestCase
from lessons.models import Lesson
from utils.input_validators import (
    MAX_ACTUAL_OUTPUT_LENGTH,
    MAX_CODE_ANSWER_LENGTH,
)

class QuizTestCaseSerializer(serializers.ModelSerializer):
    """Serializer for quiz test cases (code questions)"""
    class Meta:
        model = QuizTestCase
        fields = [
            'id',
            'question',
            'input_data',
            'expected_output',
            'is_hidden',
            'points',
            'order_number'
        ]
        read_only_fields = ['id']


class QuizTestCaseForStudentSerializer(serializers.ModelSerializer):
    """Serializer for test cases visible to students (excludes expected_output for hidden cases)"""
    class Meta:
        model = QuizTestCase
        fields = [
            'id',
            'input_data',
            'expected_output',
            'is_hidden',
            'points',
            'order_number'
        ]
        read_only_fields = ['id']

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.is_hidden:
            data.pop('expected_output', None)
        return data


class QuizQuestionSerializer(serializers.ModelSerializer):
    test_cases = QuizTestCaseSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'lesson',
            'question_text',
            'question_type',
            'difficulty',
            'options',
            'correct_answer',
            'points',
            'explanation',
            'order_number',
            'description',
            'time_limit',
            'memory_limit',
            'allowed_languages',
            'starter_code',
            'test_cases',
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


class QuizOptionSerializer(serializers.Serializer):
    """Serializer for quiz question options"""
    option_id = serializers.IntegerField()
    option_text = serializers.CharField()
    order = serializers.IntegerField()


class QuizQuestionForStudentSerializer(serializers.ModelSerializer):

    question_id = serializers.IntegerField(source='id', read_only=True)
    options = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    code_snippet = serializers.SerializerMethodField()
    test_cases = QuizTestCaseForStudentSerializer(many=True, read_only=True)
    order = serializers.IntegerField(source='order_number', read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'question_id',
            'question_text',
            'question_type',
            'difficulty',
            'points',
            'order',
            'image_url',
            'code_snippet',
            'options',
            'description',
            'time_limit',
            'memory_limit',
            'allowed_languages',
            'starter_code',
            'test_cases'
        ]

    def get_options(self, obj):
        """Parse and return formatted options"""
        if obj.options:
            if isinstance(obj.options, list):
                return obj.options

            if isinstance(obj.options, dict):
                return [
                    {
                        "option_id": k,
                        "option_text": v.get("text") if isinstance(v, dict) else v,
                        "order": v.get("order", idx) if isinstance(v, dict) else idx
                    }
                    for idx, (k, v) in enumerate(obj.options.items(), 1)
                ]
        return []

    def get_image_url(self, obj):
        """Get image URL if stored in options or content"""
        if obj.options and isinstance(obj.options, dict):
            return obj.options.get('image_url')
        return None

    def get_code_snippet(self, obj):
        """Get code snippet if stored in options or content"""
        if obj.options and isinstance(obj.options, dict):
            return obj.options.get('code_snippet')
        return None


class LessonQuizSerializer(serializers.Serializer):
    """Serializer for GET /api/quizzes/lesson/<lesson_id>/"""
    quiz_id = serializers.SerializerMethodField()
    lesson_id = serializers.IntegerField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    time_limit = serializers.SerializerMethodField()
    passing_score = serializers.SerializerMethodField()
    questions = QuizQuestionForStudentSerializer(many=True)

    def get_quiz_id(self, obj):
        """Generate quiz_id from lesson_id"""
        return obj.get('lesson_id')

    def get_time_limit(self, obj):
        """Get time limit in seconds, null if unlimited"""
        return obj.get('time_limit', None)

    def get_passing_score(self, obj):
        """Get passing score percentage"""
        return obj.get('passing_score', 70)


class QuizAnswerSerializer(serializers.Serializer):
    """Serializer for individual answer in quiz submission"""
    question_id = serializers.IntegerField()
    selected_option_id = serializers.IntegerField(required=False, allow_null=True)
    text_answer = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    code_answer = serializers.CharField(required=False, allow_null=True, allow_blank=True, help_text="Code submission for code-type questions")
    actual_output = serializers.CharField(required=False, allow_null=True, allow_blank=True, help_text="Actual output from RapidAPI code execution")

    def validate_code_answer(self, value):
        if value is None:
            return value
        if len(value) > MAX_CODE_ANSWER_LENGTH:
            raise serializers.ValidationError(
                f"Code answer vượt quá {MAX_CODE_ANSWER_LENGTH} ký tự."
            )
        return value

    def validate_actual_output(self, value):
        if value is None:
            return value
        if len(value) > MAX_ACTUAL_OUTPUT_LENGTH:
            raise serializers.ValidationError(
                f"Actual output vượt quá {MAX_ACTUAL_OUTPUT_LENGTH} ký tự."
            )
        return value


class QuizSubmitSerializer(serializers.Serializer):
    """Serializer for POST /api/quizzes/submit/"""
    quiz_id = serializers.IntegerField()
    lesson_id = serializers.IntegerField()
    answers = QuizAnswerSerializer(many=True)
    time_spent = serializers.IntegerField(help_text="Time spent in seconds")

    def validate_answers(self, value):
        """Validate that answers is not empty"""
        if not value:
            raise serializers.ValidationError("Answers cannot be empty")
        return value


class QuizAnswerResultSerializer(serializers.Serializer):
    """Serializer for individual answer result"""
    question_id = serializers.IntegerField()
    selected_option_id = serializers.IntegerField(allow_null=True, required=False)
    text_answer = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    code_answer = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    actual_output = serializers.CharField(allow_null=True, allow_blank=True, required=False, help_text="Actual output from RapidAPI")
    is_correct = serializers.BooleanField()
    points_earned = serializers.DecimalField(max_digits=5, decimal_places=2)
    correct_answer_explanation = serializers.CharField(allow_blank=True)
    test_cases_results = serializers.ListField(required=False, help_text="Results for each test case in code questions")


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
