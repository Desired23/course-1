from django.db import models
from forums.models import Forum
from users.models import User

class ForumTopic(models.Model):
    id = models.AutoField(primary_key=True)
    forum = models.ForeignKey('forums.Forum', on_delete=models.CASCADE, related_name='topics_forum')
    title = models.CharField(max_length=255)
    content = models.TextField()
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='topics_user', db_column='user_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_forum_topics')
    is_deleted = models.BooleanField(default=False)
    views = models.IntegerField(default=0)
    likes = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=[
        ('active', 'active'),
        ('locked', 'locked'),
        ('deleted', 'deleted'),
    ], default='locked')
    is_pinned = models.BooleanField(default=False)

    class Meta:
        db_table = 'ForumTopics'

    def __str__(self):
        return f"Topic {self.id}: {self.title} by {self.user.id}"