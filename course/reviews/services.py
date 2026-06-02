from django.db.models import Avg, Count, F
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Review
from .serializers import ReviewSerializer
from courses.models import Course
from enrollments.models import Enrollment
from users.models import User
from utils.roles import is_active_admin


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
        review = serializer.save()
        try:
            from notifications.services import create_notification
            if course.instructor_id and course.instructor.user_id:
                create_notification(
                    receiver_id=course.instructor.user_id,
                    title="Học viên vừa để lại đánh giá",
                    message=f"Khóa học \"{course.title}\" nhận được đánh giá {data.get('rating', '')}⭐.",
                    type='course',
                    related_id=review.id,
                    sender=user.id,
                    notification_code='review_received',
                )
        except Exception:
            pass
        return review
    raise ValidationError(serializer.errors)


def get_reviews_by_course(course_id):
    if course_id:
        return Review.objects.filter(course=course_id, is_deleted=False).select_related('user', 'course')
    return Review.objects.filter(is_deleted=False).select_related('user', 'course')


def get_reviews_by_user(user_id):
    return Review.objects.filter(user_id=user_id, is_deleted=False).select_related('user', 'course')


def get_review_by_id(review_id):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
        return ReviewSerializer(review).data
    except Review.DoesNotExist:
        raise NotFound("Không tìm thấy đánh giá.")


def count_reviews_by_course(course_id):
    return Review.objects.filter(course=course_id, is_deleted=False).count()


def get_course_review_stats(course_id):
    qs = Review.objects.filter(course=course_id, is_deleted=False)
    agg = qs.aggregate(total=Count('id'), average=Avg('rating'))
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in qs.values('rating').annotate(count=Count('id')):
        rating = row['rating']
        if rating in distribution:
            distribution[rating] = row['count']
    return {
        'total': agg['total'] or 0,
        'average': round(float(agg['average']), 1) if agg['average'] is not None else 0,
        'distribution': distribution,
    }


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

    if requesting_user and review.user_id != requesting_user.id and not is_active_admin(requesting_user):
        raise PermissionDenied("Bạn không có quyền chỉnh sửa đánh giá này.")

    serializer = ReviewSerializer(review, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        return serializer.save()
    raise ValidationError(serializer.errors)


def get_reviews_by_instructor(instructor_id):
    return Review.objects.filter(
        course__instructor_id=instructor_id,
        is_deleted=False,
    ).select_related('user', 'course')


def get_reported_reviews():
    return Review.objects.filter(
        is_deleted=False,
        report_count__gt=0,
    ).select_related('user', 'course')


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
    try:
        from notifications.services import notify_admins
        notify_admins(
            title="Review bị báo cáo",
            message=f"Review #{review.id} đã bị báo cáo ({review.report_count} lần). Lý do: {review.last_report_reason or 'Không có'}",
            type='other',
            notification_code='review_reported',
            related_id=review.id,
        )
    except Exception:
        pass
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
    if action in {'hide', 'delete'}:
        try:
            from notifications.services import create_notification
            msg = (
                "Đánh giá của bạn đã bị ẩn do vi phạm chính sách."
                if action == 'hide'
                else "Đánh giá của bạn đã bị xóa bởi quản trị viên."
            )
            create_notification(
                receiver_id=review.user_id,
                title="Đánh giá của bạn đã bị xử lý",
                message=msg,
                type='other',
                related_id=review.id,
                notification_code='review_moderated',
            )
        except Exception:
            pass
    return review


def delete_review(review_id, requesting_user=None):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise NotFound("Không tìm thấy đánh giá.")
    if requesting_user and review.user_id != requesting_user.id and not is_active_admin(requesting_user):
        raise PermissionDenied("Bạn không có quyền xóa đánh giá này.")
    review.is_deleted = True
    review.deleted_at = timezone.now()
    review.deleted_by = requesting_user
    review.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])
    return {"message": "Đánh giá đã được xóa thành công."}
