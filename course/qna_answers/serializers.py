from rest_framework import serializers
from .models import QnAAnswer

class QnAAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = QnAAnswer
        fields = [
            'id',
            'qna',
            'answer',
            'user',
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