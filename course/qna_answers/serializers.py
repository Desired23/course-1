from rest_framework import serializers
from .models import QnAAnswer


class QnAAnswerSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = QnAAnswer
        fields = [
            'id',
            'qna',
            'answer',
            'user',
            'user_name',
            'user_avatar',
            'created_at',
            'updated_at',
            'is_accepted',
            'likes'
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True}
        }

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else None

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user else None