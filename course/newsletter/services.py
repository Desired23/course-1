import logging
import threading

from rest_framework.exceptions import ValidationError
from django.utils import timezone

from users.models import User
from .models import Subscriber, NewsletterCampaign
from .serializers import SubscriberSerializer

logger = logging.getLogger(__name__)


def subscribe_email(email):
    """Create a subscriber, or reactivate one that previously unsubscribed/soft-deleted."""
    email = (email or '').strip().lower()
    if not email:
        raise ValidationError({"email": "Email không hợp lệ."})

    existing = Subscriber.objects.filter(email=email).first()
    if existing:
        if not existing.is_active or existing.is_deleted:
            existing.is_active = True
            existing.is_deleted = False
            existing.deleted_at = None
            existing.save(update_fields=['is_active', 'is_deleted', 'deleted_at', 'updated_at'])
        return SubscriberSerializer(existing).data

    subscriber = Subscriber.objects.create(email=email)
    return SubscriberSerializer(subscriber).data


def get_subscribers():
    return Subscriber.objects.filter(is_deleted=False)


def get_campaigns():
    return NewsletterCampaign.objects.select_related('sent_by')


def _send_bulk(recipients, subject, content):
    """Send the campaign to each recipient. Runs in a background thread."""
    from utils.mailer.mailer import send_newsletter
    sent = 0
    for email in recipients:
        try:
            send_newsletter(email, subject, content)
            sent += 1
        except Exception as e:
            logger.error(f"[Newsletter] Failed to send to {email}: {e}")
    logger.info(f"[Newsletter] Bulk send finished: {sent}/{len(recipients)} delivered.")


def send_campaign(subject, content, audience, admin_user):
    """Record the campaign and dispatch emails in a background thread (non-blocking)."""
    active_users = User.objects.filter(is_deleted=False, status=User.StatusChoices.ACTIVE).exclude(email='')

    if audience == NewsletterCampaign.Audience.ALL_USERS:
        recipients = list(active_users.values_list('email', flat=True))
    elif audience == NewsletterCampaign.Audience.INSTRUCTORS:
        recipients = list(
            active_users.filter(instructor__isnull=False, instructor__is_deleted=False)
            .values_list('email', flat=True)
        )
    elif audience == NewsletterCampaign.Audience.STUDENTS:
        recipients = list(
            active_users.filter(instructor__isnull=True, admin__isnull=True)
            .values_list('email', flat=True)
        )
    else:
        recipients = list(
            Subscriber.objects.filter(is_active=True, is_deleted=False)
            .values_list('email', flat=True)
        )

    recipients = list(dict.fromkeys(recipients))  # de-dupe, preserve order

    campaign = NewsletterCampaign.objects.create(
        subject=subject,
        content=content,
        audience=audience,
        recipient_count=len(recipients),
        sent_by=admin_user,
    )

    if recipients:
        threading.Thread(
            target=_send_bulk,
            args=(recipients, subject, content),
            daemon=True,
        ).start()

    return {
        "campaign_id": campaign.id,
        "recipient_count": campaign.recipient_count,
    }
