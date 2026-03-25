from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .models import ForumTopic
from .serializers import ForumTopicSerializer

def create_forum_topic(data):
    try:
        serializer = ForumTopicSerializer(data=data)
        if serializer.is_valid():
            forum_topic = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating Forum Topic: {str(e)}")

def get_forum_topic_by_id(topic_id):
    try:
        forum_topic = ForumTopic.objects.get(id=topic_id)
        return ForumTopicSerializer(forum_topic).data
    except ForumTopic.DoesNotExist:
        raise ValidationError("Forum Topic not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Topic: {str(e)}")

def get_forum_topics_by_forum_id(forum_id):
    try:
        forum_topic_list = ForumTopic.objects.filter(forum=forum_id)
        return forum_topic_list
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Topics: {str(e)}")

def get_forum_topics_by_user_id(user_id):
    try:
        forum_topic_list = ForumTopic.objects.filter(user=user_id)
        return forum_topic_list
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Topics: {str(e)}")

def get_all_forum_topics(reported_only=False):
    try:
        forum_topic_list = ForumTopic.objects.all()
        if reported_only:
            forum_topic_list = forum_topic_list.filter(report_count__gt=0)
        return forum_topic_list
    except Exception as e:
        raise ValidationError(f"Error retrieving all Forum Topics: {str(e)}")

def update_forum_topic(topic_id, data):
    try:
        forum_topic = ForumTopic.objects.get(id=topic_id)
        serializer = ForumTopicSerializer(forum_topic, data=data, partial=True)
        if serializer.is_valid():
            updated_forum_topic = serializer.save()
            return ForumTopicSerializer(updated_forum_topic).data
        else:
            raise ValidationError(serializer.errors)
    except ForumTopic.DoesNotExist:
        raise ValidationError("Forum Topic not found")
    except Exception as e:
        raise ValidationError(f"Error updating Forum Topic: {str(e)}")

def delete_forum_topic(topic_id):
    try:
        forum_topic = ForumTopic.objects.get(id=topic_id)
        forum_topic.delete()
        return {"message": "Forum Topic deleted successfully"}
    except ForumTopic.DoesNotExist:
        raise ValidationError("Forum Topic not found")
    except Exception as e:
        raise ValidationError(f"Error deleting Forum Topic: {str(e)}")


def report_forum_topic(topic_id, reason=''):
    try:
        forum_topic = ForumTopic.objects.get(id=topic_id)
        forum_topic.report_count += 1
        forum_topic.last_report_reason = (reason or '').strip() or forum_topic.last_report_reason
        forum_topic.last_reported_at = timezone.now()
        forum_topic.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at'])
        return ForumTopicSerializer(forum_topic).data
    except ForumTopic.DoesNotExist:
        raise ValidationError("Forum Topic not found")
    except Exception as e:
        raise ValidationError(f"Error reporting Forum Topic: {str(e)}")


def moderate_forum_topic(topic_id, action, reason=''):
    try:
        forum_topic = ForumTopic.objects.get(id=topic_id)
    except ForumTopic.DoesNotExist:
        raise ValidationError("Forum Topic not found")

    action = (action or '').strip().lower()
    if action == 'approve':
        forum_topic.status = 'active'
        forum_topic.report_count = 0
        forum_topic.last_report_reason = (reason or '').strip() or forum_topic.last_report_reason
    elif action == 'dismiss':
        forum_topic.report_count = 0
        forum_topic.last_report_reason = (reason or '').strip() or forum_topic.last_report_reason
    elif action == 'lock':
        forum_topic.status = 'locked'
        forum_topic.report_count = 0
        forum_topic.last_report_reason = (reason or '').strip() or forum_topic.last_report_reason
    elif action == 'delete':
        forum_topic.status = 'deleted'
        forum_topic.report_count = 0
        forum_topic.last_report_reason = (reason or '').strip() or forum_topic.last_report_reason
    else:
        raise ValidationError("Invalid moderation action")

    forum_topic.save(update_fields=['status', 'report_count', 'last_report_reason', 'updated_at'])
    return ForumTopicSerializer(forum_topic).data
