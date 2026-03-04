from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset


class ChatRoomListView(APIView):
    """List user's chat rooms or create a new one."""
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        user_id = int(user_id)
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
        messages = ChatMessage.objects.filter(room_id=room_id).select_related('sender').order_by('-created_at')
        return paginate_queryset(messages, request, ChatMessageSerializer)

    def post(self, request, room_id):
        """REST fallback for sending messages (WebSocket preferred)."""
        data = {
            'room': room_id,
            'sender': request.data.get('sender_id'),
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
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        updated = ChatMessage.objects.filter(
            room_id=room_id, is_read=False
        ).exclude(sender_id=user_id).update(is_read=True)
        return Response({"marked_read": updated})
