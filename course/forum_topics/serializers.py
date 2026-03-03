from rest_framework import serializers
from .models import ForumTopic


class ForumTopicSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    forum_title = serializers.SerializerMethodField()

    class Meta:
        model = ForumTopic
        fields = [
            'id',
            'forum',
            'forum_title',
            'title',
            'content',
            'user',
            'user_name',
            'user_avatar',
            'created_at',
            'updated_at',
            'status',
            'views',
            'likes',
            'is_pinned',
            'replies_count',
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

    def get_replies_count(self, obj):
        return obj.comments_topic.filter(status='active').count()

    def get_forum_title(self, obj):
        return obj.forum.title if obj.forum else None