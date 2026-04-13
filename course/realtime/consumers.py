

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            self.group_name = f"user_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):

        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong"})

    async def send_notification(self, event):
        await self.send_json({
            "type": "notification",
            "data": event["data"],
        })

    async def send_notification_removed(self, event):
        await self.send_json({
            "type": "notification_removed",
            "data": event["data"],
        })

    async def send_notification_updated(self, event):
        await self.send_json({
            "type": "notification_updated",
            "data": event["data"],
        })


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time chat between two users."""

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"
        self.user = user


        is_member = await self.check_room_membership(self.room_id, user.id)
        if not is_member:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")

        if msg_type == "chat_message":
            text = content.get("content", "").strip()
            if not text:
                return
            receiver_allows = await self.other_user_allows_messages(self.room_id, self.user.id)
            if not receiver_allows:
                await self.send_json({
                    "type": "error",
                    "message": "This user is not accepting direct messages.",
                })
                return


            msg_data = await self.save_message(self.room_id, self.user.id, text)


            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_message",
                    "data": msg_data,
                }
            )


            other_user_id = await self.get_other_user_id(self.room_id, self.user.id)
            should_notify = await self.should_send_chat_notification(self.room_id, self.user.id)
            if other_user_id and should_notify:
                await self.channel_layer.group_send(
                    f"user_{other_user_id}",
                    {
                        "type": "send_notification",
                        "data": {
                            "type": "chat",
                            "title": "Tin nhắn mới",
                            "message": text[:100],
                            "related_id": self.room_id,
                            "sender_id": self.user.id,
                        },
                    }
                )

        elif msg_type == "mark_read":
            await self.mark_messages_read(self.room_id, self.user.id)

        elif msg_type == "ping":
            await self.send_json({"type": "pong"})

    async def chat_message(self, event):
        """Handler for chat_message group event."""
        await self.send_json({
            "type": "chat_message",
            "data": event["data"],
        })

    @database_sync_to_async
    def check_room_membership(self, room_id, user_id):
        from .models import ChatRoom, ConversationParticipant
        from django.db.models import Q
        if ConversationParticipant.objects.filter(
            conversation_id=room_id,
            user_id=user_id,
            is_active=True,
            conversation__deleted_at__isnull=True,
        ).exists():
            return True
        return ChatRoom.objects.filter(
            Q(pk=room_id) & (Q(user1_id=user_id) | Q(user2_id=user_id))
        ).exists()

    @database_sync_to_async
    def save_message(self, room_id, sender_id, content):
        from django.utils import timezone
        from .models import ChatMessage, ChatRoom, Conversation, Message, MessageDeliveryState
        conversation = Conversation.objects.filter(
            pk=room_id,
            deleted_at__isnull=True,
        ).first()
        if conversation:
            msg = Message.objects.create(
                conversation=conversation,
                sender_id=sender_id,
                type=Message.TYPE_TEXT,
                text_content=content,
            )
            conversation.last_message = msg
            conversation.last_message_at = msg.created_at
            conversation.save(update_fields=['last_message', 'last_message_at', 'updated_at'])
            other_participant_ids = list(
                conversation.participants.filter(is_active=True).exclude(user_id=sender_id).values_list('user_id', flat=True)
            )
            MessageDeliveryState.objects.bulk_create([
                MessageDeliveryState(message=msg, user_id=uid, delivered_at=timezone.now())
                for uid in other_participant_ids
            ])
            return {
                "id": msg.id,
                "room": conversation.id,
                "sender": msg.sender_id,
                "sender_name": (
                    getattr(msg.sender, "full_name", None)
                    or getattr(msg.sender, "username", None)
                    or getattr(msg.sender, "email", None)
                    or str(msg.sender_id)
                ),
                "content": msg.text_content or "",
                "is_read": False,
                "created_at": msg.created_at.isoformat(),
            }

        msg = ChatMessage.objects.create(
            room_id=room_id, sender_id=sender_id, content=content
        )

        ChatRoom.objects.filter(pk=room_id).update(updated_at=msg.created_at)
        return {
            "id": msg.id,
            "room": msg.room_id,
            "sender": msg.sender_id,
            "sender_name": (
                getattr(msg.sender, "full_name", None)
                or getattr(msg.sender, "username", None)
                or getattr(msg.sender, "email", None)
                or str(msg.sender_id)
            ),
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat(),
        }

    @database_sync_to_async
    def get_other_user_id(self, room_id, user_id):
        from .models import ChatRoom, Conversation
        conversation = Conversation.objects.filter(
            pk=room_id,
            type=Conversation.TYPE_DIRECT,
            deleted_at__isnull=True,
        ).first()
        if conversation:
            participant = conversation.participants.filter(is_active=True).exclude(user_id=user_id).first()
            return participant.user_id if participant else None
        try:
            room = ChatRoom.objects.get(pk=room_id)
            return room.user2_id if room.user1_id == user_id else room.user1_id
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_messages_read(self, room_id, user_id):
        from django.utils import timezone
        from .models import ChatMessage, ConversationParticipant, MessageDeliveryState, Message
        membership = ConversationParticipant.objects.filter(
            conversation_id=room_id,
            user_id=user_id,
            is_active=True,
            conversation__deleted_at__isnull=True,
        ).first()
        if membership:
            latest_message = Message.objects.filter(conversation_id=room_id).order_by('-created_at').first()
            membership.last_read_message = latest_message
            membership.last_read_at = timezone.now()
            membership.save(update_fields=['last_read_message', 'last_read_at'])
            MessageDeliveryState.objects.filter(
                message__conversation_id=room_id,
                user_id=user_id,
                read_at__isnull=True,
            ).update(read_at=timezone.now())
            return
        ChatMessage.objects.filter(
            room_id=room_id, is_read=False
        ).exclude(sender_id=user_id).update(is_read=True)

    @database_sync_to_async
    def other_user_allows_messages(self, room_id, user_id):
        from .models import ChatRoom, Conversation
        from users.preferences import is_direct_message_allowed
        conversation = Conversation.objects.filter(
            pk=room_id,
            deleted_at__isnull=True,
        ).first()
        if conversation:
            if conversation.type != Conversation.TYPE_DIRECT:
                return True
            participant = conversation.participants.filter(is_active=True).exclude(user_id=user_id).first()
            if not participant:
                return False
            return is_direct_message_allowed(participant.user_id)
        try:
            room = ChatRoom.objects.get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return False
        other_user_id = room.user2_id if room.user1_id == user_id else room.user1_id
        return is_direct_message_allowed(other_user_id)

    @database_sync_to_async
    def should_send_chat_notification(self, room_id, user_id):
        from .models import ChatRoom, Conversation
        from users.preferences import is_notification_allowed
        conversation = Conversation.objects.filter(
            pk=room_id,
            deleted_at__isnull=True,
        ).first()
        if conversation:
            if conversation.type != Conversation.TYPE_DIRECT:
                return False
            participant = conversation.participants.filter(is_active=True).exclude(user_id=user_id).first()
            if not participant:
                return False
            return is_notification_allowed(participant.user_id, "other", "chat_message")
        try:
            room = ChatRoom.objects.get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return False
        other_user_id = room.user2_id if room.user1_id == user_id else room.user1_id
        return is_notification_allowed(other_user_id, "other", "chat_message")


class LessonCommentConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.lesson_id = self.scope["url_route"]["kwargs"]["lesson_id"]
        self.group_name = f"lesson_{self.lesson_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_comment(self, event):
        await self.send_json(event["data"])
