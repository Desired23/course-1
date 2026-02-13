from django.db import models
from users.models import User
from forum_topics.models import ForumTopic

class ForumComment(models.Model):
    STATUS_CHOICES = [
        ('active', 'active'),
        ('deleted', 'deleted'),
    ]

    id = models.AutoField(primary_key=True)
    topic = models.ForeignKey(ForumTopic, on_delete=models.CASCADE, related_name='comments_topic')
    content = models.TextField()
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='comments_user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_forum_comments')
    is_deleted = models.BooleanField(default=False)
    parent = models.ForeignKey('self',null=True,blank=True,on_delete=models.SET_NULL,related_name='replies')
    likes = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='aactive')
    is_best_answer = models.BooleanField(default=False)

    class Meta:
        db_table = 'ForumComments'

    def __str__(self):
        return f"Comment {self.id} on Topic {self.topic.id} by User {self.user.id}"
