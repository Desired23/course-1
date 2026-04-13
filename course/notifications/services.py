from rest_framework.exceptions import ValidationError
from .serializers import NotificationSerializer
from .models import Notification
from users.models import User
from users.preferences import is_notification_allowed
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

def create_notification(receiver_id, title, message, type, related_id=None, sender=None, notification_code=None):
    try:
        if not receiver_id:
            raise ValidationError({"receiver_id": ["This field is required."]})

        if not is_notification_allowed(int(receiver_id), type, notification_code):
            return {
                "skipped": True,
                "reason": "notification_preference_disabled",
                "receiver_id": int(receiver_id),
            }

        data = {
            'receiver': receiver_id,
            'title': title,
            'message': message,
            'type': type,
            'related_id': related_id,
            'notification_code': notification_code,
        }
        if sender:
            data['sender'] = sender
        serializer = NotificationSerializer(data=data)
        if serializer.is_valid():
            serializer.save()

            channel_layer = get_channel_layer()
            if channel_layer:
                dataws = dict(serializer.data)
                async_to_sync(channel_layer.group_send)(
                    f"user_{receiver_id}",
                    {
                        "type": "send_notification",
                        "data":  dataws,

                    }
                )

            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating notification: {str(e)}")

def get_notification_by_id(notification_id, user_id=None):
    try:
        qs = Notification.objects.filter(id=notification_id, is_deleted=False)
        if user_id is not None:
            qs = qs.filter(receiver_id=user_id)
        notification = qs.get()
        return NotificationSerializer(notification).data
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving notification: {str(e)}")
def get_notifications_by_user(user_id):
    try:
        notifications = Notification.objects.filter(receiver=user_id, is_deleted=False)
        hidden_ids = []
        for item in notifications.only('id', 'type', 'notification_code'):
            if not is_notification_allowed(int(user_id), item.type, item.notification_code):
                hidden_ids.append(item.id)
        if hidden_ids:
            notifications = notifications.exclude(id__in=hidden_ids)
        return notifications
    except Exception as e:
        raise ValidationError(f"Error retrieving notifications: {str(e)}")
def mark_notification_as_read(notification_id, user_id=None):
    try:
        qs = Notification.objects.filter(id=notification_id, is_deleted=False)
        if user_id is not None:
            qs = qs.filter(receiver_id=user_id)
        notification = qs.get()
        notification.is_read = True
        notification.save()
        return NotificationSerializer(notification).data
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error marking notification as read: {str(e)}")
def mark_all_notifications_as_read(user_id):
    try:
        userCheck = User.objects.filter(id=user_id)
        if not userCheck.exists():
            raise ValidationError("User not found")

        notifications = Notification.objects.filter(receiver=user_id, is_read=False, is_deleted=False)
        notifications.update(is_read=True)
        return {"message": "All notifications marked as read"}
    except Exception as e:
        raise ValidationError(f"Error marking notifications as read: {str(e)}")
def delete_notification_by_admin(notification_code):
    try:
        if not notification_code:
            raise ValidationError("notification_code is required")
        notifications = Notification.objects.filter(notification_code=notification_code, is_deleted=False)
        if not notifications.exists():
            raise ValidationError("Notification not found")
        notifications.update(is_deleted=True, deleted_at=timezone.now())
        return {"message": f"Notification {notification_code} to all user deleted successfully"}
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error deleting notification: {str(e)}")
def notification_to_users(notification_code, user_ids, title, message, type, related_id=None, sender=None):
    try:
        channel_layer = get_channel_layer()
        success_count = 0
        skipped_count = 0
        for uid in user_ids:
            if not is_notification_allowed(int(uid), type, notification_code):
                skipped_count += 1
                continue
            data = {
                "receiver": uid,
                "title": title,
                "message": message,
                "type": type,
                "notification_code": notification_code,
                "related_id": related_id
            }
            if sender is not None:
                data["sender"] = sender.id if hasattr(sender, 'id') else sender
            serializer = NotificationSerializer(data=data)

            if serializer.is_valid():
                serializer.save()

                if channel_layer:
                    dataws = dict(serializer.data)
                    async_to_sync(channel_layer.group_send)(
                        f"user_{uid}",
                        {
                            "type": "send_notification",
                            "data":  dataws,

                        }
                    )
                success_count += 1

            else:
                raise ValidationError(serializer.errors)
        return {
            "message": f"{success_count}/{len(user_ids)} notifications sent successfully.",
            "code": notification_code,
            "sent": success_count,
            "skipped": skipped_count,
        }
    except Exception as e:
        raise ValidationError(f"Error sending notifications: {str(e)}")


def revoke_notification_batch(notification_code, actor):
    try:
        if not notification_code:
            raise ValidationError("notification_code is required")

        notifications = Notification.objects.filter(
            notification_code=notification_code,
            is_deleted=False,
        )
        if hasattr(actor, 'admin'):
            pass
        else:
            notifications = notifications.filter(sender=actor)

        if not notifications.exists():
            raise ValidationError("Notification batch not found")

        receiver_ids = list(notifications.values_list('receiver_id', flat=True).distinct())
        notifications.update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=actor,
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            for uid in receiver_ids:
                async_to_sync(channel_layer.group_send)(
                    f"user_{uid}",
                    {
                        "type": "send_notification_removed",
                        "data": {
                            "notification_code": notification_code,
                        },
                    }
                )

        return {
            "message": "Notification batch revoked successfully.",
            "notification_code": notification_code,
            "affected_users": len(receiver_ids),
        }
    except Exception as e:
        raise ValidationError(f"Error revoking notification batch: {str(e)}")


def update_notification_batch(notification_code, actor, title=None, message=None):
    try:
        if not notification_code:
            raise ValidationError("notification_code is required")

        notifications = Notification.objects.filter(
            notification_code=notification_code,
            is_deleted=False,
        )
        if hasattr(actor, 'admin'):
            pass
        else:
            notifications = notifications.filter(sender=actor)

        if not notifications.exists():
            raise ValidationError("Notification batch not found")

        updates = {}
        if title is not None:
            title = str(title).strip()
            if not title:
                raise ValidationError("title cannot be empty")
            updates["title"] = title
        if message is not None:
            message = str(message).strip()
            if not message:
                raise ValidationError("message cannot be empty")
            updates["message"] = message
        if not updates:
            raise ValidationError("At least one field must be provided")

        notifications.update(**updates, updated_at=timezone.now())

        sample = notifications.order_by('-created_at').first()
        receiver_ids = list(notifications.values_list('receiver_id', flat=True).distinct())

        channel_layer = get_channel_layer()
        if channel_layer and sample:
            payload = NotificationSerializer(sample).data
            for uid in receiver_ids:
                async_to_sync(channel_layer.group_send)(
                    f"user_{uid}",
                    {
                        "type": "send_notification_updated",
                        "data": payload,
                    }
                )

        return NotificationSerializer(sample).data if sample else updates
    except Exception as e:
        raise ValidationError(f"Error updating notification batch: {str(e)}")
