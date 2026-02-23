from rest_framework.exceptions import ValidationError
from .models import Forum
from .serializers import ForumSerializer

def create_forum(data):
    try:
        serializer = ForumSerializer(data=data)
        if serializer.is_valid():
            forum = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating Forum: {str(e)}")

def get_forum_by_id(forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        return ForumSerializer(forum).data
    except Forum.DoesNotExist:
        raise ValidationError("Forum not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum: {str(e)}")

def get_forums_by_course_id(course_id):
    try:
        forum_list = Forum.objects.filter(course=course_id)
        return forum_list
    except Exception as e:
        raise ValidationError(f"Error retrieving Forums: {str(e)}")

def get_all_forums():
    try:
        forum_list = Forum.objects.all()
        return forum_list
    except Exception as e:
        raise ValidationError(f"Error retrieving all Forums: {str(e)}")

def update_forum(forum_id, data):
    try:
        forum = Forum.objects.get(id=forum_id)
        serializer = ForumSerializer(forum, data=data, partial=True)
        if serializer.is_valid():
            updated_forum = serializer.save()
            return ForumSerializer(updated_forum).data
        else:
            raise ValidationError(serializer.errors)
    except Forum.DoesNotExist:
        raise ValidationError("Forum not found")
    except Exception as e:
        raise ValidationError(f"Error updating Forum: {str(e)}")

def delete_forum(forum_id):
    try:
        forum = Forum.objects.get(id=forum_id)
        forum.delete()
        return {"message": "Forum deleted successfully"}
    except Forum.DoesNotExist:
        raise ValidationError("Forum not found")
    except Exception as e:
        raise ValidationError(f"Error deleting Forum: {str(e)}")