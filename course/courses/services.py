from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Course
from .serializers import CourseSerializer, CourseDetailSerializer
from activity_logs.services import log_activity


INSTRUCTOR_ALLOWED_STATUS_TRANSITIONS = {
    Course.Status.DRAFT: {Course.Status.PENDING},
    Course.Status.PENDING: {Course.Status.DRAFT},
    Course.Status.REJECTED: {Course.Status.DRAFT},
    Course.Status.ARCHIVED: {Course.Status.DRAFT, Course.Status.PUBLISHED},
    Course.Status.PUBLISHED: {Course.Status.ARCHIVED},
}

COURSE_CONTENT_FIELDS = {
    'title',
    'shortdescription',
    'description',
    'category',
    'subcategory',
    'thumbnail',
    'price',
    'discount_price',
    'discount_start_date',
    'discount_end_date',
    'level',
    'language',
    'duration',
    'requirements',
    'learning_objectives',
    'target_audience',
    'tags',
    'promotional_video',
    'certificate',
    'is_public',
}


def mark_course_content_changed(course, *, save=True):
    if course.status not in {Course.Status.PUBLISHED, Course.Status.ARCHIVED}:
        return False
    if course.content_changed_since_publish:
        return False
    course.content_changed_since_publish = True
    if save:
        course.save(update_fields=['content_changed_since_publish', 'updated_at'])
    return True


def create_course(data):
    try:
        serializer = CourseSerializer(data=data)
        if serializer.is_valid():
            course = serializer.save()
            log_activity(
                user_id=course.instructor.user.id if course.instructor else None,
                action="CREATE",
                entity_type="Course",
                entity_id=course.id,
                description=f"Tạo khóa học: {course.title}"
            )
            return serializer.data
        raise ValidationError(serializer.errors)
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Lỗi khi tạo khóa học.")

def get_course_by_id(course_id, user=None):
    try:
        course = Course.objects.select_related(
            'instructor__user', 'category', 'subcategory'
        ).prefetch_related(
            'modules__lessons__quiz_question_lesson'
        ).get(id=course_id, is_deleted=False)
        print(f"get_course_by_id: found course {course_id} titled '{course.title}'")
        return CourseDetailSerializer(course, context={'user': user}).data
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Lỗi khi lấy thông tin khóa học.")

def get_all_courses(instructor_id=None, category_id=None, subcategory_id=None,
                    status=None, is_featured=None, level=None, search=None,
                    ordering=None, rating_min=None, language=None,
                    price_min=None, price_max=None, subcategory_ids=None,
                    levels=None, languages=None, duration_buckets=None,
                    certificate=None):
    try:
        from django.db.models import Q
        courses = Course.objects.filter(is_deleted=False).select_related(
            'instructor__user', 'category', 'subcategory'
        )
        if instructor_id:
            courses = courses.filter(instructor_id=instructor_id)
        if category_id:
            courses = courses.filter(category_id=category_id)
        if subcategory_id:
            courses = courses.filter(subcategory_id=subcategory_id)
        if subcategory_ids:
            courses = courses.filter(subcategory_id__in=subcategory_ids)
        if status:
            courses = courses.filter(status=status)
        if is_featured is not None:
            courses = courses.filter(is_featured=is_featured)
        if level:
            courses = courses.filter(level=level)
        if levels:
            courses = courses.filter(level__in=levels)
        if rating_min is not None:
            courses = courses.filter(rating__gte=rating_min)
        if language:
            courses = courses.filter(language__iexact=language)
        if languages:
            language_q = Q()
            for lang in languages:
                language_q |= Q(language__iexact=lang)
            courses = courses.filter(language_q)
        if price_min is not None:
            courses = courses.filter(price__gte=price_min)
        if price_max is not None:
            courses = courses.filter(price__lte=price_max)
        if certificate is not None:
            courses = courses.filter(certificate=certificate)
        if duration_buckets:
            duration_q = Q()
            for bucket in duration_buckets:
                if bucket == 'short':
                    duration_q |= Q(duration__lt=120)
                elif bucket == 'medium':
                    duration_q |= Q(duration__gte=120, duration__lte=360)
                elif bucket == 'long':
                    duration_q |= Q(duration__gt=360)
            if duration_q:
                courses = courses.filter(duration_q)
        if search:
            courses = courses.filter(
                Q(title__icontains=search) |
                Q(shortdescription__icontains=search) |
                Q(description__icontains=search)
            )
        if ordering:
            allowed = {
                'created_at', '-created_at',
                'price', '-price',
                'rating', '-rating',
                'total_students', '-total_students',
                'title', '-title',
            }
            if ordering in allowed:
                courses = courses.order_by(ordering)
        return courses
    except Exception:
        raise ValidationError("Lỗi khi lấy danh sách khóa học.")


