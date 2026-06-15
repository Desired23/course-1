from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import CourseModule
from .serializers import CourseModuleSerializer
from courses.services import mark_course_content_changed
from utils.roles import is_active_admin, is_active_instructor


def validate_course_module_data(data):
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}


def get_course_modules(filters=None):
    course_modules = CourseModule.objects.filter(is_deleted=False)

    if filters:
        if filters.get("course_id") is not None:
            course_modules = course_modules.filter(course_id=filters["course_id"])

    return course_modules.order_by("order_number", "id")


def get_course_module_by_id(course_module_id):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        serializer = CourseModuleSerializer(course_module)
        return serializer.data
    except CourseModule.DoesNotExist:
        raise NotFound("Course module not found.")


def create_course_module(data):
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        course_module = serializer.save()
        if getattr(course_module, 'course', None):
            from courses.services import recalc_course_structure
            recalc_course_structure(course_module.course.id)
            mark_course_content_changed(course_module.course)
        return course_module
    raise ValidationError(serializer.errors)


def update_course_module(course_module_id, data, requesting_user=None):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
    except CourseModule.DoesNotExist:
        raise NotFound("Course module not found.")

    is_admin = is_active_admin(requesting_user)
    if requesting_user and not is_admin:
        instructor = getattr(requesting_user, 'instructor', None)
        owner_instructor_id = getattr(getattr(course_module.course, 'instructor', None), 'id', None)
        if not is_active_instructor(requesting_user) or owner_instructor_id != instructor.id:
            raise PermissionDenied("Bạn không có quyền chỉnh sửa module này.")

    update_payload = data.copy()
    update_payload.pop('status', None)
    update_payload.pop('status_reason', None)
    update_payload.pop('send_notification', None)
    update_payload.pop('notify_title', None)
    update_payload.pop('notify_message', None)
    previous_course_id = course_module.course_id
    serializer = CourseModuleSerializer(course_module, data=update_payload, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_course_module = serializer.save()
        next_course_id = updated_course_module.course_id
        course_ids_to_recalc = {course_id for course_id in {previous_course_id, next_course_id} if course_id}
        for course_id in course_ids_to_recalc:
            from courses.services import recalc_course_structure
            recalc_course_structure(course_id)
        if not is_admin and getattr(updated_course_module, 'course', None):
            mark_course_content_changed(updated_course_module.course)

        return updated_course_module
    raise ValidationError(serializer.errors)


def delete_course_module(course_module_id, requesting_user=None):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        is_admin = is_active_admin(requesting_user)
        if requesting_user and not is_admin:
            instructor = getattr(requesting_user, 'instructor', None)
            owner_instructor_id = getattr(getattr(course_module.course, 'instructor', None), 'id', None)
            if not is_active_instructor(requesting_user) or owner_instructor_id != instructor.id:
                raise PermissionDenied("Bạn không có quyền xóa module này.")
        related_course = getattr(course_module, 'course', None)
        from learning_progress.models import LearningProgress
        has_learner_data = LearningProgress.objects.filter(
            lesson__coursemodule=course_module
        ).exists()
        if has_learner_data:
            from django.utils import timezone as _tz
            course_module.is_deleted = True
            course_module.deleted_at = _tz.now()
            course_module.save(update_fields=['is_deleted', 'deleted_at'])
            from lessons.models import Lesson
            Lesson.objects.filter(coursemodule=course_module, is_deleted=False).update(
                is_deleted=True, deleted_at=_tz.now()
            )
        else:
            course_module.delete()
        if related_course:
            from courses.services import recalc_course_structure
            recalc_course_structure(related_course.id)
            if not is_admin:
                mark_course_content_changed(related_course)
        return {"message": "Course module deleted successfully."}
    except CourseModule.DoesNotExist:
        raise NotFound("Course module not found.")
