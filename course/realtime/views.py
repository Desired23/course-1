from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from datetime import datetime, timezone as dt_timezone
from django.db import transaction
from django.db.models import Q, Count, Max
from django.utils import timezone
from .models import (
    ChatRoom,
    ChatMessage,
    Conversation,
    ConversationParticipant,
    Message,
    MessageAttachment,
    MessageDeliveryState,
    MessageReaction,
    ChatSystemEvent,
    UserChatBlock,
)
from .serializers import (
    ChatRoomSerializer,
    ChatMessageSerializer,
    ChatUserSummarySerializer,
    ConversationSerializer,
    ConversationParticipantSerializer,
    MessageSerializer,
    MessageReactionSerializer,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from users.preferences import is_direct_message_allowed
from users.models import User

CHAT_MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
CHAT_ALLOWED_ATTACHMENT_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
}


def _clear_message_reports(message):
    message.report_count = 0
    message.last_report_reason = None
    message.last_reported_at = None


def _report_message_for_moderation(message_id, reason=''):
    message = Message.objects.select_related('conversation', 'sender').filter(id=message_id).first()
    if not message:
        raise ValidationError("Message not found.")
    message.report_count += 1
    message.last_report_reason = (reason or '').strip() or message.last_report_reason
    message.last_reported_at = timezone.now()
    message.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at', 'updated_at'])
    return message


def _moderate_reported_message(message_id, action, reason=''):
    message = Message.objects.select_related('conversation', 'sender').filter(id=message_id).first()
    if not message:
        raise ValidationError("Message not found.")

    normalized_action = (action or '').strip().lower()
    if normalized_action not in {'approve', 'dismiss', 'revoke', 'delete'}:
        raise ValidationError({'action': ['Unsupported moderation action.']})

    if normalized_action in {'approve', 'dismiss'}:
        _clear_message_reports(message)
        message.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at', 'updated_at'])
        return message

    if normalized_action == 'revoke':
        message.status = Message.STATUS_REVOKED
        message.revoked_at = timezone.now()
        message.revoked_by = None
        message.text_content = None
        _clear_message_reports(message)
        message.save(
            update_fields=[
                'status',
                'revoked_at',
                'revoked_by',
                'text_content',
                'report_count',
                'last_report_reason',
                'last_reported_at',
                'updated_at',
            ]
        )
        return message

    message.status = Message.STATUS_DELETED
    message.text_content = None
    _clear_message_reports(message)
    message.save(
        update_fields=[
            'status',
            'text_content',
            'report_count',
            'last_report_reason',
            'last_reported_at',
            'updated_at',
        ]
    )
    return message


