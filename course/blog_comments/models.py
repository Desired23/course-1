from django.db import models
from users.models import User
from blog_posts.models import BlogPost


class BlogComment(models.Model):
    STATUS_CHOICES = [
        ('active', 'active'),
        ('deleted', 'deleted'),
    ]

    id = models.AutoField(primary_key=True)
    blog_post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='comments_blog_post')
    content = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_comments_user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_blog_comments')
    is_deleted = models.BooleanField(default=False)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    likes = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'BlogComments'

    def __str__(self):
        return f"Comment {self.id} on BlogPost {self.blog_post.id} by User {self.user.id}"
