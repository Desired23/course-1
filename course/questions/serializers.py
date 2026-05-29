from rest_framework import serializers
from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    has_accepted_answer = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'title',
            'content',
            'author',
            'author_name',
            'author_avatar',
            'tags',
            'status',
            'views',
            'score',
            'answer_count',
            'has_accepted_answer',
            'report_count',
            'last_report_reason',
            'last_reported_at',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'score', 'views', 'answer_count']

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else None

    def get_author_avatar(self, obj):
        return obj.author.avatar if obj.author else None

    def get_has_accepted_answer(self, obj):
        return obj.answers_question.filter(is_accepted=True, is_deleted=False).exists()
