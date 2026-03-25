from django.db import models
from users.models import User


class ChatRoom(models.Model):
    """Chat room between two users (e.g., student and instructor)."""
    id = models.AutoField(primary_key=True)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chatrooms_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chatrooms_as_user2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ChatRooms'
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f"Chat: {self.user1_id} <-> {self.user2_id}"


class ChatMessage(models.Model):
    """A single chat message within a chat room."""
    id = models.AutoField(primary_key=True)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ChatMessages'
        ordering = ['created_at']

    def __str__(self):
        return f"Msg {self.id} in Room {self.room_id}"


class Conversation(models.Model):
    TYPE_DIRECT = 'direct'
    TYPE_GROUP = 'group'
    TYPE_SYSTEM = 'system'
    TYPE_CHOICES = [
        (TYPE_DIRECT, 'Direct'),
        (TYPE_GROUP, 'Group'),
        (TYPE_SYSTEM, 'System'),
    ]

    id = models.BigAutoField(primary_key=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_DIRECT)
    title = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.URLField(max_length=1000, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_conversations',
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='owned_conversations',
        null=True,
        blank=True,
    )
    is_public = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    last_message = models.ForeignKey(
        'Message',
        on_delete=models.SET_NULL,
        related_name='last_for_conversations',
        null=True,
        blank=True,
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ChatConversations'
        indexes = [
            models.Index(fields=['type', 'updated_at']),
            models.Index(fields=['last_message_at']),
        ]

    def __str__(self):
        return self.title or f"Conversation {self.pk}"


class ConversationParticipant(models.Model):
    ROLE_OWNER = 'owner'
    ROLE_ADMIN = 'admin'
    ROLE_MEMBER = 'member'
    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_ADMIN, 'Admin'),
        (ROLE_MEMBER, 'Member'),
    ]

    NOTIFY_ALL = 'all'
    NOTIFY_MENTIONS = 'mentions'
    NOTIFY_MUTE = 'mute'
    NOTIFICATION_LEVEL_CHOICES = [
        (NOTIFY_ALL, 'All'),
        (NOTIFY_MENTIONS, 'Mentions'),
        (NOTIFY_MUTE, 'Mute'),
    ]

    id = models.BigAutoField(primary_key=True)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_conversation_memberships',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    joined_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='chat_participants_joined',
        null=True,
        blank=True,
    )
    left_at = models.DateTimeField(null=True, blank=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    removed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='chat_participants_removed',
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    nickname = models.CharField(max_length=255, blank=True, null=True)
    mute_until = models.DateTimeField(null=True, blank=True)
    is_pinned = models.BooleanField(default=False)
    last_read_message = models.ForeignKey(
        'Message',
        on_delete=models.SET_NULL,
        related_name='last_read_by_participants',
        null=True,
        blank=True,
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    notification_level = models.CharField(
        max_length=20,
        choices=NOTIFICATION_LEVEL_CHOICES,
        default=NOTIFY_ALL,
    )
    can_send_message = models.BooleanField(default=True)
    can_add_members = models.BooleanField(default=False)
    can_change_group_info = models.BooleanField(default=False)

    class Meta:
        db_table = 'ChatConversationParticipants'
        constraints = [
            models.UniqueConstraint(
                fields=['conversation', 'user'],
                name='unique_chat_participant_per_conversation',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['conversation', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.conversation_id}"


class Message(models.Model):
    TYPE_TEXT = 'text'
    TYPE_IMAGE = 'image'
    TYPE_VIDEO = 'video'
    TYPE_FILE = 'file'
    TYPE_SYSTEM = 'system'
    TYPE_CHOICES = [
        (TYPE_TEXT, 'Text'),
        (TYPE_IMAGE, 'Image'),
        (TYPE_VIDEO, 'Video'),
        (TYPE_FILE, 'File'),
        (TYPE_SYSTEM, 'System'),
    ]

    STATUS_ACTIVE = 'active'
    STATUS_EDITED = 'edited'
    STATUS_REVOKED = 'revoked'
    STATUS_DELETED = 'deleted'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EDITED, 'Edited'),
        (STATUS_REVOKED, 'Revoked'),
        (STATUS_DELETED, 'Deleted'),
    ]

    id = models.BigAutoField(primary_key=True)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='conversation_messages',
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversation_messages_sent',
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_TEXT)
    text_content = models.TextField(blank=True, null=True)
    reply_to_message = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        related_name='replies',
        null=True,
        blank=True,
    )
    forwarded_from_message = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        related_name='forward_copies',
        null=True,
        blank=True,
    )
    forwarded_from_conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        related_name='forwarded_messages',
        null=True,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    report_count = models.PositiveIntegerField(default=0)
    last_report_reason = models.TextField(null=True, blank=True)
    last_reported_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='messages_revoked',
        null=True,
        blank=True,
    )
    edited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ChatConversationMessages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['reply_to_message']),
        ]

    def __str__(self):
        return f"Conversation message {self.pk}"


