from .models import ActivityLog
from rest_framework import serializers

class ActivityLogSerializer(serializers.ModelSerializer):
    user = serializers.IntegerField(source='user_id', read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_id', 'user_name', 'user_email', 'user_avatar',
            'action', 'description', 'entity_type', 'entity_id', 'ip_address',
            'created_at', 'user_agent'
        ]
        read_only_fields = ('id', 'created_at')

    def get_user_name(self, obj):
        if not obj.user:
            return None
        return obj.user.full_name or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user else None