def get_public_stats():
    """Return aggregate platform stats for the homepage."""
    from users.models import User
    from instructors.models import Instructor
    from django.db.models import Avg
    try:
        total_courses = Course.objects.filter(is_deleted=False, status='published').count()
        total_students = User.objects.filter(user_type='student', status='active', is_deleted=False).count()
        total_instructors = Instructor.objects.count()
        avg_rating = Course.objects.filter(
            is_deleted=False, status='published', rating__gt=0
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        return {
            'total_courses': total_courses,
            'total_students': total_students,
            'total_instructors': total_instructors,
            'avg_rating': round(float(avg_rating), 1)
        }
    except Exception:
        return {
            'total_courses': 0,
            'total_students': 0,
            'total_instructors': 0,
            'avg_rating': 0
        }

def update_course(course_id, data, requesting_user=None):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
        is_admin = bool(requesting_user and hasattr(requesting_user, 'admin'))

        # Ownership check: instructor can only update own courses
        if requesting_user and not is_admin:
            instructor = getattr(requesting_user, 'instructor', None)
            if not instructor or course.instructor_id != instructor.id:
                raise ValidationError("You do not have permission to update this course.")

        payload = data.copy()
        status_reason = payload.pop('status_reason', None)
        send_notification = payload.pop('send_notification', False)
        notify_title = payload.pop('notify_title', None)
        notify_message = payload.pop('notify_message', None)

        if isinstance(send_notification, str):
            send_notification = send_notification.lower() in ('1', 'true', 'yes', 'on')
        else:
            send_notification = bool(send_notification)

        old_status = course.status
        requested_status = payload.get('status')
        content_fields_being_updated = COURSE_CONTENT_FIELDS.intersection(payload.keys())

        if requested_status is not None and not is_admin:
            normalized_status = str(requested_status).strip().lower()
            valid_statuses = {choice for choice, _ in Course.Status.choices}
            if normalized_status not in valid_statuses:
                raise ValidationError("Invalid course status.")
            if normalized_status != old_status:
                allowed_next_statuses = INSTRUCTOR_ALLOWED_STATUS_TRANSITIONS.get(old_status, set())
                if normalized_status not in allowed_next_statuses:
                    raise ValidationError(
                        f"Instructors cannot change course status from '{old_status}' to '{normalized_status}'."
                    )
                if (
                    old_status == Course.Status.ARCHIVED
                    and normalized_status == Course.Status.PUBLISHED
                    and course.content_changed_since_publish
                ):
                    raise ValidationError(
                        "This archived course has changed since it was last published. Move it to draft and submit it for review again."
                    )
            payload['status'] = normalized_status

        serializer = CourseSerializer(course, data=payload, partial=True)
        if serializer.is_valid():
            updated_course = serializer.save()
            if not is_admin and content_fields_being_updated and old_status in {Course.Status.PUBLISHED, Course.Status.ARCHIVED}:
                mark_course_content_changed(updated_course, save=False)
            log_activity(
                user_id=updated_course.instructor.user.id if updated_course.instructor else None,
                action="UPDATE",
                entity_type="Course",
                entity_id=course_id,
                description=f"Updated course: {updated_course.title}"
            )

            if old_status != updated_course.status:
                reset_publish_tracking = False
                update_fields = []
                if updated_course.status == Course.Status.PUBLISHED:
                    if not updated_course.published_date:
                        updated_course.published_date = timezone.now()
                        update_fields.append('published_date')
                    if updated_course.content_changed_since_publish:
                        updated_course.content_changed_since_publish = False
                        update_fields.append('content_changed_since_publish')
                    reset_publish_tracking = True
                if update_fields:
                    update_fields.append('updated_at')
                    updated_course.save(update_fields=update_fields)
                reason_text = (status_reason or '').strip()
                actor_label = 'Admin' if is_admin else 'Instructor'
                reason_suffix = f" | Reason: {reason_text}" if reason_text else ''
                log_activity(
                    user_id=requesting_user.id if requesting_user else None,
                    action="UPDATE",
                    entity_type="Course",
                    entity_id=course_id,
                    description=(
                        f"{actor_label} changed course status '{updated_course.title}' "
                        f"from '{old_status}' to '{updated_course.status}'{reason_suffix}"
                    ),
                )

                if is_admin and send_notification:
                    instructor_user_id = updated_course.instructor.user.id if updated_course.instructor else None
                    if instructor_user_id:
                        title = (notify_title or '').strip() or f"Course '{updated_course.title}' status changed"
                        default_message = (
                            f"Admin changed the course status from '{old_status}' to '{updated_course.status}'."
                        )
                        if reason_text:
                            default_message += f" Reason: {reason_text}"
                        message = (notify_message or '').strip() or default_message
                        try:
                            from notifications.services import create_notification
                            create_notification(
                                receiver_id=instructor_user_id,
                                title=title,
                                message=message,
                                type='course',
                                related_id=updated_course.id,
                                sender=requesting_user.id if requesting_user else None,
                                notification_code='course_status_changed_by_admin',
                            )
                        except Exception:
                            # Notification failures should not block status update.
                            pass
            elif not is_admin and content_fields_being_updated and old_status in {Course.Status.PUBLISHED, Course.Status.ARCHIVED}:
                if updated_course.content_changed_since_publish:
                    updated_course.save(update_fields=['content_changed_since_publish', 'updated_at'])

            return serializer.data
        raise ValidationError(serializer.errors)
    except Course.DoesNotExist:
        raise ValidationError("Course not found")

def delete_course(course_id, requesting_user=None):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
        # Ownership check: instructor can only delete own courses
        if requesting_user and not hasattr(requesting_user, 'admin'):
            instructor = getattr(requesting_user, 'instructor', None)
            if not instructor or course.instructor_id != instructor.id:
                raise ValidationError("Bạn không có quyền xóa khóa học này.")
        course_title = course.title
        instructor_id = course.instructor.user.id if course.instructor else None
        course.is_deleted = True
        course.deleted_at = timezone.now()
        course.save(update_fields=['is_deleted', 'deleted_at'])
        log_activity(
            user_id=instructor_id,
            action="DELETE",
            entity_type="Course",
            entity_id=course_id,
            description=f"Xóa khóa học: {course_title}"
        )
        return {"message": "Course deleted successfully"}
    except Course.DoesNotExist:
        raise ValidationError("Course not found")

def validate_course_data(data):
    serializer = CourseSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}

