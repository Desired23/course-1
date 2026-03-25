from rest_framework import serializers
from .models import (
    ChatRoom,
    ChatMessage,
    Conversation,
    ConversationParticipant,
    Message,
    MessageAttachment,
    MessageReaction,
    PinnedMessage,
    UserChatPrivacy,
    UserChatBlock,
    MessageDeliveryState,
    ChatSystemEvent,
)


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


class ChatUserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True, required=False)


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = [
            'id',
            'kind',
            'storage_provider',
            'file_url',
            'thumbnail_url',
            'file_name',
            'mime_type',
            'file_size',
            'width',
            'height',
            'duration_seconds',
            'checksum',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MessageReactionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = MessageReaction
        fields = ['id', 'user_id', 'reaction', 'created_at']
        read_only_fields = ['id', 'created_at', 'user_id']


class MessageDeliveryStateSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = MessageDeliveryState
        fields = ['id', 'user_id', 'delivered_at', 'read_at']
        read_only_fields = ['id', 'user_id']


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(source='message_reactions', many=True, read_only=True)
    reply_to = serializers.SerializerMethodField()
    forwarded_from = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id',
            'conversation',
            'sender',
            'type',
            'text_content',
            'status',
            'report_count',
            'last_report_reason',
            'last_reported_at',
            'metadata',
            'reply_to',
            'forwarded_from',
            'attachments',
            'reactions',
            'created_at',
            'updated_at',
            'edited_at',
            'revoked_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'edited_at', 'revoked_at']

    def validate(self, attrs):
        message_type = attrs.get('type') or getattr(self.instance, 'type', Message.TYPE_TEXT)
        text_content = attrs.get('text_content')
        if message_type == Message.TYPE_TEXT and not text_content and not getattr(self.instance, 'text_content', None):
            raise serializers.ValidationError({'text_content': ['This field is required for text messages.']})
        return attrs

    def _build_user_summary(self, user):
        if not user:
            return None
        return {
            'id': user.id,
            'name': (
                getattr(user, 'full_name', None)
                or getattr(user, 'username', None)
                or getattr(user, 'email', None)
                or str(user.id)
            ),
            'avatar': getattr(user, 'avatar', None),
        }

    def get_sender(self, obj):
        return self._build_user_summary(obj.sender)

    def get_reply_to(self, obj):
        if not obj.reply_to_message:
            return None
        ref = obj.reply_to_message
        return {
            'id': ref.id,
            'sender_name': (
                getattr(ref.sender, 'full_name', None)
                or getattr(ref.sender, 'username', None)
                or getattr(ref.sender, 'email', None)
                or str(ref.sender_id)
            ),
            'text_preview': (ref.text_content or '')[:120],
        }

    def get_forwarded_from(self, obj):
        if not obj.forwarded_from_message_id:
            return None
        return {
            'message_id': obj.forwarded_from_message_id,
            'conversation_id': obj.forwarded_from_conversation_id,
        }


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = ConversationParticipant
        fields = [
            'id',
            'user',
            'role',
            'joined_at',
            'joined_by',
            'left_at',
            'removed_at',
            'removed_by',
            'is_active',
            'nickname',
            'mute_until',
            'is_pinned',
            'last_read_message',
            'last_read_at',
            'notification_level',
            'can_send_message',
            'can_add_members',
            'can_change_group_info',
        ]
        read_only_fields = ['id', 'joined_at', 'left_at', 'removed_at', 'last_read_at']

    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'name': (
                getattr(user, 'full_name', None)
                or getattr(user, 'username', None)
                or getattr(user, 'email', None)
                or str(user.id)
            ),
            'avatar': getattr(user, 'avatar', None),
        }


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    my_membership = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'type',
            'title',
            'avatar',
            'description',
            'created_by',
            'owner',
            'is_public',
            'is_archived',
            'last_message',
            'last_message_at',
            'deleted_at',
            'created_at',
            'updated_at',
            'participants',
            'participant_count',
            'my_membership',
            'last_message_preview',
        ]
        read_only_fields = [
            'id',
            'last_message',
            'last_message_at',
            'deleted_at',
            'created_at',
            'updated_at',
        ]

    def get_last_message_preview(self, obj):
        msg = obj.last_message
        if not msg:
            return None
        return {
            'id': msg.id,
            'type': msg.type,
            'text': (msg.text_content or '')[:120],
            'sender_id': msg.sender_id,
            'sender_name': (
                getattr(msg.sender, 'full_name', None)
                or getattr(msg.sender, 'username', None)
                or getattr(msg.sender, 'email', None)
                or str(msg.sender_id)
            ),
            'created_at': msg.created_at,
            'status': msg.status,
        }

    def get_participant_count(self, obj):
        return obj.participants.filter(is_active=True).count()

    def get_my_membership(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        membership = obj.participants.filter(user=user).first()
        if not membership:
            return None
        return {
            'role': membership.role,
            'notification_level': membership.notification_level,
            'is_pinned': membership.is_pinned,
            'last_read_message_id': membership.last_read_message_id,
            'last_read_at': membership.last_read_at,
        }


class PinnedMessageSerializer(serializers.ModelSerializer):
    message = MessageSerializer(read_only=True)

    class Meta:
        model = PinnedMessage
        fields = ['id', 'conversation', 'message', 'pinned_by', 'pinned_at', 'note', 'is_active']
        read_only_fields = ['id', 'pinned_at']


class UserChatPrivacySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserChatPrivacy
        fields = [
            'id',
            'user',
            'allow_direct_messages',
            'show_online_status',
            'allow_group_invites',
            'read_receipts_enabled',
            'last_seen_visibility',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class UserChatBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserChatBlock
        fields = ['id', 'blocker', 'blocked', 'reason', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSystemEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSystemEvent
        fields = ['id', 'conversation', 'actor', 'event_type', 'payload', 'created_at']
        read_only_fields = ['id', 'created_at']
