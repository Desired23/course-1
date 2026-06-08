from django.db import models
from users.models import User


class Subscriber(models.Model):
    email = models.EmailField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'NewsletterSubscribers'

    def __str__(self):
        return self.email


class NewsletterCampaign(models.Model):
    class Audience(models.TextChoices):
        SUBSCRIBERS = 'subscribers', 'Subscribers'
        ALL_USERS = 'all_users', 'All users'

    subject = models.CharField(max_length=255)
    content = models.TextField()
    audience = models.CharField(
        max_length=20,
        choices=Audience.choices,
        default=Audience.SUBSCRIBERS,
    )
    recipient_count = models.IntegerField(default=0)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='newsletter_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'NewsletterCampaigns'

    def __str__(self):
        return f"{self.subject} ({self.audience})"
