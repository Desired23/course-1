from rest_framework import serializers
from .models import RegistrationForm, FormQuestion


class FormQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormQuestion
        fields = [
            'id', 'form', 'order', 'label', 'type',
            'placeholder', 'help_text', 'required',
            'options', 'validation_regex', 'file_config',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'form': {'required': False}  # Set in service when creating with form
        }


class RegistrationFormSerializer(serializers.ModelSerializer):
    questions = FormQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = RegistrationForm
        fields = [
            'id', 'type', 'title', 'description',
            'is_active', 'version', 'created_by',
            'created_at', 'updated_at', 'questions',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegistrationFormListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationForm
        fields = [
            'id', 'type', 'title', 'description',
            'is_active', 'version', 'created_at', 'question_count',
        ]

    def get_question_count(self, obj):
        return obj.questions.filter(is_deleted=False).count()


class FormQuestionCreateSerializer(serializers.Serializer):
    order = serializers.IntegerField()
    label = serializers.CharField(max_length=500)
    type = serializers.ChoiceField(choices=FormQuestion.QuestionType.choices)
    placeholder = serializers.CharField(max_length=255, required=False, allow_blank=True)
    help_text = serializers.CharField(max_length=500, required=False, allow_blank=True)
    required = serializers.BooleanField(default=False)
    options = serializers.JSONField(required=False, default=None)
    validation_regex = serializers.CharField(max_length=500, required=False, allow_blank=True)
    file_config = serializers.JSONField(required=False, default=None)
