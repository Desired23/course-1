from rest_framework.exceptions import ValidationError
from .serializers import ReviewSerializer
from .models import Review
from users.models import User
from courses.models import Course
from enrollments.models import Enrollment

def create_review(data):
    try:
        # Kiểm tra xem người dùng có tồn tại không
        user = User.objects.get(id=data['user_id'])
    except User.DoesNotExist:
        raise ValidationError({"user_id": "Người dùng không tồn tại."})

    # Kiểm tra xem khóa học có tồn tại không
    try:
        course = Course.objects.get(id=data['course_id'])
    except Course.DoesNotExist:
        raise ValidationError({"course_id": "Khóa học không tồn tại."})

    # Kiểm tra xem người dùng đã đăng ký khóa học chưa
    if not Enrollment.objects.filter(user=user, course=course).exists():
        raise ValidationError({"error": "Người dùng chưa đăng ký khóa học này."})
    serializer = ReviewSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        course.total_reviews += 1
        review = serializer.save()
        return review
    raise ValidationError(serializer.errors)

def get_reviews_by_course(course_id):
    try:
        print("course_id", course_id)
        reviews = Review.objects.filter(course=course_id)
        if not reviews.exists():
            raise ValidationError({"error": "Không tìm thấy đánh giá nào cho khóa học này."})
        serializer = ReviewSerializer(reviews, many=True)
        return serializer.data
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
        review = Review.objects.get(id=review_id)
        review.likes += 1
        review.save()
        return review
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})
    
def update_review(review_id, data):
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})

    serializer = ReviewSerializer(review, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_review = serializer.save()
        return updated_review
    raise ValidationError(serializer.errors)

def delete_review(review_id):
    try:
        review = Review.objects.get(id=review_id)
        review.delete()
        return {"message": "Đánh giá đã được xóa thành công."}
    except Review.DoesNotExist:
        raise ValidationError({"error": "Không tìm thấy đánh giá."})
    except Exception as e:
        raise ValidationError({"error": str(e)})