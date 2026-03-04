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
