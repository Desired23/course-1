from rest_framework.exceptions import ValidationError

from activity_logs.services import log_activity

from .models import BlogPost
from .serializers import BlogPostSerializer


def _is_admin(user):
    return bool(getattr(user, "admin", None))


def _check_blog_post_access(blog_post, actor):
    if _is_admin(actor):
        return
    if blog_post.author_id != actor.id:
        raise ValidationError({"error": "Bạn không có quyền thao tác bài viết này."})


def create_blog_post(data, actor_user, request=None):
    try:
        payload = dict(data)
        payload.pop("author", None)
        serializer = BlogPostSerializer(data=payload)
        if serializer.is_valid():
            blog_post = serializer.save(author=actor_user)
            log_activity(
                request=request,
                action="CREATE",
                entity_type="BlogPost",
                entity_id=blog_post.id,
                description=f"Đăng bài blog mới: {blog_post.title}",
            )
            return BlogPostSerializer(blog_post).data
        raise ValidationError(serializer.errors)
    except ValidationError as e:
        raise ValidationError({"error": str(e)})


def update_blog_post(blog_post_id, data, actor_user, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        _check_blog_post_access(blog_post, actor_user)
        payload = dict(data)
        payload.pop("author", None)
        serializer = BlogPostSerializer(blog_post, data=payload, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_activity(
                request=request,
                action="UPDATE",
                entity_type="BlogPost",
                entity_id=blog_post.id,
                description=f"Cập nhật bài blog: {blog_post.title}",
            )
            return serializer.data
        raise ValidationError(serializer.errors)
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
    except ValidationError as e:
        raise ValidationError({"error": str(e)})


def delete_blog_post(blog_post_id, actor_user, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
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
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})


def get_blog_post(blog_post_id, actor_user=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        if actor_user is not None:
            _check_blog_post_access(blog_post, actor_user)
        serializer = BlogPostSerializer(blog_post)
        return serializer.data
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})


def get_all_blog_posts():
    try:
        return BlogPost.objects.all().order_by('-created_at', '-id')
    except Exception as e:
        raise ValidationError({"error": str(e)})


def get_blog_posts_published():
    try:
        return BlogPost.objects.filter(status=BlogPost.StatusChoices.PUBLISHED).order_by('-created_at', '-id')
    except Exception as e:
        raise ValidationError({"error": str(e)})


def get_blog_post_published(blog_post_id):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id, status=BlogPost.StatusChoices.PUBLISHED)
        serializer = BlogPostSerializer(blog_post)
        return serializer.data
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
    except Exception as e:
        raise ValidationError({"error": str(e)})


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
