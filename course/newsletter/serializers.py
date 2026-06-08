from rest_framework import serializers
from .models import Subscriber, NewsletterCampaign


class SubscriberSerializer(serializers.ModelSerializer):
    subscriber_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = Subscriber
        fields = [
            'subscriber_id',
            'email',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['subscriber_id', 'is_active', 'created_at', 'updated_at']


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()


class CampaignSerializer(serializers.ModelSerializer):
    campaign_id = serializers.IntegerField(source='id', read_only=True)
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = NewsletterCampaign
        fields = [
            'campaign_id',
            'subject',
            'content',
            'audience',
            'recipient_count',
            'sent_by_name',
            'created_at',
        ]

    def get_sent_by_name(self, obj):
        try:
            return obj.sent_by.full_name
        except Exception:
            return None


class CampaignCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    content = serializers.CharField()
    audience = serializers.ChoiceField(
        choices=NewsletterCampaign.Audience.choices,
        default=NewsletterCampaign.Audience.SUBSCRIBERS,
    )
