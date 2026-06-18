from django.db import transaction
from django.db.models import Avg, Count, F
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Review
from .serializers import ReviewSerializer
from courses.models import Course
from enrollments.models import Enrollment
from users.models import User
from utils.roles import is_active_admin


def _is_course_instructor(user, review):
    instructor = getattr(user, 'instructor', None)
    return bool(
        instructor
        and not instructor.is_deleted
        and review.course
        and review.course.instructor_id == instructor.id
    )


def _filter_review_owner_payload(data):
    return {
        field: data[field]
        for field in ('rating', 'comment')
        if field in data
    }


def _save_instructor_response(review, response):
    review.instructor_response = response.strip() if isinstance(response, str) else response
    review.response_at = timezone.now() if review.instructor_response else None
    review.save(update_fields=['instructor_response', 'response_at', 'updated_at'])
    return review


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

    from utils.course_access import ensure_course_interaction_allowed
    ensure_course_interaction_allowed(course)

    enrollment = Enrollment.objects.filter(
        user=user, course=course, is_deleted=False,
    ).exclude(status=Enrollment.Status.Cancelled).first()
    if not enrollment:
        raise ValidationError({"error": "Nguoi dung chua dang ky khoa hoc nay."})

    if (enrollment.progress or 0) <= 50:
        raise ValidationError({"error": "Bạn cần học hơn 50% khóa học trước khi đánh giá."})

    existing = Review.objects.filter(user=user, course=course, is_deleted=False).first()
    if existing:
        review = update_review(existing.id, data, requesting_user=user)
        from courses.services import recalc_course_rating
        recalc_course_rating(course_id)
        return review

    serializer = ReviewSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        with transaction.atomic():
            review = serializer.save()
            review.status = Review.StatusChoices.APPROVED
            review.save(update_fields=['status', 'updated_at'])
            from courses.services import recalc_course_rating
            recalc_course_rating(course_id)
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
    qs = Review.objects.filter(is_deleted=False).exclude(
        status=Review.StatusChoices.REJECTED
    ).select_related('user', 'course')
    if course_id:
        qs = qs.filter(course=course_id)
    return qs


def get_reviews_by_user(user_id):
    return Review.objects.filter(user_id=user_id, is_deleted=False).select_related('user', 'course')


def get_review_by_id(review_id):
    try:
        review = Review.objects.get(id=review_id, is_deleted=False)
        return ReviewSerializer(review).data
    except Review.DoesNotExist:
        raise NotFound("Không tìm thấy đánh giá.")


def count_reviews_by_course(course_id):
    return Review.objects.filter(course=course_id, is_deleted=False).exclude(
        status=Review.StatusChoices.REJECTED
    ).count()


def get_course_review_stats(course_id):
    qs = Review.objects.filter(course=course_id, is_deleted=False).exclude(
        status=Review.StatusChoices.REJECTED
    )
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
        review = Review.objects.select_related('course').get(id=review_id, is_deleted=False)
    except Review.DoesNotExist:
        raise ValidationError({"error": "Khong tim thay danh gia."})

    data = data.copy()
    admin = is_active_admin(requesting_user)
    is_owner = bool(requesting_user and review.user_id == requesting_user.id)
    is_instructor = bool(requesting_user and _is_course_instructor(requesting_user, review))

    if not (admin or is_owner or is_instructor):
        raise PermissionDenied("Bạn không có quyền chỉnh sửa đánh giá này.")

    if is_instructor and not admin and not is_owner:
        extra_fields = set(data.keys()) - {'instructor_response'}
        if extra_fields or 'instructor_response' not in data:
            raise PermissionDenied("Giang vien chi co the phan hoi danh gia.")
        return _save_instructor_response(review, data.get('instructor_response'))

    if is_owner and not admin:
        from utils.course_access import ensure_course_interaction_allowed
        ensure_course_interaction_allowed(review.course)
        data = _filter_review_owner_payload(data)
        if not data:
            raise ValidationError({"error": "Khong co du lieu danh gia can cap nhat."})

    serializer = ReviewSerializer(review, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated = serializer.save()
        if 'instructor_response' in data:
            updated.response_at = timezone.now() if updated.instructor_response else None
            updated.save(update_fields=['response_at'])
        if {'rating', 'status'} & set(data.keys()):
            from courses.services import recalc_course_rating
            recalc_course_rating(updated.course_id)
        return updated
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
    if action in {'approve', 'hide', 'delete'}:
        from courses.services import recalc_course_rating
        recalc_course_rating(review.course_id)
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
    from courses.services import recalc_course_rating
    recalc_course_rating(review.course_id)
    return {"message": "Đánh giá đã được xóa thành công."}
