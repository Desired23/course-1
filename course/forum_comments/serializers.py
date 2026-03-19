from rest_framework import serializers
from .models import ForumComment
from utils.input_validators import MAX_COMMENT_LENGTH, validate_plain_user_text

class ForumCommentSerializer(serializers.ModelSerializer):
    def validate_content(self, value):
        return validate_plain_user_text(
            value,
            field_label="Nội dung bình luận",
            max_length=MAX_COMMENT_LENGTH,
        )

    class Meta:
        model = ForumComment
        fields = [
            'id',
            'topic',
            'content',
            'user',
            'created_at',
            'updated_at',
            'parent',
            'likes',
            'status',
            'is_best_answer'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'likes']
