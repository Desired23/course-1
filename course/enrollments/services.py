import logging
from rest_framework.exceptions import ValidationError
from .serializers import EnrollmentSerializer, EnrollmentCreateSerializer
from .models import Enrollment
from django.utils import timezone
from courses.models import Course
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from activity_logs.services import log_activity

logger = logging.getLogger(__name__)

OWNED_ENROLLMENT_STATUSES = {
    Enrollment.Status.Active,
    Enrollment.Status.Complete,
    Enrollment.Status.SUSPENDED,
}


def _id_or_value(value):
    return getattr(value, 'id', value)


def _reactivate_existing_enrollment(existing, data):
    fields = []

    if existing.is_deleted:
        existing.is_deleted = False
        existing.deleted_at = None
        existing.deleted_by = None
        fields.extend(["is_deleted", "deleted_at", "deleted_by"])

    if existing.status not in OWNED_ENROLLMENT_STATUSES:
        existing.status = Enrollment.Status.Active
        fields.append("status")

    if not existing.enrollment_date:
        existing.enrollment_date = data.get("enrollment_date") or timezone.now()
        fields.append("enrollment_date")

    for field in ("payment", "source", "subscription", "expiry_date"):
        value = data.get(field)
        if value is None and field != "expiry_date":
            continue
        if field in ("payment", "subscription"):
            attr = f"{field}_id"
            current = getattr(existing, attr)
        else:
            attr = field
            current = getattr(existing, attr)
        if current != value:
            setattr(existing, attr, value)
            fields.append(field)

    if fields:
        fields.append("updated_at")
        existing.save(update_fields=list(dict.fromkeys(fields)))
    return existing

def create_enrollment(data):
    try:

        user_val = data.get('user_id') if 'user_id' in data else data.get('user')
        course_val = data.get('course_id') if 'course_id' in data else data.get('course')

        dataCopy = {
            'user': _id_or_value(user_val),
            'course': _id_or_value(course_val),
            'payment': _id_or_value(data.get('payment')),
            'enrollment_date': data.get('enrollment_date') or timezone.now(),
            'status': Enrollment.Status.Active,
            'expiry_date': data.get('expiry_date', None),
            'source': data.get('source', Enrollment.Source.PURCHASE),
            'subscription': _id_or_value(data.get('subscription')),
            'progress': 0,
            'certificate_issue_date': None,
        }

        if dataCopy.get('source') == Enrollment.Source.SUBSCRIPTION and not dataCopy.get('subscription'):
            from subscription_plans.models import UserSubscription
            sub = UserSubscription.objects.filter(
                user_id=dataCopy.get('user'),
                status='active',
                is_deleted=False,
                plan__plan_courses__course_id=dataCopy.get('course'),
                plan__plan_courses__status='active',
                plan__plan_courses__is_deleted=False,
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=timezone.now())
            ).first()
            if not sub:
                raise ValidationError({"subscription": "Bạn không có gói đăng ký phù hợp cho khóa học này."})
            dataCopy['subscription'] = sub.id

        if dataCopy.get('user') and dataCopy.get('course'):
            existing = Enrollment.objects.filter(
                user_id=dataCopy.get('user'),
                course_id=dataCopy.get('course'),
            ).first()
            if existing:
                if not existing.is_deleted and existing.status in OWNED_ENROLLMENT_STATUSES:
                    return EnrollmentCreateSerializer(existing).data
                existing = _reactivate_existing_enrollment(existing, dataCopy)
                return EnrollmentCreateSerializer(existing).data

        serializer = EnrollmentCreateSerializer(data=dataCopy)
        if serializer.is_valid(raise_exception=True):
            try:
                with transaction.atomic():
                    enrollment = serializer.save(enrollment_date=dataCopy['enrollment_date'])
                    course = Course.objects.get(id=dataCopy.get('course'))
                    Course.objects.filter(id=course.id).update(total_students=F('total_students') + 1)
                    log_activity(
                        user_id=enrollment.user.id,
                        action="ENROLL",
                        entity_type="Enrollment",
                        entity_id=enrollment.id,
                        description=f"Đăng ký khóa học: {course.title}"
                    )
            except IntegrityError:
                raise ValidationError({"error": "User has already enrolled in this course."})

            try:
                from utils.mailer.mailer import send_enrollment_confirmation
                import threading
                instructor_name = course.instructor.user.full_name if course.instructor and course.instructor.user else None
                threading.Thread(
                    target=send_enrollment_confirmation,
                    args=(enrollment.user.email, enrollment.user.full_name, course.title),
                    kwargs={"instructor_name": instructor_name},
                    daemon=True,
                ).start()
            except Exception:
                pass
            try:
                from notifications.services import create_notification
                if dataCopy.get('source') != Enrollment.Source.PURCHASE:
                    create_notification(
                        receiver_id=enrollment.user.id,
                        title="Đăng ký khóa học thành công",
                        message=f"Bạn đã được ghi danh vào khóa học \"{course.title}\".",
                        type='course',
                        related_id=enrollment.course_id,
                        notification_code='enrollment_created',
                    )
                if course.instructor_id and course.instructor.user_id:
                    create_notification(
                        receiver_id=course.instructor.user_id,
                        title="Học viên mới đăng ký",
                        message=f"Một học viên mới vừa đăng ký khóa học \"{course.title}\".",
                        type='course',
                        related_id=enrollment.id,
                        notification_code='new_enrollment_received',
                    )
            except Exception:
                pass
            return EnrollmentCreateSerializer(enrollment).data
        raise ValidationError(serializer.errors)
    except ValidationError:
        raise

def get_enrollment_by_user(user_id):
    # Khóa học bị admin chặn truy cập (vi phạm chính sách) được ẩn khỏi "Khóa học
    # của tôi". Khi admin khôi phục (is_hard_blocked=False) thì tự hiện lại.
    return Enrollment.objects.select_related(
        'course__instructor__user', 'course__category'
    ).filter(user=user_id, is_deleted=False).exclude(course__is_hard_blocked=True)

def find_enrollment_by_id(enrollment_id):
    try:
        enrollment = Enrollment.objects.get(id=enrollment_id)
        return EnrollmentSerializer(enrollment).data
    except Enrollment.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Enrollment not found.")

def find_by_user_and_course(user_id, course_id):
    try:
        enrollment = Enrollment.objects.get(user_id=user_id, course_id=course_id)
        return EnrollmentSerializer(enrollment).data
    except Enrollment.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Enrollment not found.")

def count_enrollments_by_course(course_id):
    return Enrollment.objects.filter(course=course_id).count()

def has_access(user_id, course_id):
    try:
        enrollment = Enrollment.objects.get(user=user_id, course=course_id)
        return enrollment.status in [Enrollment.Status.Active, Enrollment.Status.Complete]
    except Enrollment.DoesNotExist:
        return False














def user_has_course_access(user_id, course_id):
    return Enrollment.objects.filter(
        user_id=user_id,
        course_id=course_id,
        status__in=[Enrollment.Status.Active, Enrollment.Status.Complete],
        is_deleted=False,
    ).exists()
