from rest_framework.exceptions import ValidationError
from .models import LessonComment
from .serializers import LessonCommentSerializer
from utils.input_validators import MAX_COMMENT_LENGTH, validate_plain_user_text
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def _broadcast_comment(lesson_id, action, payload):
    channel_layer = get_channel_layer()
    if not channel_layer or not lesson_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"lesson_{lesson_id}",
        {"type": "send_comment", "data": {"action": action, "comment": payload}},
    )

def _ensure_lesson_interaction_allowed(lesson_id):
    from lessons.models import Lesson
    from utils.course_access import ensure_course_interaction_allowed
    lesson = Lesson.objects.select_related('coursemodule__course').filter(id=lesson_id).first()
    course = lesson.coursemodule.course if lesson and lesson.coursemodule else None
    ensure_course_interaction_allowed(course)


def create_lesson_comment(user_id, lesson_id, content, parent_comment=None):
    _ensure_lesson_interaction_allowed(lesson_id)
    try:
        serializer = LessonCommentSerializer(data={
            'user': user_id,
            'lesson': lesson_id,
            'content': content,
            'parent_comment': parent_comment
        })
        if serializer.is_valid():
            serializer.save()
            _broadcast_comment(serializer.data.get('lesson'), 'created', dict(serializer.data))
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating lesson comment: {str(e)}")
def update_lesson_comment(comment_id, content, votes=None):
    existing = LessonComment.objects.filter(id=comment_id).first()
    if existing:
        _ensure_lesson_interaction_allowed(existing.lesson_id)
    try:
        comment = LessonComment.objects.get(id=comment_id)
        if content:
            comment.content = validate_plain_user_text(
                content,
                field_label="Nội dung bình luận",
                max_length=MAX_COMMENT_LENGTH,
            )
        if votes is not None:
            comment.votes = votes
        comment.save()
        data = LessonCommentSerializer(comment).data
        _broadcast_comment(data.get('lesson'), 'updated', dict(data))
        return data
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found")
    except Exception as e:
        raise ValidationError(f"Error updating lesson comment: {str(e)}")
def delete_lesson_comment(comment_id):
    try:
        comment = LessonComment.objects.get(id=comment_id, is_deleted=False)
        lesson_id = comment.lesson_id
        comment.delete()
        _broadcast_comment(lesson_id, 'deleted', {"id": comment_id, "lesson": lesson_id})
        return {"message": "Comment deleted successfully"}
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found")
    except Exception as e:
        raise ValidationError(f"Error deleting lesson comment: {str(e)}")
def get_root_comments(lesson_id):
    try:
        root_comments = LessonComment.objects.filter(
            lesson=lesson_id,
            parent_comment__isnull=True,
            is_deleted=False,
            status='active',
        ).select_related('user')
        return root_comments
    except Exception as e:
        raise ValidationError(f"Error retrieving root comments: {str(e)}")
def get_comment_replies(comment_id):
    try:
        replies = LessonComment.objects.filter(
            parent_comment_id=comment_id,
            is_deleted=False,
            status='active',
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


def moderate_lesson_comment(comment_id, action, reason=''):
    from django.utils import timezone
    try:
        comment = LessonComment.objects.get(id=comment_id, is_deleted=False)
    except LessonComment.DoesNotExist:
        raise ValidationError("Lesson comment not found.")

    action = (action or '').strip().lower()
    if action == 'approve':
        comment.status = 'active'
    elif action == 'dismiss':
        pass
    elif action == 'hide':
        comment.status = 'deleted'
    elif action == 'delete':
        comment.status = 'deleted'
        comment.is_deleted = True
        comment.deleted_at = timezone.now()
        comment.deleted_by = None
    else:
        raise ValidationError({'error': 'Invalid action. Use: approve, dismiss, hide, delete'})

    comment.save()
    try:
        if action in ('hide', 'delete'):
            from notifications.services import create_notification
            create_notification(
                receiver_id=comment.user_id,
                title="Bình luận của bạn đã bị xử lý",
                message="Bình luận của bạn đã bị gỡ do vi phạm chính sách.",
                type='other',
                related_id=comment.id,
                notification_code='lesson_comment_moderated',
            )
    except Exception:
        pass
    return comment
