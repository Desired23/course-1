from rest_framework.exceptions import ValidationError

from .models import CourseModule
from .serializers import CourseModuleSerializer
from activity_logs.services import log_activity
from notifications.services import create_notification
from courses.services import mark_course_content_changed


def validate_course_module_data(data):
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}


def get_course_modules(filters=None):
    """
    Return course modules queryset with optional filters.
    Empty result is valid and should return an empty list response.
    """
    course_modules = CourseModule.objects.filter(is_deleted=False)

    if filters:
        if filters.get("course_id") is not None:
            course_modules = course_modules.filter(course_id=filters["course_id"])
        if filters.get("status"):
            course_modules = course_modules.filter(status=filters["status"])

    return course_modules.order_by("order_number", "id")


def get_course_module_by_id(course_module_id):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        serializer = CourseModuleSerializer(course_module)
        return serializer.data
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})


def create_course_module(data):
    """Create a new course module."""
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        course_module = serializer.save()
        if getattr(course_module, 'course', None):
            mark_course_content_changed(course_module.course)
        return course_module
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


def update_course_module(course_module_id, data, requesting_user=None):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})

    is_admin = bool(requesting_user and hasattr(requesting_user, 'admin'))
    if requesting_user and not is_admin:
        instructor = getattr(requesting_user, 'instructor', None)
        owner_instructor_id = getattr(getattr(course_module.course, 'instructor', None), 'id', None)
        if not instructor or owner_instructor_id != instructor.id:
            raise ValidationError({"error": "You do not have permission to update this module."})

    update_payload, status_meta = _pop_status_update_meta(data)
    old_status = course_module.status
    serializer = CourseModuleSerializer(course_module, data=update_payload, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_course_module = serializer.save()
        if not is_admin and getattr(updated_course_module, 'course', None):
            mark_course_content_changed(updated_course_module.course)

        if old_status != updated_course_module.status:
            actor_label = 'Admin' if is_admin else 'Instructor'
            reason_suffix = f" | Reason: {status_meta['status_reason']}" if status_meta['status_reason'] else ''
            log_activity(
                user_id=requesting_user.id if requesting_user else None,
                action="UPDATE",
                entity_type="CourseModule",
                entity_id=updated_course_module.id,
                description=(
                    f"{actor_label} changed module status '{updated_course_module.title}' "
                    f"from '{old_status}' to '{updated_course_module.status}'{reason_suffix}"
                ),
            )

            if is_admin and status_meta['send_notification']:
                instructor_user_id = (
                    updated_course_module.course.instructor.user.id
                    if updated_course_module.course and updated_course_module.course.instructor
                    else None
                )
                if instructor_user_id:
                    title = status_meta['notify_title'] or f"Module '{updated_course_module.title}' status changed"
                    default_message = (
                        f"Admin changed module status from '{old_status}' to '{updated_course_module.status}'."
                    )
                    if status_meta['status_reason']:
                        default_message += f" Reason: {status_meta['status_reason']}"
                    message = status_meta['notify_message'] or default_message
                    try:
                        create_notification(
                            receiver_id=instructor_user_id,
                            title=title,
                            message=message,
                            type='course',
                            related_id=updated_course_module.id,
                            sender=requesting_user.id if requesting_user else None,
                            notification_code='module_status_changed_by_admin',
                        )
                    except Exception:

                        pass

        return updated_course_module
    raise ValidationError(serializer.errors)


def delete_course_module(course_module_id, requesting_user=None):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        is_admin = bool(requesting_user and hasattr(requesting_user, 'admin'))
        if requesting_user and not is_admin:
            instructor = getattr(requesting_user, 'instructor', None)
            owner_instructor_id = getattr(getattr(course_module.course, 'instructor', None), 'id', None)
            if not instructor or owner_instructor_id != instructor.id:
                raise ValidationError({"error": "You do not have permission to delete this module."})
        related_course = getattr(course_module, 'course', None)
        course_module.delete()
        if related_course and not is_admin:
            mark_course_content_changed(related_course)
        return {"message": "Course module deleted successfully."}
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})
