from rest_framework import serializers
from .models import BlogComment


class BlogCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogComment
        fields = [
            'id',
            'blog_post',
            'content',
            'user',
            'user_name',
            'user_avatar',
            'created_at',
            'updated_at',
            'parent',
            'likes',
            'status',
            'replies_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'likes']

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else None

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user else None

    def get_replies_count(self, obj):
        return obj.replies.filter(status='active').count()
