from lesson_comments.models import LessonComment
from rest_framework import serializers
from utils.input_validators import MAX_COMMENT_LENGTH, validate_plain_user_text

class LessonCommentSerializer(serializers.ModelSerializer):
    def validate_content(self, value):
        return validate_plain_user_text(
            value,
            field_label="Nội dung bình luận",
            max_length=MAX_COMMENT_LENGTH,
        )

    class Meta:
        model = LessonComment
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

