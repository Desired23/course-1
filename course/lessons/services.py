from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q
from .models import Lesson
from .serializers import LessonSerializer
from users.models import User
from courses.services import mark_course_content_changed
from transcripts.services import enqueue_transcript_generation, get_lesson_source_snapshot, mark_lesson_transcripts_stale
from utils.roles import is_active_admin, is_active_instructor


def validate_lesson_data(data):
    serializer = LessonSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}


def _sync_lesson_transcript_generation(lesson, previous_snapshot=None, force=False):
    current_snapshot = get_lesson_source_snapshot(lesson)
    if not current_snapshot or lesson.content_type != Lesson.ContentType.VIDEO:
        if previous_snapshot:
            mark_lesson_transcripts_stale(lesson, current_snapshot="")
        return None

    if previous_snapshot and previous_snapshot != current_snapshot:
        mark_lesson_transcripts_stale(lesson, current_snapshot=current_snapshot)
        return enqueue_transcript_generation(
            lesson,
            trigger_source='video_updated',
            force=True,
        )

    if not previous_snapshot:
        return enqueue_transcript_generation(
            lesson,
            trigger_source='auto_upload',
            force=force,
        )

    return None


def get_lessons(filters=None):
    lessons = Lesson.objects.filter(content_type__in=Lesson.ContentType.values)
    if filters:
        if filters.get('coursemodule_id'):
            lessons = lessons.filter(coursemodule_id=filters['coursemodule_id'])
        if filters.get('content_type'):
            lessons = lessons.filter(content_type=filters['content_type'])
        if filters.get('instructor_id'):
            lessons = lessons.filter(coursemodule__course__instructor_id=filters['instructor_id'])
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

    from utils.roles import is_active_admin, is_active_instructor
    if not is_active_instructor(user_instance) and not is_active_admin(user_instance):
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
        _sync_lesson_transcript_generation(lesson, previous_snapshot=None)
        course = getattr(getattr(lesson, 'coursemodule', None), 'course', None)
        if course:
            mark_course_content_changed(course)
            from courses.services import recalc_course_structure
            recalc_course_structure(course.id)
            _notify_completed_learners_new_lesson(course)
        return lesson
    raise ValidationError(serializer.errors)


def _notify_completed_learners_new_lesson(course):
    try:
        from enrollments.models import Enrollment
        from notifications.services import create_notification
        learner_ids = Enrollment.objects.filter(
            course=course,
            status=Enrollment.Status.Complete,
            is_deleted=False,
        ).values_list('user_id', flat=True)
        for user_id in learner_ids:
            create_notification(
                receiver_id=user_id,
                title="Khóa học có bài học mới",
                message=f"Khóa học \"{course.title}\" vừa có bài học mới.",
                type='course',
                related_id=course.id,
                notification_code='course_new_lesson',
            )
    except Exception:
        pass


def update_lesson(lesson_id, data, requesting_user=None):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})


    is_admin = is_active_admin(requesting_user)
    if requesting_user and not is_admin:
        instructor = getattr(requesting_user, 'instructor', None)
        owner_instructor_id = getattr(getattr(lesson.coursemodule, 'course', None), 'instructor_id', None)
        if not is_active_instructor(requesting_user) or owner_instructor_id != instructor.id:
            raise PermissionDenied("Bạn không có quyền chỉnh sửa bài học này.")

    update_payload = data.copy()
    update_payload.pop('status', None)
    update_payload.pop('status_reason', None)
    update_payload.pop('send_notification', None)
    update_payload.pop('notify_title', None)
    update_payload.pop('notify_message', None)
    previous_course_id = getattr(getattr(lesson, 'coursemodule', None), 'course_id', None)
    previous_snapshot = get_lesson_source_snapshot(lesson)
    serializer = LessonSerializer(lesson, data=update_payload, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_lesson = serializer.save()
        _sync_lesson_transcript_generation(updated_lesson, previous_snapshot=previous_snapshot)
        course = getattr(getattr(updated_lesson, 'coursemodule', None), 'course', None)
        next_course_id = getattr(course, 'id', None)
        course_ids_to_recalc = {course_id for course_id in {previous_course_id, next_course_id} if course_id}
        for course_id in course_ids_to_recalc:
            from courses.services import recalc_course_structure
            recalc_course_structure(course_id)
        if not is_admin and course:
            mark_course_content_changed(course)

        return updated_lesson
    raise ValidationError(serializer.errors)


def delete_lesson(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        course = getattr(getattr(lesson, 'coursemodule', None), 'course', None)
        from learning_progress.models import LearningProgress
        has_learner_data = LearningProgress.objects.filter(lesson=lesson).exists()
        if has_learner_data:
            from django.utils import timezone as _tz
            lesson.is_deleted = True
            lesson.deleted_at = _tz.now()
            lesson.save(update_fields=['is_deleted', 'deleted_at'])
        else:
            lesson.delete()
        if course:
            mark_course_content_changed(course)
            from courses.services import recalc_course_structure
            recalc_course_structure(course.id)
        return {"message": "Lesson deleted successfully."}
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})
