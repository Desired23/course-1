from rest_framework.exceptions import ValidationError
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
        if not forum_topic_list.exists():
            raise ValidationError("No Forum Topics found for this forum_id.")
        return ForumTopicSerializer(forum_topic_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Topics: {str(e)}")

def get_forum_topics_by_user_id(user_id):
    try:
        forum_topic_list = ForumTopic.objects.filter(user=user_id)
        if not forum_topic_list.exists():
            raise ValidationError("No Forum Topics found for this user_id.")
        return ForumTopicSerializer(forum_topic_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Topics: {str(e)}")

def get_all_forum_topics():
    try:
        forum_topic_list = ForumTopic.objects.all()
        if not forum_topic_list.exists():
            raise ValidationError("No Forum Topics found.")
        return ForumTopicSerializer(forum_topic_list, many=True).data
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