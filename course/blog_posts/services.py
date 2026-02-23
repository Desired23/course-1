from rest_framework.exceptions import ValidationError
from datetime import datetime
from django.utils import timezone
from .serializers import BlogPostSerializer
from users.models import User
from .models import BlogPost
from activity_logs.services import log_activity
def create_blog_post(data, request=None):
    try:
        serializer = BlogPostSerializer(data=data)
        if serializer.is_valid():
            blog_post = serializer.save()
            log_activity(
                request=request,
                action="CREATE",
                entity_type="BlogPost",
                entity_id=blog_post.id,
                description=f"Đăng bài blog mới: {blog_post.title}"
            )
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except ValidationError as e:
        raise ValidationError({"error": str(e)})

# def update_blog_post(blog_post_id, data):
#     try:
#         blog_post = BlogPost.objects.get(blog_post_id=blog_post_id)
#         serializer = BlogPostSerializer(blog_post, data=data, partial=True)
#         if serializer.is_valid():
#             serializer.save()
#             return serializer.data
#         else:
#             raise ValidationError(serializer.errors)
#     except BlogPost.DoesNotExist:
#         raise ValidationError({"error": "Blog post not found"})
#     except ValidationError as e:
#         raise ValidationError({"error": str(e)})
def update_blog_post(blog_post_id, data, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        serializer = BlogPostSerializer(blog_post, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_activity(
                request=request,
                action="UPDATE",
                entity_type="BlogPost",
                entity_id=blog_post.id,
                description=f"Cập nhật bài blog: {blog_post.title}"
            )
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
    except ValidationError as e:
        raise ValidationError({"error": str(e)})
def delete_blog_post(blog_post_id, request=None):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        title = blog_post.title
        blog_post.delete()
        log_activity(
            request=request,
            action="DELETE",
            entity_type="BlogPost",
            entity_id=blog_post_id,
            description=f"Xóa bài blog: {title}"
        )
        return {"message": "Blog post deleted successfully"}
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
def get_blog_post(blog_post_id):
    try:
        blog_post = BlogPost.objects.get(id=blog_post_id)
        serializer = BlogPostSerializer(blog_post)
        return serializer.data
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
def get_all_blog_posts():
    try:
        blog_posts = BlogPost.objects.all()
        return blog_posts
    except Exception as e:
        raise ValidationError({"error": str(e)})
def get_blog_posts_published():
    try:
        blog_posts = BlogPost.objects.filter(status=BlogPost.StatusChoices.PUBLISHED)
        return blog_posts
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
            description=f"Xem bài blog: {blog_post.title}"
        )
        return {"message": "Blog post views incremented successfully"}
    except BlogPost.DoesNotExist:
        raise ValidationError({"error": "Blog post not found"})
