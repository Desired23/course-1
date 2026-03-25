from rest_framework.exceptions import ValidationError
from django.db.models import Q
from .models import Lesson
from .serializers import LessonSerializer
from users.models import User
from notifications.services import create_notification
from activity_logs.services import log_activity
from courses.services import mark_course_content_changed


def validate_lesson_data(data):
    serializer = LessonSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}


def get_lessons(filters=None):
    lessons = Lesson.objects.all()
    if filters:
        if filters.get('coursemodule_id'):
            lessons = lessons.filter(coursemodule_id=filters['coursemodule_id'])
        if filters.get('content_type'):
            lessons = lessons.filter(content_type=filters['content_type'])
        if filters.get('instructor_id'):
            lessons = lessons.filter(coursemodule__course__instructor_id=filters['instructor_id'])
        if filters.get('status'):
            lessons = lessons.filter(status=filters['status'])
        if filters.get('search'):
            search = str(filters['search']).strip()
            if search:
                lessons = lessons.filter(
                    Q(title__icontains=search) | Q(description__icontains=search)
                )

        allowed_ordering = {
            'created_at', '-created_at',
            'title', '-title',
            'order', '-order',
            'updated_at', '-updated_at',
        }
        ordering = filters.get('ordering')
        if ordering in allowed_ordering:
            lessons = lessons.order_by(ordering)
        else:
            lessons = lessons.order_by('-created_at')
    else:
        lessons = lessons.order_by('-created_at')

    return lessons


def get_lesson_by_id(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        serializer = LessonSerializer(lesson)
        return serializer.data
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})


def create_lesson(data, user):
    from coursemodules.models import CourseModule

    try:
        user_instance = User.objects.get(pk=user)
    except User.DoesNotExist:
        raise ValidationError({"user_id": "User with this ID does not exist."})

    if user_instance.user_type == User.UserTypeChoices.STUDENT:
        raise ValidationError({"user_id": "User does not have permission."})

    coursemodule_id = data.get('coursemodule')
    if not coursemodule_id:
        raise ValidationError({"coursemodule": "Coursemodule is required."})

    try:
        CourseModule.objects.get(id=coursemodule_id, is_deleted=False)
    except CourseModule.DoesNotExist:
        raise ValidationError({"coursemodule": "Coursemodule does not exist or has been deleted."})

    modified_data = data.copy()
    modified_data['user'] = user_instance
    serializer = LessonSerializer(data=modified_data, context={'request': None})
    if serializer.is_valid(raise_exception=True):
        lesson = serializer.save()
        course = getattr(getattr(lesson, 'coursemodule', None), 'course', None)
        if course:
            mark_course_content_changed(course)
        return lesson
    raise ValidationError(serializer.errors)


def _pop_status_update_meta(data):
    payload = data.copy()

    status_reason = payload.pop('status_reason', None)
    send_notification = payload.pop('send_notification', False)
    notify_title = payload.pop('notify_title', None)
    notify_message = payload.pop('notify_message', None)

    if isinstance(send_notification, str):
        send_notification = send_notification.lower() in ('1', 'true', 'yes', 'on')
    else:
        send_notification = bool(send_notification)

    return payload, {
        'status_reason': (status_reason or '').strip() if status_reason else '',
        'send_notification': send_notification,
        'notify_title': (notify_title or '').strip() if notify_title else '',
        'notify_message': (notify_message or '').strip() if notify_message else '',
    }


def update_lesson(lesson_id, data, requesting_user=None):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})

    # Ownership check: instructor can only update lessons in own courses.
    is_admin = bool(requesting_user and hasattr(requesting_user, 'admin'))
    if requesting_user and not is_admin:
        instructor = getattr(requesting_user, 'instructor', None)
        owner_instructor_id = getattr(getattr(lesson.coursemodule, 'course', None), 'instructor_id', None)
        if not instructor or owner_instructor_id != instructor.id:
            raise ValidationError({"error": "You do not have permission to update this lesson."})

    update_payload, status_meta = _pop_status_update_meta(data)
    old_status = lesson.status
    serializer = LessonSerializer(lesson, data=update_payload, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_lesson = serializer.save()
        course = getattr(getattr(updated_lesson, 'coursemodule', None), 'course', None)
        if not is_admin and course:
            mark_course_content_changed(course)

        if old_status != updated_lesson.status:
            actor_label = 'Admin' if is_admin else 'Instructor'
            reason_suffix = f" | Lý do: {status_meta['status_reason']}" if status_meta['status_reason'] else ''
            log_activity(
                user_id=requesting_user.id if requesting_user else None,
                action="UPDATE",
                entity_type="Lesson",
                entity_id=updated_lesson.id,
                description=(
                    f"{actor_label} đổi trạng thái bài học '{updated_lesson.title}' "
                    f"từ '{old_status}' sang '{updated_lesson.status}'{reason_suffix}"
                ),
            )

            if is_admin and status_meta['send_notification']:
                course = getattr(updated_lesson.coursemodule, 'course', None)
                instructor = getattr(course, 'instructor', None) if course else None
                instructor_user_id = getattr(instructor, 'user_id', None)
                if instructor_user_id:
                    title = status_meta['notify_title'] or f"Bài học '{updated_lesson.title}' đã đổi trạng thái"
                    default_message = (
                        f"Admin đã đổi trạng thái bài học từ '{old_status}' sang '{updated_lesson.status}'."
                    )
                    if status_meta['status_reason']:
                        default_message += f" Lý do: {status_meta['status_reason']}"
                    message = status_meta['notify_message'] or default_message
                    try:
                        create_notification(
                            receiver_id=instructor_user_id,
                            title=title,
                            message=message,
                            type='course',
                            related_id=updated_lesson.id,
                            sender=requesting_user.id if requesting_user else None,
                            notification_code='lesson_status_changed_by_admin',
                        )
                    except Exception:
                        # Notification errors should not break status update.
                        pass
        return updated_lesson
    raise ValidationError(serializer.errors)


def delete_lesson(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        course = getattr(getattr(lesson, 'coursemodule', None), 'course', None)
        lesson.delete()
        if course:
            mark_course_content_changed(course)
        return {"message": "Lesson deleted successfully."}
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})
