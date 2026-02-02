from rest_framework.exceptions import ValidationError
from .models import ForumComment
from .serializers import ForumCommentSerializer

def create_forum_comment(data):
    try:
        serializer = ForumCommentSerializer(data=data)
        if serializer.is_valid():
            forum_comment = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating Forum Comment: {str(e)}")

def get_forum_comment_by_id(comment_id):
    try:
        forum_comment = ForumComment.objects.get(id=comment_id)
        return ForumCommentSerializer(forum_comment).data
    except ForumComment.DoesNotExist:
        raise ValidationError("Forum Comment not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Comment: {str(e)}")

def get_forum_comments_by_topic_id(topic_id):
    try:
        forum_comment_list = ForumComment.objects.filter(topic_id=topic_id)
        if not forum_comment_list.exists():
            raise ValidationError("No Forum Comments found for this topic_id.")
        return ForumCommentSerializer(forum_comment_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Comments: {str(e)}")

def get_forum_comments_by_user_id(user_id):
    try:
        forum_comment_list = ForumComment.objects.filter(user_id=user_id)
        if not forum_comment_list.exists():
            raise ValidationError("No Forum Comments found for this user_id.")
        return ForumCommentSerializer(forum_comment_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving Forum Comments: {str(e)}")

def get_all_forum_comments():
    try:
        forum_comment_list = ForumComment.objects.all()
        if not forum_comment_list.exists():
            raise ValidationError("No Forum Comments found.")
        return ForumCommentSerializer(forum_comment_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving all Forum Comments: {str(e)}")

def update_forum_comment(comment_id, data):
    try:
        forum_comment = ForumComment.objects.get(id=comment_id)
        serializer = ForumCommentSerializer(forum_comment, data=data, partial=True)
        if serializer.is_valid():
            updated_forum_comment = serializer.save()
            return ForumCommentSerializer(updated_forum_comment).data
        else:
            raise ValidationError(serializer.errors)
    except ForumComment.DoesNotExist:
        raise ValidationError("Forum Comment not found")
    except Exception as e:
        raise ValidationError(f"Error updating Forum Comment: {str(e)}")

def delete_forum_comment(comment_id):
    try:
        forum_comment = ForumComment.objects.get(id=comment_id)
        forum_comment.delete()
        return {"message": "Forum Comment deleted successfully"}
    except ForumComment.DoesNotExist:
        raise ValidationError("Forum Comment not found")
    except Exception as e:
        raise ValidationError(f"Error deleting Forum Comment: {str(e)}")