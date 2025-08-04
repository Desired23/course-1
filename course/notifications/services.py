from rest_framework.exceptions import ValidationError
from .serializers import NotificationSerializer
from .models import Notification
from users.models import User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
def create_notification(user_id, title, message, type, related_id=None, sender=None):
    try:
        serializer = NotificationSerializer(data={
            'user_id': user_id,
            'title': title,
            'message': message,
            'type': type,
            'related_id': related_id
        })
        if serializer.is_valid():
            serializer.save()
            channel_layer = get_channel_layer()
            dataws = dict(serializer.data)
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
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
    
def get_notification_by_id(notification_id):
    try:
        notification = Notification.objects.get(notification_id=notification_id)
        return NotificationSerializer(notification).data
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving notification: {str(e)}")
def get_notifications_by_user(user_id):
    try:
        notifications = Notification.objects.filter(user_id=user_id)
        return NotificationSerializer(notifications, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving notifications: {str(e)}")
def mark_notification_as_read(notification_id):
    try:
        notification = Notification.objects.get(notification_id=notification_id)
        notification.is_read = True
        notification.save()
        return NotificationSerializer(notification).data
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error marking notification as read: {str(e)}")
def mark_all_notifications_as_read(user_id):
    try:
        userCheck = User.objects.filter(user_id=user_id)
        if not userCheck.exists():
            raise ValidationError("User not found")

        notifications = Notification.objects.filter(user_id=user_id, is_read=False)
        notifications.update(is_read=True)
        return {"message": "All notifications marked as read"}
    except Exception as e:
        raise ValidationError(f"Error marking notifications as read: {str(e)}")
def delete_notification_by_admin(notification_code):
    try:
        if not notification_code:
            raise ValidationError("notification_code is required")
        notifications = Notification.objects.filter(notification_code=notification_code)
        if not notifications.exists():
            raise ValidationError("Notification not found")
        notifications.delete()
        return {"message": f"Notification {notification_code} to all user deleted successfully"}
    except Notification.DoesNotExist:
        raise ValidationError("Notification not found")
    except Exception as e:
        raise ValidationError(f"Error deleting notification: {str(e)}")
def notification_to_users(notification_code, user_ids, title, message, type, related_id=None):
    try:
        channel_layer = get_channel_layer()
        success_count = 0
        for uid in user_ids:
            data = {
                "user_id": uid,
                "title": title,
                "message": message,
                "type": type,
                "notification_code": notification_code,
                "related_id": related_id
            }
            serializer = NotificationSerializer(data=data)

            if serializer.is_valid():
                serializer.save()
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
                "code": notification_code
            }
    except Exception as e:
        raise ValidationError(f"Error sending notifications: {str(e)}")