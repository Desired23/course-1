from lesson_comments.models import LessonComment
from rest_framework import serializers

class LessonCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonComment
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
        
