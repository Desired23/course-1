from django.db import migrations


def backfill_direct_conversations(apps, schema_editor):
    ChatRoom = apps.get_model('realtime', 'ChatRoom')
    ChatMessage = apps.get_model('realtime', 'ChatMessage')
    Conversation = apps.get_model('realtime', 'Conversation')
    ConversationParticipant = apps.get_model('realtime', 'ConversationParticipant')
    Message = apps.get_model('realtime', 'Message')

    for room in ChatRoom.objects.all().iterator():
        participant_ids = sorted([room.user1_id, room.user2_id])
        existing = None
        for conversation in Conversation.objects.filter(type='direct', deleted_at__isnull=True).iterator():
            ids = sorted(
                conversation.participants.filter(is_active=True).values_list('user_id', flat=True)
            )
            if ids == participant_ids:
                existing = conversation
                break

        if existing is None:
            conversation = Conversation.objects.create(
                type='direct',
                created_by_id=room.user1_id,
                owner_id=room.user1_id,
                created_at=room.created_at,
                updated_at=room.updated_at,
                last_message_at=room.updated_at,
            )
            ConversationParticipant.objects.create(
                conversation_id=conversation.id,
                user_id=room.user1_id,
                role='owner',
                joined_at=room.created_at,
                is_active=True,
                can_add_members=False,
                can_change_group_info=False,
            )
            ConversationParticipant.objects.create(
                conversation_id=conversation.id,
                user_id=room.user2_id,
                role='member',
                joined_at=room.created_at,
                is_active=True,
                can_add_members=False,
                can_change_group_info=False,
            )
        else:
            conversation = existing

        existing_message_ids = {
            metadata.get('legacy_message_id')
            for metadata in Message.objects.filter(
                conversation_id=conversation.id,
                metadata__legacy_room_id=room.id,
            ).values_list('metadata', flat=True)
            if isinstance(metadata, dict) and metadata.get('legacy_message_id') is not None
        }

        room_messages = ChatMessage.objects.filter(room_id=room.id).order_by('created_at')
        last_new_message = None
        for legacy_message in room_messages.iterator():
            if legacy_message.id in existing_message_ids:
                continue
            last_new_message = Message.objects.create(
                conversation_id=conversation.id,
                sender_id=legacy_message.sender_id,
                type='text',
                text_content=legacy_message.content,
                status='active',
                metadata={
                    'legacy_room_id': room.id,
                    'legacy_message_id': legacy_message.id,
                    'legacy_is_read': legacy_message.is_read,
                },
                created_at=legacy_message.created_at,
                updated_at=legacy_message.created_at,
            )

        latest_message = (
            Message.objects.filter(conversation_id=conversation.id)
            .order_by('-created_at')
            .first()
        )
        if latest_message:
            Conversation.objects.filter(id=conversation.id).update(
                last_message_id=latest_message.id,
                last_message_at=latest_message.created_at,
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('realtime', '0002_conversation_message_conversationparticipant_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_direct_conversations, noop_reverse),
    ]
