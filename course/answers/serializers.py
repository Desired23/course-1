from rest_framework import serializers
from .models import Answer


class AnswerSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            'id',
            'question',
            'content',
            'author',
            'author_name',
            'author_avatar',
            'is_accepted',
            'score',
            'status',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'score', 'is_accepted']

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else None

    def get_author_avatar(self, obj):
        return obj.author.avatar if obj.author else None