class ChatRoomListView(APIView):
    """List user's chat rooms or create a new one."""
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        # Always scope by authenticated user to avoid IDOR and malformed query crashes.
        user_id = request.user.id
        rooms = (
            ChatRoom.objects
            .filter(Q(user1_id=user_id) | Q(user2_id=user_id))
            .select_related('user1', 'user2')
            .prefetch_related('messages')
            .order_by('-updated_at')
        )
        return paginate_queryset(rooms, request, ChatRoomSerializer, context={'request_user_id': user_id})

    def post(self, request):
        user1_id = request.data.get('user1_id')
        user2_id = request.data.get('user2_id')
        if not user1_id or not user2_id:
            return Response({"error": "user1_id and user2_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        user1_id, user2_id = int(user1_id), int(user2_id)
        if request.user.id not in [user1_id, user2_id]:
            return Response({"error": "You can only create chats for yourself."}, status=status.HTTP_403_FORBIDDEN)
        other_user_id = user2_id if user1_id == request.user.id else user1_id
        if not is_direct_message_allowed(other_user_id):
            return Response({"error": "This user is not accepting direct messages."}, status=status.HTTP_403_FORBIDDEN)
        # Ensure consistent ordering
        small, big = min(user1_id, user2_id), max(user1_id, user2_id)

        room, created = ChatRoom.objects.get_or_create(
            user1_id=small, user2_id=big
        )
        room_obj = ChatRoom.objects.select_related('user1', 'user2').get(pk=room.pk)
        serializer = ChatRoomSerializer(room_obj, context={'request_user_id': user1_id})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChatMessageListView(APIView):
    """List messages in a room or send a new message."""
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, room_id):
        is_member = ChatRoom.objects.filter(pk=room_id).filter(Q(user1_id=request.user.id) | Q(user2_id=request.user.id)).exists()
        if not is_member:
            return Response({"error": "You do not have access to this room."}, status=status.HTTP_403_FORBIDDEN)
        messages = ChatMessage.objects.filter(room_id=room_id).select_related('sender').order_by('-created_at')
        return paginate_queryset(messages, request, ChatMessageSerializer)

    def post(self, request, room_id):
        """REST fallback for sending messages (WebSocket preferred)."""
        try:
            room = ChatRoom.objects.get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"error": "Chat room not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.id not in [room.user1_id, room.user2_id]:
            return Response({"error": "You do not have access to this room."}, status=status.HTTP_403_FORBIDDEN)
        receiver_id = room.user2_id if room.user1_id == request.user.id else room.user1_id
        if not is_direct_message_allowed(receiver_id):
            return Response({"error": "This user is not accepting direct messages."}, status=status.HTTP_403_FORBIDDEN)
        data = {
            'room': room_id,
            'sender': request.user.id,
            'content': request.data.get('content', ''),
        }
        serializer = ChatMessageSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Also push via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_id}",
                {
                    "type": "chat_message",
                    "data": serializer.data,
                }
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatMarkReadView(APIView):
    """Mark all messages in a room as read for a user."""
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def put(self, request, room_id):
        is_member = ChatRoom.objects.filter(pk=room_id).filter(Q(user1_id=request.user.id) | Q(user2_id=request.user.id)).exists()
        if not is_member:
            return Response({"error": "You do not have access to this room."}, status=status.HTTP_403_FORBIDDEN)
        updated = ChatMessage.objects.filter(
            room_id=room_id, is_read=False
        ).exclude(sender_id=request.user.id).update(is_read=True)
        return Response({"marked_read": updated})


def _get_direct_conversation_between(user_a_id, user_b_id):
    participant_ids = sorted([int(user_a_id), int(user_b_id)])
    qs = (
        Conversation.objects
        .filter(type=Conversation.TYPE_DIRECT, deleted_at__isnull=True)
        .annotate(
            active_participant_count=Count(
                'participants',
                filter=Q(participants__is_active=True),
                distinct=True,
            ),
            matched_participant_count=Count(
                'participants',
                filter=Q(participants__is_active=True, participants__user_id__in=participant_ids),
                distinct=True,
            ),
        )
        .filter(active_participant_count=2, matched_participant_count=2)
        .order_by('id')
    )
    return qs.first()


def _user_is_blocked(user_id, other_user_id):
    return UserChatBlock.objects.filter(
        blocker_id=other_user_id,
        blocked_id=user_id,
    ).exists()


def _get_active_membership(user, conversation_id):
    return ConversationParticipant.objects.filter(
        conversation_id=conversation_id,
        user=user,
        is_active=True,
        conversation__deleted_at__isnull=True,
    ).select_related('conversation').first()


def _can_manage_group_participants(membership):
    if not membership:
        return False
    return membership.role in [ConversationParticipant.ROLE_OWNER, ConversationParticipant.ROLE_ADMIN] or membership.can_add_members


def _create_system_event(conversation, actor, event_type, payload):
    ChatSystemEvent.objects.create(
        conversation=conversation,
        actor=actor,
        event_type=event_type,
        payload=payload or {},
    )


class ConversationListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        conversation_type = request.query_params.get('type')
        search = (request.query_params.get('q') or '').strip()
        has_unread = request.query_params.get('has_unread')

        memberships = ConversationParticipant.objects.filter(
            user=request.user,
            is_active=True,
            conversation__deleted_at__isnull=True,
        ).select_related('conversation')

        conversations = Conversation.objects.filter(
            participants__in=memberships,
            deleted_at__isnull=True,
        ).distinct()

        if conversation_type and conversation_type != 'all':
            conversations = conversations.filter(type=conversation_type)

        if search:
            conversations = conversations.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(participants__nickname__icontains=search) |
                Q(participants__user__full_name__icontains=search) |
                Q(participants__user__username__icontains=search) |
                Q(conversation_messages__text_content__icontains=search)
            ).distinct()

        if has_unread in ['true', 'false']:
            target = has_unread == 'true'
            candidate_ids = []
            for membership in memberships:
                unread_exists = membership.conversation.conversation_messages.filter(
                    created_at__gt=(membership.last_read_at or datetime.min.replace(tzinfo=dt_timezone.utc)),
                ).exclude(sender=request.user).exists()
                if unread_exists == target:
                    candidate_ids.append(membership.conversation_id)
            conversations = conversations.filter(id__in=candidate_ids)

        conversations = conversations.select_related('created_by', 'owner', 'last_message', 'last_message__sender').prefetch_related(
            'participants__user'
        ).order_by('-last_message_at', '-updated_at')
        return paginate_queryset(conversations, request, ConversationSerializer, context={'request': request})

    @transaction.atomic
    def post(self, request):
        conversation_type = (request.data.get('type') or Conversation.TYPE_DIRECT).strip().lower()
        participant_ids = request.data.get('participant_ids') or []
        title = (request.data.get('title') or '').strip() or None
        description = (request.data.get('description') or '').strip() or None

        if not isinstance(participant_ids, list):
            raise ValidationError({'participant_ids': ['This field must be a list.']})

        normalized_ids = []
        for pid in participant_ids:
            try:
                normalized_ids.append(int(pid))
            except (TypeError, ValueError):
                raise ValidationError({'participant_ids': ['All participant_ids must be integers.']})

        normalized_ids = list(dict.fromkeys([request.user.id, *normalized_ids]))

        if conversation_type == Conversation.TYPE_DIRECT:
            if len(normalized_ids) != 2:
                raise ValidationError({'participant_ids': ['Direct conversations require exactly one other user.']})
            other_user_id = next(uid for uid in normalized_ids if uid != request.user.id)
            if _user_is_blocked(request.user.id, other_user_id):
                return Response({"error": "This user has blocked you."}, status=status.HTTP_403_FORBIDDEN)
            if not is_direct_message_allowed(other_user_id):
                return Response({"error": "This user is not accepting direct messages."}, status=status.HTTP_403_FORBIDDEN)

            existing = _get_direct_conversation_between(request.user.id, other_user_id)
            if existing:
                serializer = ConversationSerializer(existing, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

            conversation = Conversation.objects.create(
                type=Conversation.TYPE_DIRECT,
                created_by=request.user,
                owner=request.user,
                title=title,
                description=description,
            )
        elif conversation_type == Conversation.TYPE_GROUP:
            if len(normalized_ids) < 3:
                raise ValidationError({'participant_ids': ['Group conversations require at least two other users.']})
            conversation = Conversation.objects.create(
                type=Conversation.TYPE_GROUP,
                created_by=request.user,
                owner=request.user,
                title=title or 'New Group',
                description=description,
            )
        else:
            raise ValidationError({'type': ['Unsupported conversation type.']})

        for user_id in normalized_ids:
            role = ConversationParticipant.ROLE_MEMBER
            if user_id == request.user.id:
                role = ConversationParticipant.ROLE_OWNER
            ConversationParticipant.objects.create(
                conversation=conversation,
                user_id=user_id,
                role=role,
                joined_by=request.user,
                can_add_members=(role == ConversationParticipant.ROLE_OWNER),
                can_change_group_info=(role == ConversationParticipant.ROLE_OWNER),
            )

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatUserSearchView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        limit = request.query_params.get('limit', 8)

        try:
            limit = max(1, min(int(limit), 20))
        except (TypeError, ValueError):
            limit = 8

        if len(query) < 2:
            return Response({"results": []}, status=status.HTTP_200_OK)

        users = (
            User.objects
            .filter(is_deleted=False, status=User.StatusChoices.ACTIVE)
            .exclude(id=request.user.id)
            .filter(
                Q(full_name__icontains=query) |
                Q(username__icontains=query) |
                Q(email__icontains=query)
            )
            .order_by('full_name', 'username')[:limit]
        )

        payload = [
            {
                'id': user.id,
                'name': user.full_name or user.username or user.email or str(user.id),
                'avatar': user.avatar,
            }
            for user in users
        ]
        serializer = ChatUserSummarySerializer(payload, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class ConversationDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get_object(self, request, conversation_id):
        conversation = Conversation.objects.filter(
            id=conversation_id,
            deleted_at__isnull=True,
            participants__user=request.user,
            participants__is_active=True,
        ).select_related('created_by', 'owner', 'last_message', 'last_message__sender').prefetch_related(
            'participants__user'
        ).distinct().first()
        if not conversation:
            raise ValidationError("Conversation not found or you do not have access.")
        return conversation

    def get(self, request, conversation_id):
        conversation = self.get_object(request, conversation_id)
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, conversation_id):
        conversation = self.get_object(request, conversation_id)
        membership = ConversationParticipant.objects.filter(
            conversation=conversation,
            user=request.user,
            is_active=True,
        ).first()
        if conversation.type == Conversation.TYPE_DIRECT:
            raise ValidationError("Direct conversations cannot be renamed globally.")
        if not membership or membership.role not in [ConversationParticipant.ROLE_OWNER, ConversationParticipant.ROLE_ADMIN]:
            return Response({"error": "You do not have permission to update this conversation."}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title')
        description = request.data.get('description')
        avatar = request.data.get('avatar')
        changed = False

        if title is not None:
            conversation.title = str(title).strip() or conversation.title
            changed = True
        if description is not None:
            conversation.description = str(description).strip() or None
            changed = True
        if avatar is not None:
            conversation.avatar = str(avatar).strip() or None
            changed = True
        if changed:
            conversation.save(update_fields=['title', 'description', 'avatar', 'updated_at'])

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConversationMessageListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get_membership(self, request, conversation_id):
        membership = _get_active_membership(request.user, conversation_id)
        if not membership:
            return None
        return membership

    def get(self, request, conversation_id):
        membership = self.get_membership(request, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)

        message_type = request.query_params.get('type')
        search = (request.query_params.get('q') or '').strip()
        messages = Message.objects.filter(
            conversation_id=conversation_id,
        ).select_related(
            'sender',
            'reply_to_message',
            'reply_to_message__sender',
            'forwarded_from_message',
        ).prefetch_related(
            'attachments',
            'message_reactions',
            'message_reactions__user',
        ).order_by('-created_at')

        if message_type and message_type != 'all':
            messages = messages.filter(type=message_type)
        if search:
            messages = messages.filter(text_content__icontains=search)

        return paginate_queryset(messages, request, MessageSerializer, context={'request': request})

    @transaction.atomic
    def post(self, request, conversation_id):
        membership = self.get_membership(request, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        if not membership.can_send_message:
            return Response({"error": "You cannot send messages to this conversation."}, status=status.HTTP_403_FORBIDDEN)

        conversation = membership.conversation
        text_content = (request.data.get('text_content') or request.data.get('content') or '').strip()
        message_type = (request.data.get('type') or Message.TYPE_TEXT).strip().lower()
        reply_to_message_id = request.data.get('reply_to_message_id')
        attachments_payload = request.data.get('attachments') or []

        if message_type not in dict(Message.TYPE_CHOICES):
            raise ValidationError({'type': ['Unsupported message type.']})
        if attachments_payload and not isinstance(attachments_payload, list):
            raise ValidationError({'attachments': ['This field must be a list.']})
        if attachments_payload and message_type == Message.TYPE_TEXT:
            inferred_kind = (attachments_payload[0] or {}).get('kind')
            if inferred_kind in [Message.TYPE_IMAGE, Message.TYPE_VIDEO, Message.TYPE_FILE]:
                message_type = inferred_kind
        if message_type == Message.TYPE_TEXT and not text_content:
            raise ValidationError({'text_content': ['This field is required for text messages.']})

        reply_to_message = None
        if reply_to_message_id:
            reply_to_message = Message.objects.filter(
                id=reply_to_message_id,
                conversation=conversation,
            ).first()
            if not reply_to_message:
                raise ValidationError({'reply_to_message_id': ['Reply target not found in this conversation.']})

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            type=message_type,
            text_content=text_content or None,
            reply_to_message=reply_to_message,
            metadata={
                'client_message_id': request.data.get('client_message_id'),
            } if request.data.get('client_message_id') else {},
        )
        for attachment_payload in attachments_payload:
            kind = (attachment_payload or {}).get('kind') or MessageAttachment.KIND_FILE
            if kind not in dict(MessageAttachment.KIND_CHOICES):
                raise ValidationError({'attachments': [f'Unsupported attachment kind: {kind}']})
            mime_type = (attachment_payload or {}).get('mime_type') or 'application/octet-stream'
            file_size = int((attachment_payload or {}).get('file_size') or 0)
            if mime_type not in CHAT_ALLOWED_ATTACHMENT_MIME_TYPES:
                raise ValidationError({'attachments': [f'Unsupported attachment MIME type: {mime_type}']})
            if file_size > CHAT_MAX_ATTACHMENT_SIZE_BYTES:
                raise ValidationError({'attachments': ['Attachment exceeds the 25MB limit.']})
            MessageAttachment.objects.create(
                message=message,
                kind=kind,
                storage_provider=(attachment_payload or {}).get('storage_provider') or MessageAttachment.PROVIDER_CLOUDINARY,
                file_url=(attachment_payload or {}).get('file_url') or '',
                thumbnail_url=(attachment_payload or {}).get('thumbnail_url'),
                file_name=(attachment_payload or {}).get('file_name') or 'attachment',
                mime_type=mime_type,
                file_size=file_size,
                width=(attachment_payload or {}).get('width'),
                height=(attachment_payload or {}).get('height'),
                duration_seconds=(attachment_payload or {}).get('duration_seconds'),
                checksum=(attachment_payload or {}).get('public_id') or (attachment_payload or {}).get('checksum'),
            )
        conversation.last_message = message
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message', 'last_message_at', 'updated_at'])

        other_participant_ids = list(
            conversation.participants.filter(is_active=True).exclude(user=request.user).values_list('user_id', flat=True)
        )
        MessageDeliveryState.objects.bulk_create([
            MessageDeliveryState(
                message=message,
                user_id=user_id,
                delivered_at=timezone.now(),
            )
            for user_id in other_participant_ids
        ])

        message = Message.objects.select_related(
            'sender',
            'reply_to_message',
            'reply_to_message__sender',
            'forwarded_from_message',
        ).prefetch_related(
            'attachments',
            'message_reactions',
            'message_reactions__user',
        ).get(pk=message.pk)
        serializer = MessageSerializer(message, context={'request': request})
        payload = serializer.data

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation_id}",
                {
                    "type": "chat_message",
                    "data": {
                        "id": payload["id"],
                        "room": conversation_id,
                        "sender": payload["sender"]["id"] if payload.get("sender") else request.user.id,
                        "sender_name": payload["sender"]["name"] if payload.get("sender") else (
                            getattr(request.user, 'full_name', None)
                            or getattr(request.user, 'username', None)
                            or getattr(request.user, 'email', None)
                            or str(request.user.id)
                        ),
                        "content": payload.get("text_content") or "",
                        "is_read": False,
                        "created_at": payload["created_at"],
                        "conversation_message": payload,
                    },
                }
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, conversation_id):
        membership = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user=request.user,
            is_active=True,
            conversation__deleted_at__isnull=True,
        ).first()
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)

        last_read_message_id = request.data.get('last_read_message_id')
        if last_read_message_id:
            message = Message.objects.filter(
                id=last_read_message_id,
                conversation_id=conversation_id,
            ).first()
            if not message:
                raise ValidationError({'last_read_message_id': ['Message not found in this conversation.']})
            membership.last_read_message = message
        membership.last_read_at = timezone.now()
        membership.save(update_fields=['last_read_message', 'last_read_at'])

        MessageDeliveryState.objects.filter(
            message__conversation_id=conversation_id,
            user=request.user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
        return Response({
            "conversation_id": conversation_id,
            "last_read_message_id": membership.last_read_message_id,
            "read_at": membership.last_read_at,
        }, status=status.HTTP_200_OK)


class ConversationParticipantListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request, conversation_id):
        membership = _get_active_membership(request.user, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        participants = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
        ).select_related('user', 'joined_by', 'removed_by').order_by('joined_at')
        return paginate_queryset(participants, request, ConversationParticipantSerializer, context={'request': request}, page_size=100)

    @transaction.atomic
    def post(self, request, conversation_id):
        membership = _get_active_membership(request.user, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        conversation = membership.conversation
        if conversation.type != Conversation.TYPE_GROUP:
            raise ValidationError("Participants can only be added to group conversations.")
        if not _can_manage_group_participants(membership):
            return Response({"error": "You do not have permission to add participants."}, status=status.HTTP_403_FORBIDDEN)

        user_ids = request.data.get('user_ids') or []
        if not isinstance(user_ids, list) or not user_ids:
            raise ValidationError({'user_ids': ['This field must be a non-empty list.']})

        created_participants = []
        for raw_user_id in user_ids:
            try:
                user_id = int(raw_user_id)
            except (TypeError, ValueError):
                raise ValidationError({'user_ids': ['All user_ids must be integers.']})
            participant, created = ConversationParticipant.objects.get_or_create(
                conversation=conversation,
                user_id=user_id,
                defaults={
                    'role': ConversationParticipant.ROLE_MEMBER,
                    'joined_by': request.user,
                    'can_send_message': True,
                },
            )
            if not created and participant.is_active:
                continue
            if not created:
                participant.is_active = True
                participant.left_at = None
                participant.removed_at = None
                participant.removed_by = None
                participant.joined_by = request.user
                participant.joined_at = timezone.now()
                participant.save(update_fields=['is_active', 'left_at', 'removed_at', 'removed_by', 'joined_by', 'joined_at'])
            created_participants.append(participant)
            _create_system_event(
                conversation,
                request.user,
                'participant_joined',
                {'user_id': user_id, 'joined_by': request.user.id},
            )

        serializer = ConversationParticipantSerializer(created_participants, many=True, context={'request': request})
        return Response({'results': serializer.data}, status=status.HTTP_201_CREATED)


class ConversationParticipantDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def patch(self, request, conversation_id, user_id):
        membership = _get_active_membership(request.user, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        conversation = membership.conversation
        target = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
        ).select_related('user').first()
        if not target:
            raise ValidationError("Participant not found.")

        is_self = target.user_id == request.user.id
        if not is_self and not _can_manage_group_participants(membership):
            return Response({"error": "You do not have permission to update this participant."}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = {'nickname', 'notification_level', 'mute_until'}
        if not is_self:
            allowed_fields.update({'role', 'can_send_message', 'can_add_members', 'can_change_group_info'})

        changed = []
        for field in allowed_fields:
            if field in request.data:
                setattr(target, field, request.data.get(field))
                changed.append(field)

        if 'role' in changed:
            if conversation.type != Conversation.TYPE_GROUP:
                raise ValidationError("Roles can only be changed in group conversations.")
            if membership.role != ConversationParticipant.ROLE_OWNER:
                return Response({"error": "Only the owner can change roles."}, status=status.HTTP_403_FORBIDDEN)
            _create_system_event(
                conversation,
                request.user,
                'participant_role_updated',
                {'user_id': target.user_id, 'role': target.role},
            )

        if changed:
            target.save(update_fields=changed)

        serializer = ConversationParticipantSerializer(target, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def delete(self, request, conversation_id, user_id):
        membership = _get_active_membership(request.user, conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        conversation = membership.conversation
        if conversation.type != Conversation.TYPE_GROUP:
            raise ValidationError("Participants can only be removed from group conversations.")
        target = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            is_active=True,
        ).first()
        if not target:
            raise ValidationError("Participant not found or already inactive.")

        if target.user_id != request.user.id and not _can_manage_group_participants(membership):
            return Response({"error": "You do not have permission to remove this participant."}, status=status.HTTP_403_FORBIDDEN)
        if target.role == ConversationParticipant.ROLE_OWNER and target.user_id != request.user.id:
            return Response({"error": "The owner cannot be removed by another participant."}, status=status.HTTP_403_FORBIDDEN)

        target.is_active = False
        target.left_at = timezone.now() if target.user_id == request.user.id else target.left_at
        target.removed_at = timezone.now()
        target.removed_by = request.user
        target.save(update_fields=['is_active', 'left_at', 'removed_at', 'removed_by'])
        _create_system_event(
            conversation,
            request.user,
            'participant_removed' if target.user_id != request.user.id else 'participant_left',
            {'user_id': target.user_id, 'removed_by': request.user.id},
        )
        return Response({"message": "Participant updated successfully."}, status=status.HTTP_200_OK)


class ConversationMessageDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def patch(self, request, message_id):
        message = Message.objects.select_related('conversation', 'sender').filter(id=message_id).first()
        if not message:
            raise ValidationError("Message not found.")
        membership = _get_active_membership(request.user, message.conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action')
        if action == 'revoke':
            if message.sender_id != request.user.id:
                return Response({"error": "Only the sender can revoke this message."}, status=status.HTTP_403_FORBIDDEN)
            message.status = Message.STATUS_REVOKED
            message.revoked_at = timezone.now()
            message.revoked_by = request.user
            message.text_content = None
            message.save(update_fields=['status', 'revoked_at', 'revoked_by', 'text_content', 'updated_at'])
        else:
            if message.sender_id != request.user.id:
                return Response({"error": "Only the sender can edit this message."}, status=status.HTTP_403_FORBIDDEN)
            if message.status == Message.STATUS_REVOKED:
                return Response({"error": "Revoked messages cannot be edited."}, status=status.HTTP_400_BAD_REQUEST)
            text_content = (request.data.get('text_content') or '').strip()
            if not text_content:
                raise ValidationError({'text_content': ['This field is required.']})
            message.text_content = text_content
            message.status = Message.STATUS_EDITED if message.status == Message.STATUS_ACTIVE else message.status
            message.edited_at = timezone.now()
            message.save(update_fields=['text_content', 'status', 'edited_at', 'updated_at'])

        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageReportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, message_id):
        message = Message.objects.select_related('conversation').filter(id=message_id).first()
        if not message:
            raise ValidationError("Message not found.")
        membership = _get_active_membership(request.user, message.conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        if message.sender_id == request.user.id:
            return Response({"error": "You cannot report your own message."}, status=status.HTTP_400_BAD_REQUEST)
        reported = _report_message_for_moderation(message_id, request.data.get('reason', ''))
        serializer = MessageSerializer(reported, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageModerationView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, message_id):
        moderated = _moderate_reported_message(
            message_id,
            request.data.get('action'),
            request.data.get('reason', ''),
        )
        serializer = MessageSerializer(moderated, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageReactionView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, message_id):
        message = Message.objects.select_related('conversation').filter(id=message_id).first()
        if not message:
            raise ValidationError("Message not found.")
        membership = _get_active_membership(request.user, message.conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        reaction_value = (request.data.get('reaction') or '').strip()
        if not reaction_value:
            raise ValidationError({'reaction': ['This field is required.']})
        reaction, _ = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            reaction=reaction_value,
        )
        serializer = MessageReactionSerializer(reaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, message_id, reaction):
        message = Message.objects.select_related('conversation').filter(id=message_id).first()
        if not message:
            raise ValidationError("Message not found.")
        membership = _get_active_membership(request.user, message.conversation_id)
        if not membership:
            return Response({"error": "You do not have access to this conversation."}, status=status.HTTP_403_FORBIDDEN)
        deleted, _ = MessageReaction.objects.filter(
            message=message,
            user=request.user,
            reaction=reaction,
        ).delete()
        return Response({"deleted": deleted > 0}, status=status.HTTP_200_OK)
