from rest_framework.exceptions import ValidationError
from .models import BlogComment
from .serializers import BlogCommentSerializer


def create_blog_comment(data):
    serializer = BlogCommentSerializer(data=data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    comment = serializer.save()
    try:
        from notifications.services import create_notification
        if comment.blog_post_id and comment.blog_post.author_id and comment.blog_post.author_id != comment.user_id:
            create_notification(
                receiver_id=comment.blog_post.author_id,
                title="Bài viết của bạn có bình luận mới",
                message=f"Có người vừa bình luận trên bài \"{comment.blog_post.title}\".",
                type='other',
                related_id=comment.id,
                sender=comment.user_id,
                notification_code='blog_comment_received',
            )
    except Exception:
        pass
    return BlogCommentSerializer(comment).data


def get_blog_comment_by_id(comment_id):
    try:
        return BlogCommentSerializer(BlogComment.objects.get(id=comment_id)).data
    except BlogComment.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Blog Comment not found")


def get_blog_comments_by_post_id(post_id):
    return BlogComment.objects.filter(blog_post=post_id, status='active').order_by('-created_at', '-id')


def get_blog_comments_by_user_id(user_id):
    return BlogComment.objects.filter(user=user_id).order_by('-created_at', '-id')


def get_all_blog_comments():
    return BlogComment.objects.all().order_by('-created_at', '-id')


def update_blog_comment(comment_id, data):
    try:
        blog_comment = BlogComment.objects.get(id=comment_id)
    except BlogComment.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Blog Comment not found")
    serializer = BlogCommentSerializer(blog_comment, data=data, partial=True)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    return BlogCommentSerializer(serializer.save()).data


def delete_blog_comment(comment_id):
    try:
        blog_comment = BlogComment.objects.get(id=comment_id)
    except BlogComment.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Blog Comment not found")
    blog_comment.delete()
    return {"message": "Blog Comment deleted successfully"}


def moderate_blog_comment(comment_id, action, reason=''):
    from rest_framework.exceptions import NotFound
    from django.utils import timezone
    try:
        comment = BlogComment.objects.get(id=comment_id, is_deleted=False)
    except BlogComment.DoesNotExist:
        raise NotFound("Blog comment not found.")

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
                notification_code='blog_comment_moderated',
            )
    except Exception:
        pass
    return comment
