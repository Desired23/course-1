from rest_framework import serializers
from .models import ForumTopic

class ForumTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumTopic
        fields = [
            'id',
            'forum',
            'title',
            'content',
            'user',
            'created_at',
            'updated_at',
            'status'
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True}
        }