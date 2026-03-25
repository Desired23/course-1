from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Review
from .serializers import ReviewSerializer
from courses.models import Course
from enrollments.models import Enrollment
from users.models import User


def create_review(data):
    user_id = data.get('user_id') or data.get('user')
    if user_id is None:
        raise ValidationError({"user": "Nguoi dung khong duoc cung cap."})
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValidationError({"user": "Nguoi dung khong ton tai."})

    data['user'] = user.id

    course_id = data.get('course') or data.get('course_id')
    if course_id is None:
        raise ValidationError({"course": "Khoa hoc khong duoc cung cap."})
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        raise ValidationError({"course": "Khoa hoc khong ton tai."})

    if not Enrollment.objects.filter(user=user, course=course).exists():
        raise ValidationError({"error": "Nguoi dung chua dang ky khoa hoc nay."})

    serializer = ReviewSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        Course.objects.filter(id=course_id).update(total_reviews=F('total_reviews') + 1)
        return serializer.save()
    raise ValidationError(serializer.errors)


def get_reviews_by_course(course_id):
    try:
        if course_id:
            reviews = Review.objects.filter(course=course_id, is_deleted=False).select_related('user', 'course')
        else:
            reviews = Review.objects.filter(is_deleted=False).select_related('user', 'course')
        return reviews
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def get_reviews_by_user(user_id):
    try:
        return Review.objects.filter(user_id=user_id, is_deleted=False).select_related('user', 'course')
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def get_review_by_id(review_id):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
        return ReviewSerializer(review).data
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def count_reviews_by_course(course_id):
    try:
        return Review.objects.filter(course=course_id, is_deleted=False).count()
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def count_like_review(review_id):
    try:
        updated = Review.objects.filter(id=review_id, is_deleted=False).update(likes=F('likes') + 1)
        if not updated:
            raise ValidationError({"error": "Khong tim thay danh gia."})
        return Review.objects.get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})


def update_review(review_id, data, requesting_user=None):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})

    if requesting_user and review.user_id != requesting_user.id and not hasattr(requesting_user, 'admin'):
        raise ValidationError({"error": "Ban khong co quyen chinh sua danh gia nay."})

    serializer = ReviewSerializer(review, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        return serializer.save()
    raise ValidationError(serializer.errors)


def get_reviews_by_instructor(instructor_id):
    try:
        return Review.objects.filter(
            course__instructor_id=instructor_id,
            is_deleted=False,
        ).select_related('user', 'course')
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def get_reported_reviews():
    try:
        return Review.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('user', 'course')
    except Exception as exc:
        raise ValidationError({"error": str(exc)})


def report_review(review_id, reason=''):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})

    review.report_count += 1
    cleaned_reason = (reason or '').strip()
    if cleaned_reason:
        review.last_report_reason = cleaned_reason
    review.last_reported_at = timezone.now()
    review.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at', 'updated_at'])
    return review


def moderate_review(review_id, action, reason=''):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})

    action = (action or '').strip().lower()
    cleaned_reason = (reason or '').strip()

    if action == 'approve':
        review.status = Review.StatusChoices.APPROVED
        review.report_count = 0
    elif action == 'dismiss':
        review.report_count = 0
    elif action == 'hide':
        review.status = Review.StatusChoices.REJECTED
        review.report_count = 0
    elif action == 'delete':
        review.is_deleted = True
        review.deleted_at = timezone.now()
        review.deleted_by = None
        review.report_count = 0
    else:
        raise ValidationError({"error": "Invalid moderation action."})

    if cleaned_reason:
        review.last_report_reason = cleaned_reason
    if action in {'approve', 'dismiss', 'hide'}:
        review.last_reported_at = timezone.now()

    review.save(update_fields=[
        'status',
        'report_count',
        'last_report_reason',
        'last_reported_at',
        'updated_at',
        'is_deleted',
        'deleted_at',
        'deleted_by',
    ])
    return review


def delete_review(review_id, requesting_user=None):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
        if requesting_user and review.user_id != requesting_user.id and not hasattr(requesting_user, 'admin'):
            raise ValidationError({"error": "Ban khong co quyen xoa danh gia nay."})
        review.is_deleted = True
        review.deleted_at = timezone.now()
        review.deleted_by = requesting_user
        review.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])
        return {"message": "Danh gia da duoc xoa thanh cong."}
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})
    except Exception as exc:
        raise ValidationError({"error": str(exc)})
