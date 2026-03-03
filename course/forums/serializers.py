from rest_framework import serializers
from .models import Forum


class ForumSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    topic_count = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()

    class Meta:
        model = Forum
        fields = [
            'id',
            'course',
            'title',
            'description',
            'user_id',
            'user_name',
            'created_at',
            'status',
            'topic_count',
            'last_activity',
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True}
        }

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else None

    def get_topic_count(self, obj):
        return obj.topics_forum.count()

    def get_last_activity(self, obj):
        latest_topic = obj.topics_forum.order_by('-created_at').first()
        if latest_topic:
            return latest_topic.created_at.isoformat()
        return obj.created_at.isoformat() if obj.created_at else None