from django.urls import path
from .views import (
    NewsletterSubscribeView,
    NewsletterSubscriberListView,
    NewsletterSendView,
    NewsletterCampaignListView,
)

urlpatterns = [
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='newsletter-subscribe'),
    path('newsletter/subscribers/', NewsletterSubscriberListView.as_view(), name='newsletter-subscribers'),
    path('newsletter/send/', NewsletterSendView.as_view(), name='newsletter-send'),
    path('newsletter/campaigns/', NewsletterCampaignListView.as_view(), name='newsletter-campaigns'),
]
