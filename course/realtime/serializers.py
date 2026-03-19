from rest_framework import serializers
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if obj.sender:
            return (
                getattr(obj.sender, 'full_name', None)
                or getattr(obj.sender, 'username', None)
                or getattr(obj.sender, 'email', None)
            )
        return None


class ChatRoomSerializer(serializers.ModelSerializer):
    other_user_name = serializers.SerializerMethodField()
    other_user_id = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'user1', 'user2', 'other_user_name', 'other_user_id',
                  'last_message', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_user_name(self, obj):
        request_user_id = self.context.get('request_user_id')
        other = obj.user2 if obj.user1_id == request_user_id else obj.user1
        return (
            getattr(other, 'full_name', None)
            or getattr(other, 'username', None)
            or getattr(other, 'email', None)
        )

    def get_other_user_id(self, obj):
        request_user_id = self.context.get('request_user_id')
        return obj.user2_id if obj.user1_id == request_user_id else obj.user1_id

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return {
                'content': msg.content[:100],
                'sender_id': msg.sender_id,
                'created_at': msg.created_at.isoformat(),
                'is_read': msg.is_read,
            }
        return None

    def get_unread_count(self, obj):
        request_user_id = self.context.get('request_user_id')
        return obj.messages.filter(is_read=False).exclude(sender_id=request_user_id).count()
