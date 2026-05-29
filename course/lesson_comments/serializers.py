from lesson_comments.models import LessonComment
from rest_framework import serializers
from utils.input_validators import MAX_COMMENT_LENGTH, validate_plain_user_text

class LessonCommentSerializer(serializers.ModelSerializer):
    user_full_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    def validate_content(self, value):
        return validate_plain_user_text(
            value,
            field_label="Nội dung bình luận",
            max_length=MAX_COMMENT_LENGTH,
        )

    def get_user_full_name(self, obj):
        return obj.user.full_name if obj.user else ''

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user else None

    class Meta:
        model = LessonComment
        fields = ['id', 'user', 'user_full_name', 'user_avatar', 'lesson', 'parent_comment', 'content', 'votes', 'created_at', 'updated_at']
        read_only_fields = ('id', 'created_at', 'updated_at')