class MessageAttachment(models.Model):
    KIND_IMAGE = 'image'
    KIND_VIDEO = 'video'
    KIND_FILE = 'file'
    KIND_CHOICES = [
        (KIND_IMAGE, 'Image'),
        (KIND_VIDEO, 'Video'),
        (KIND_FILE, 'File'),
    ]

    PROVIDER_LOCAL = 'local'
    PROVIDER_S3 = 's3'
    PROVIDER_CLOUDINARY = 'cloudinary'
    PROVIDER_OTHER = 'other'
    STORAGE_PROVIDER_CHOICES = [
        (PROVIDER_LOCAL, 'Local'),
        (PROVIDER_S3, 'S3'),
        (PROVIDER_CLOUDINARY, 'Cloudinary'),
        (PROVIDER_OTHER, 'Other'),
    ]

    id = models.BigAutoField(primary_key=True)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    storage_provider = models.CharField(
        max_length=20,
        choices=STORAGE_PROVIDER_CHOICES,
        default=PROVIDER_LOCAL,
    )
    file_url = models.URLField(max_length=1000)
    thumbnail_url = models.URLField(max_length=1000, blank=True, null=True)
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    checksum = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ChatMessageAttachments'
        indexes = [
            models.Index(fields=['message']),
            models.Index(fields=['kind', 'created_at']),
        ]

    def __str__(self):
        return self.file_name


class MessageReaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='message_reactions',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reactions',
    )
    reaction = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ChatMessageReactions'
        constraints = [
            models.UniqueConstraint(
                fields=['message', 'user', 'reaction'],
                name='unique_reaction_per_message_user',
            ),
        ]

    def __str__(self):
        return f"{self.reaction} on {self.message_id}"


class PinnedMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='pinned_messages',
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='pins',
    )
    pinned_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='pinned_messages_created',
    )
    pinned_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ChatPinnedMessages'
        constraints = [
            models.UniqueConstraint(
                fields=['conversation', 'message', 'is_active'],
                name='unique_active_pin_per_message',
            ),
        ]

    def __str__(self):
        return f"Pin {self.message_id} in {self.conversation_id}"


class UserChatPrivacy(models.Model):
    VISIBILITY_EVERYONE = 'everyone'
    VISIBILITY_CONTACTS = 'contacts'
    VISIBILITY_NOBODY = 'nobody'
    VISIBILITY_CHOICES = [
        (VISIBILITY_EVERYONE, 'Everyone'),
        (VISIBILITY_CONTACTS, 'Contacts'),
        (VISIBILITY_NOBODY, 'Nobody'),
    ]

    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='chat_privacy_settings',
    )
    allow_direct_messages = models.BooleanField(default=True)
    show_online_status = models.BooleanField(default=True)
    allow_group_invites = models.BooleanField(default=True)
    read_receipts_enabled = models.BooleanField(default=True)
    last_seen_visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_EVERYONE,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ChatUserPrivacySettings'

    def __str__(self):
        return f"Privacy settings for {self.user_id}"


class UserChatBlock(models.Model):
    id = models.BigAutoField(primary_key=True)
    blocker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocked_chat_users',
    )
    blocked = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocked_by_chat_users',
    )
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ChatUserBlocks'
        constraints = [
            models.UniqueConstraint(
                fields=['blocker', 'blocked'],
                name='unique_chat_block_relationship',
            ),
        ]

    def __str__(self):
        return f"{self.blocker_id} blocked {self.blocked_id}"


class MessageDeliveryState(models.Model):
    id = models.BigAutoField(primary_key=True)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='delivery_states',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_delivery_states',
    )
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ChatMessageDeliveryStates'
        constraints = [
            models.UniqueConstraint(
                fields=['message', 'user'],
                name='unique_delivery_state_per_message_user',
            ),
        ]

    def __str__(self):
        return f"Delivery state {self.message_id}:{self.user_id}"


class ChatSystemEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='system_events',
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='chat_system_events',
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ChatSystemEvents'
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} in {self.conversation_id}"
