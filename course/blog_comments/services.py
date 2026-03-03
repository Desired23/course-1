from rest_framework.exceptions import ValidationError
from .models import BlogComment
from .serializers import BlogCommentSerializer


def create_blog_comment(data):
    try:
        serializer = BlogCommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating Blog Comment: {str(e)}")


def get_blog_comment_by_id(comment_id):
    try:
        blog_comment = BlogComment.objects.get(id=comment_id)
        return BlogCommentSerializer(blog_comment).data
    except BlogComment.DoesNotExist:
        raise ValidationError("Blog Comment not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving Blog Comment: {str(e)}")


def get_blog_comments_by_post_id(post_id):
    try:
        return BlogComment.objects.filter(blog_post=post_id, status='active')
    except Exception as e:
        raise ValidationError(f"Error retrieving Blog Comments: {str(e)}")


def get_blog_comments_by_user_id(user_id):
    try:
        return BlogComment.objects.filter(user=user_id)
    except Exception as e:
        raise ValidationError(f"Error retrieving Blog Comments: {str(e)}")


def get_all_blog_comments():
    try:
        return BlogComment.objects.all()
    except Exception as e:
        raise ValidationError(f"Error retrieving all Blog Comments: {str(e)}")


def update_blog_comment(comment_id, data):
    try:
        blog_comment = BlogComment.objects.get(id=comment_id)
        serializer = BlogCommentSerializer(blog_comment, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return BlogCommentSerializer(updated).data
        else:
            raise ValidationError(serializer.errors)
    except BlogComment.DoesNotExist:
        raise ValidationError("Blog Comment not found")
    except Exception as e:
        raise ValidationError(f"Error updating Blog Comment: {str(e)}")


def delete_blog_comment(comment_id):
    try:
        blog_comment = BlogComment.objects.get(id=comment_id)
        blog_comment.delete()
        return {"message": "Blog Comment deleted successfully"}
    except BlogComment.DoesNotExist:
        raise ValidationError("Blog Comment not found")
    except Exception as e:
        raise ValidationError(f"Error deleting Blog Comment: {str(e)}")
