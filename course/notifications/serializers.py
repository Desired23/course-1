from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['notification_id', 'title', 'user_id', 'message', 'is_read', 'created_at', 'type', 'related_id', 'notification_code']
        read_only_fields = ['notification_id']