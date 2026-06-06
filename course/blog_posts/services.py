from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from activity_logs.services import log_activity

from utils.roles import is_active_admin

from .models import BlogPost
from .serializers import BlogPostSerializer


def _is_admin(user):
    return is_active_admin(user)


def _check_blog_post_access(blog_post, actor):
    if _is_admin(actor):
        return
    if blog_post.author_id != actor.id:
        raise PermissionDenied("Bạn không có quyền thao tác bài viết này.")


def create_blog_post(data, actor_user, request=None):
    payload = dict(data)
    payload.pop("author", None)
    serializer = BlogPostSerializer(data=payload)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    blog_post = serializer.save(author=actor_user)
    log_activity(
        request=request,
        action="CREATE",
        entity_type="BlogPost",
        entity_id=blog_post.id,
        description=f"Đăng bài blog mới: {blog_post.title}",
    )
    return BlogPostSerializer(blog_post).data


def update_blog_post(blog_post_id, data, actor_user, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
    except BlogPost.DoesNotExist:
        raise NotFound("Blog post not found.")
    _check_blog_post_access(blog_post, actor_user)
    payload = dict(data)
    payload.pop("author", None)
    serializer = BlogPostSerializer(blog_post, data=payload, partial=True)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    serializer.save()
    log_activity(
        request=request,
        action="UPDATE",
        entity_type="BlogPost",
        entity_id=blog_post.id,
        description=f"Cập nhật bài blog: {blog_post.title}",
    )
    return serializer.data


def delete_blog_post(blog_post_id, actor_user, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
    except BlogPost.DoesNotExist:
        raise NotFound("Blog post not found.")
    _check_blog_post_access(blog_post, actor_user)
    title = blog_post.title
    blog_post.delete()
    log_activity(
        request=request,
        action="DELETE",
        entity_type="BlogPost",
        entity_id=blog_post_id,
        description=f"Xóa bài blog: {title}",
    )
    return {"message": "Blog post deleted successfully"}


def _get_blog_post_by_id_or_slug(id_or_slug, **filters):
    try:
        pk = int(id_or_slug)
        return BlogPost.objects.get(id=pk, **filters)
    except (ValueError, TypeError):
        return BlogPost.objects.get(slug=id_or_slug, **filters)


def get_blog_post(blog_post_id, actor_user=None):
    try:
        blog_post = _get_blog_post_by_id_or_slug(blog_post_id)
    except BlogPost.DoesNotExist:
        raise NotFound("Blog post not found.")
    if actor_user is not None:
        _check_blog_post_access(blog_post, actor_user)
    return BlogPostSerializer(blog_post).data


def get_all_blog_posts():
    return BlogPost.objects.all().order_by('-created_at', '-id')


def get_blog_posts_published():
    return BlogPost.objects.filter(status=BlogPost.StatusChoices.PUBLISHED).order_by('-created_at', '-id')


def get_blog_post_published(blog_post_id):
    try:
        blog_post = _get_blog_post_by_id_or_slug(
            blog_post_id, status=BlogPost.StatusChoices.PUBLISHED
        )
    except BlogPost.DoesNotExist:
        raise NotFound("Blog post not found.")
    return BlogPostSerializer(blog_post).data


def increase_blog_post_views(blog_post_id, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        blog_post.views += 1
        blog_post.save()
        log_activity(
            request=request,
            action="VIEW",
            entity_type="BlogPost",
            entity_id=blog_post.id,
            description=f"Xem bài blog: {blog_post.title}",
        )
        return {"message": "Blog post views incremented successfully"}
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})


def like_blog_post(blog_post_id):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id, is_deleted=False)
        blog_post.likes += 1
        blog_post.save(update_fields=['likes'])
        return BlogPostSerializer(blog_post).data
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})


def toggle_blog_bookmark(blog_post_id, user):
    from .models import BlogBookmark
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id, is_deleted=False)
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
    bookmark, created = BlogBookmark.objects.get_or_create(user=user, blog_post=blog_post)
    if not created:
        bookmark.delete()
    count = BlogBookmark.objects.filter(blog_post=blog_post).count()
    return {"bookmarked": created, "count": count}


def report_blog_post(blog_post_id, reason=''):
    from django.utils import timezone
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id, is_deleted=False)
        blog_post.report_count += 1
        if reason:
            blog_post.last_report_reason = reason
        blog_post.last_reported_at = timezone.now()
        blog_post.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at'])
        return {"message": "Report submitted successfully"}
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})


def moderate_blog_post(blog_post_id, action, reason=''):
    from django.utils import timezone
    from rest_framework.exceptions import NotFound
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id, is_deleted=False)
    except BlogPost.DoesNotExist:
        raise NotFound("Blog post not found.")

    action = (action or '').strip().lower()
    if action == 'approve':
        blog_post.status = BlogPost.StatusChoices.PUBLISHED
    elif action == 'dismiss':
        pass
    elif action == 'hide':
        blog_post.status = BlogPost.StatusChoices.ARCHIVED
    elif action == 'delete':
        blog_post.is_deleted = True
        blog_post.deleted_at = timezone.now()
        blog_post.deleted_by = None
    else:
        raise ValidationError({'error': 'Invalid action. Use: approve, dismiss, hide, delete'})

    blog_post.save()
    try:
        if action in ('hide', 'delete') and blog_post.author_id:
            from notifications.services import create_notification
            create_notification(
                receiver_id=blog_post.author_id,
                title="Bài viết của bạn đã bị xử lý",
                message=f"Bài viết \"{blog_post.title}\" đã bị {'ẩn' if action == 'hide' else 'xóa'} do vi phạm chính sách.",
                type='other',
                related_id=blog_post.id,
                notification_code='blog_post_moderated',
            )
    except Exception:
        pass
    return blog_post
