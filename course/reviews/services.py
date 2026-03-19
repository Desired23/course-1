from rest_framework.exceptions import ValidationError
from .serializers import ReviewSerializer
from .models import Review
from users.models import User
from courses.models import Course
from enrollments.models import Enrollment
from django.db.models import F

def create_review(data):
    # validate/normalize user field
    user_id = data.get('user_id') or data.get('user')
    if user_id is None:
        raise ValidationError({"user": "Người dùng không được cung cấp."})
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"user": "Người dùng không tồn tại."})
    # ensure serializer will receive 'user' field (it reads FK named user)
    data['user'] = user.id

    # Kiểm tra xem khóa học có tồn tại không
    # frontend gửi field `course` (PK) whereas some internal calls might use `course_id`
    course_id = data.get('course') or data.get('course_id')
    if course_id is None:
        raise ValidationError({"course": "Khóa học không được cung cấp."})
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        raise ValidationError({"course": "Khóa học không tồn tại."})
    # Kiểm tra xem người dùng đã đăng ký khóa học chưa
    if not Enrollment.objects.filter(user=user, course=course).exists():
        raise ValidationError({"error": "Người dùng chưa đăng ký khóa học này."})
    serializer = ReviewSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        Course.objects.filter(id=course_id).update(total_reviews=F('total_reviews') + 1)
        review = serializer.save()
        return review
    raise ValidationError(serializer.errors)

def get_reviews_by_course(course_id):
    try:
        if course_id:
            reviews = Review.objects.filter(course=course_id).select_related('user', 'course')
        else:
            reviews = Review.objects.all().select_related('user', 'course')
        return reviews
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_reviews_by_user(user_id):
    """Get all reviews written by a specific user."""
    try:
        reviews = Review.objects.filter(user_id=user_id, is_deleted=False).select_related('user', 'course')
        return reviews
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_review_by_id(review_id):
    try:
        review = Review.objects.get(id=review_id)
        serializer = ReviewSerializer(review)
        return serializer.data
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def count_reviews_by_course(course_id):
    try:
        count = Review.objects.filter(course=course_id).count()
        return count
    except Exception as e:
        raise ValidationError({"error": str(e)})
    
def count_like_review(review_id):
    try:
        updated = Review.objects.filter(id=review_id).update(likes=F('likes') + 1)
        if not updated:
            raise ValidationError({"error": "Không tìm thấy đánh giá."})
        return Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})
    
def update_review(review_id, data, requesting_user=None):
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})

    # Ownership check: only the review author or admin can update
    if requesting_user:
        if review.user_id != requesting_user.id and not hasattr(requesting_user, 'admin'):
            raise ValidationError({"error": "Bạn không có quyền chỉnh sửa đánh giá này."})

    serializer = ReviewSerializer(review, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_review = serializer.save()
        return updated_review
    raise ValidationError(serializer.errors)

def get_reviews_by_instructor(instructor_id):
    """Get all reviews across all courses taught by an instructor."""
    try:
        reviews = Review.objects.filter(
            course__instructor_id=instructor_id,
            is_deleted=False
        ).select_related('user', 'course')
        return reviews
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_review(review_id, requesting_user=None):
    try:
        review = Review.objects.get(id=review_id)
        # Ownership check: only the review author or admin can delete
        if requesting_user:
            if review.user_id != requesting_user.id and not hasattr(requesting_user, 'admin'):
                raise ValidationError({"error": "Bạn không có quyền xóa đánh giá này."})
        review.delete()
        return {"message": "Đánh giá đã được xóa thành công."}
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})
    except Exception as e:
        raise ValidationError({"error": str(e)})