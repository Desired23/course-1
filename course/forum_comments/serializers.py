from rest_framework import serializers
from .models import ForumComment

class ForumCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumComment
        fields = [
            'id',
            'topic',
            'content',
            'user',
            'created_at',
            'updated_at',
            'parent_comment',
            'likes',
            'status',
            'is_best_answer'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'likes']
