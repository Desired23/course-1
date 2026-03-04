from rest_framework.exceptions import ValidationError
from .models import LessonComment
from .serializers import LessonCommentSerializer

def create_lesson_comment(user_id, lesson_id, content, parent_comment=None):
    try:
        serializer = LessonCommentSerializer(data={
            'user': user_id,
            'lesson': lesson_id,
            'content': content,
            'parent_comment': parent_comment
        })
        if serializer.is_valid():
            serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating lesson comment: {str(e)}")
def update_lesson_comment(comment_id, content, votes=None):
    try:
        comment = LessonComment.objects.get(id=comment_id)
        if content:
            comment.content = content
        if votes is not None:
            comment.votes = votes
        comment.save()
        return LessonCommentSerializer(comment).data
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found")
    except Exception as e:
        raise ValidationError(f"Error updating lesson comment: {str(e)}")
def delete_lesson_comment(comment_id):
    try:
        comment = LessonComment.objects.get(id=comment_id)
        comment.delete()
        return {"message": "Comment deleted successfully"}
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found")
    except Exception as e:
        raise ValidationError(f"Error deleting lesson comment: {str(e)}")
def get_root_comments(lesson_id):
    try:
        root_comments = LessonComment.objects.filter(
            lesson=lesson_id,
            parent_comment__isnull=True
        ).select_related('user')\
         .order_by('-created_at')
        return root_comments
    except Exception as e:
        raise ValidationError(f"Error retrieving root comments: {str(e)}")
def get_comment_replies(comment_id):
    try:
        replies = LessonComment.objects.filter(
            parent_comment_id=comment_id
        ).select_related('user')\
         .order_by('created_at')
        return replies
    except Exception as e:
        raise ValidationError(f"Error retrieving replies: {str(e)}")
def get_comment_by_id(comment_id):
    try:
        comment = LessonComment.objects.get(id=comment_id)
        return LessonCommentSerializer(comment).data
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving lesson comment: {str(e)}")
def get_comments_by_user(user_id):
    try:
        comments = LessonComment.objects.filter(user=user_id)
        return comments
    except Exception as e:
        raise ValidationError(f"Error retrieving comments by user: {str(e)}")
