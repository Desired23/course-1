from decimal import Decimal
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Course
from .serializers import CourseSerializer, CourseDetailSerializer
from activity_logs.services import log_activity
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from enrollments.constants import OWNED_ENROLLMENT_STATUSES
from enrollments.models import Enrollment
from learning_progress.models import LearningProgress
from reviews.models import Review
from utils.roles import is_active_admin, is_active_instructor


INSTRUCTOR_ALLOWED_STATUS_TRANSITIONS = {
    Course.Status.DRAFT: {Course.Status.PENDING},
    Course.Status.PENDING: {Course.Status.DRAFT},
    Course.Status.REJECTED: {Course.Status.DRAFT, Course.Status.PENDING},
    Course.Status.ARCHIVED: {Course.Status.DRAFT, Course.Status.PENDING, Course.Status.PUBLISHED},
    Course.Status.PUBLISHED: {Course.Status.ARCHIVED, Course.Status.DRAFT},
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


def recalc_course_rating(course_id):
    from reviews.models import Review
    from django.db.models import Avg, Count
    agg = Review.objects.filter(course_id=course_id, is_deleted=False).exclude(
        status=Review.StatusChoices.REJECTED
    ).aggregate(avg=Avg('rating'), total=Count('id'))
    Course.objects.filter(id=course_id).update(
        rating=round(float(agg['avg']), 2) if agg['avg'] is not None else Decimal('0.00'),
        total_reviews=agg['total'] or 0,
    )


def recalc_course_students(course_id):
    from django.db.models import Count
    total = Enrollment.objects.filter(
        course_id=course_id,
        is_deleted=False,
        status__in=OWNED_ENROLLMENT_STATUSES,
    ).count()
    Course.objects.filter(id=course_id).update(total_students=total)


def recalc_course_structure(course_id):
    from coursemodules.models import CourseModule
    from lessons.models import Lesson
    supported_content_types = Lesson.ContentType.values
    modules = CourseModule.objects.filter(course_id=course_id, is_deleted=False).annotate(
        lesson_count=Count(
            'lessons',
            filter=Q(
                lessons__is_deleted=False,
                lessons__status=Lesson.Status.PUBLISHED,
                lessons__content_type__in=supported_content_types,
            ),
        ),
        duration_total=Coalesce(
            Sum(
                'lessons__duration',
                filter=Q(
                    lessons__is_deleted=False,
                    lessons__status=Lesson.Status.PUBLISHED,
                    lessons__content_type__in=supported_content_types,
                ),
            ),
            0,
        ),
    )

    total_modules = 0
    total_lessons = 0
    total_duration = 0
    modules_to_update = []

    for module in modules:
        if module.status == 'Published':
            total_modules += 1
            total_lessons += module.lesson_count
            total_duration += module.duration_total
        next_duration = module.duration_total or None
        if module.duration != next_duration:
            module.duration = next_duration
            modules_to_update.append(module)

    if modules_to_update:
        CourseModule.objects.bulk_update(modules_to_update, ['duration'])

    Course.objects.filter(id=course_id).update(
        total_modules=total_modules,
        total_lessons=total_lessons,
        duration=total_duration or None,
    )


def create_course(data):
    try:
        payload = data.copy()
        payload.pop('duration', None)
        payload.pop('status', None)
        payload['status'] = Course.Status.DRAFT
        serializer = CourseSerializer(data=payload)
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
    from rest_framework.exceptions import NotFound
    try:
        course = Course.objects.select_related(
            'instructor__user', 'category', 'subcategory'
        ).prefetch_related(
            'modules__lessons__quiz_question_lesson'
        ).get(id=course_id, is_deleted=False)

        is_admin = is_active_admin(user)
        is_owner = bool(
            user and is_active_instructor(user)
            and getattr(user, 'instructor', None)
            and course.instructor_id == user.instructor.id
        )
        if not (is_admin or is_owner):
            if course.is_hard_blocked:
                raise NotFound("Course not found")
            publicly_visible = (
                course.status == Course.Status.PUBLISHED
                and course.is_public
                and not course.admin_hidden
            )
            if not publicly_visible:
                from utils.course_access import has_existing_course_access
                if not has_existing_course_access(user, course):
                    raise NotFound("Course not found")

        return CourseDetailSerializer(course, context={'user': user}).data
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except (ValidationError, NotFound):
        raise
    except Exception as e:
        raise ValidationError(f"Lỗi khi lấy thông tin khóa học: {e}")


def get_course_students(course_id):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
        enrollments = list(
            Enrollment.objects.filter(
                course=course,
                is_deleted=False,
                user__is_deleted=False,
            ).select_related('user', 'course').order_by('-last_access_date', '-updated_at')
        )
        if not enrollments:
            return []

        progress_by_enrollment = {
            row['enrollment_id']: row
            for row in LearningProgress.objects.filter(
                enrollment_id__in=[enrollment.id for enrollment in enrollments],
                is_deleted=False,
            )
            .values('enrollment_id')
            .annotate(
                total_time_spent=Sum('time_spent'),
                avg_progress=Avg('progress_percentage'),
            )
        }

        review_by_user = {
            row['user_id']: row['rating']
            for row in Review.objects.filter(course=course, is_deleted=False)
            .values('user_id', 'rating')
        }

        rows = []
        for enrollment in enrollments:
            progress_data = progress_by_enrollment.get(enrollment.id, {})
            rows.append({
                'student_id': enrollment.user_id,
                'full_name': enrollment.user.full_name,
                'email': enrollment.user.email,
                'avatar': enrollment.user.avatar,
                'status': enrollment.status,
                'enrolled_at': enrollment.enrollment_date,
                'last_access_date': enrollment.last_access_date,
                'average_progress': round(float(enrollment.progress or progress_data.get('avg_progress') or 0), 2),
                'study_time_minutes': int(progress_data.get('total_time_spent') or 0),
                'rating': review_by_user.get(enrollment.user_id),
            })

        return rows
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Lỗi khi lấy danh sách học viên của khóa học.")

def get_all_courses(instructor_id=None, category_id=None, subcategory_id=None,
                    status=None, is_featured=None, level=None, search=None,
                    ordering=None, rating_min=None, language=None,
                    price_min=None, price_max=None, subcategory_ids=None,
                    levels=None, languages=None, duration_buckets=None,
                    certificate=None, public_only=False, hide_drafts=False):
    try:
        from django.db.models import Q
        courses = Course.objects.filter(is_deleted=False).select_related(
            'instructor__user', 'category', 'subcategory'
        )
        if hide_drafts and not public_only:
            courses = courses.exclude(status=Course.Status.DRAFT)
        if public_only:
            courses = courses.filter(
                status=Course.Status.PUBLISHED,
                is_public=True,
                admin_hidden=False,
                is_hard_blocked=False,
                instructor__is_deleted=False,
                instructor__user__status='active',
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
        else:
            courses = courses.order_by('-created_at', '-id')
        return courses
    except Exception:
        raise ValidationError("Lỗi khi lấy danh sách khóa học.")


def get_public_stats():
    from users.models import User
    from instructors.models import Instructor
    from django.db.models import Avg
    try:
        total_courses = Course.objects.filter(is_deleted=False, status='published').count()
        total_students = User.objects.filter(
            status='active', is_deleted=False
        ).exclude(instructor__is_deleted=False).exclude(admin__is_deleted=False).count()
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
        is_admin = is_active_admin(requesting_user)


        if requesting_user and not is_admin:
            instructor = getattr(requesting_user, 'instructor', None)
            if not is_active_instructor(requesting_user) or course.instructor_id != instructor.id:
                raise PermissionDenied("Bạn không có quyền chỉnh sửa khóa học này.")

        payload = data.copy()
        payload.pop('duration', None)
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
                if course.admin_hidden or course.is_hard_blocked:
                    raise ValidationError(
                        "Khóa học đang bị admin ngừng bán hoặc khóa, giảng viên không thể tự đổi trạng thái."
                    )
                allowed_next_statuses = INSTRUCTOR_ALLOWED_STATUS_TRANSITIONS.get(old_status, set())
                if normalized_status not in allowed_next_statuses:
                    raise ValidationError(
                        f"Instructors cannot change course status from '{old_status}' to '{normalized_status}'."
                    )
                if normalized_status == Course.Status.DRAFT:
                    has_students = Enrollment.objects.filter(
                        course=course,
                        is_deleted=False,
                        status__in=OWNED_ENROLLMENT_STATUSES,
                    ).exists()
                    if has_students:
                        raise ValidationError(
                            "Không thể chuyển khóa học về nháp khi đã có học viên."
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

                if is_admin:
                    try:
                        from notifications.services import notify_admins
                        notify_admins(
                            title="Trang thai khoa hoc da thay doi",
                            message=f"Khoa hoc \"{updated_course.title}\" da chuyen tu {old_status} sang {updated_course.status}.",
                            type="course",
                            notification_code="course_status_changed_by_admin",
                            related_id=updated_course.id,
                            sender_id=requesting_user.id if requesting_user else None,
                            action_url=f"/admin/courses/{updated_course.id}",
                            force=True,
                        )
                    except Exception:
                        pass

                if is_admin and send_notification:
                    instructor_user_id = updated_course.instructor.user.id if updated_course.instructor else None
                    if instructor_user_id:
                        status_labels = {
                            Course.Status.DRAFT: 'Bản nháp',
                            Course.Status.PENDING: 'Chờ duyệt',
                            Course.Status.PUBLISHED: 'Đã xuất bản',
                            Course.Status.REJECTED: 'Bị từ chối',
                            Course.Status.ARCHIVED: 'Đã lưu trữ',
                        }
                        new_label = status_labels.get(updated_course.status, updated_course.status)
                        title = (notify_title or '').strip() or f"Cập nhật khóa học \"{updated_course.title}\""
                        if updated_course.status == Course.Status.PUBLISHED:
                            default_message = f"Khóa học \"{updated_course.title}\" của bạn đã được duyệt và xuất bản."
                        elif updated_course.status == Course.Status.REJECTED:
                            default_message = f"Khóa học \"{updated_course.title}\" của bạn chưa được duyệt."
                        elif updated_course.status == Course.Status.ARCHIVED:
                            default_message = f"Khóa học \"{updated_course.title}\" đã được lưu trữ."
                        else:
                            default_message = f"Trạng thái khóa học \"{updated_course.title}\" đã được cập nhật thành \"{new_label}\"."
                        if reason_text:
                            default_message += f" Lý do: {reason_text}"
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

                            pass

                    if updated_course.instructor and updated_course.instructor.user:
                        new_status = updated_course.status
                        if new_status in (Course.Status.PUBLISHED, Course.Status.REJECTED):
                            try:
                                from utils.mailer.mailer import send_course_status_changed
                                import threading
                                instructor_user = updated_course.instructor.user
                                threading.Thread(
                                    target=send_course_status_changed,
                                    args=(instructor_user.email, instructor_user.full_name, updated_course.title, new_status),
                                    kwargs={"reason": reason_text or None},
                                    daemon=True,
                                ).start()
                            except Exception:
                                pass
            elif not is_admin and content_fields_being_updated and old_status in {Course.Status.PUBLISHED, Course.Status.ARCHIVED}:
                if updated_course.content_changed_since_publish:
                    updated_course.save(update_fields=['content_changed_since_publish', 'updated_at'])

            return serializer.data
        raise ValidationError(serializer.errors)
    except Course.DoesNotExist:
        raise ValidationError("Course not found")

def _course_has_bound_data(course):
    from enrollments.models import Enrollment
    from payment_details.models import Payment_Details
    from certificates.models import Certificate
    from reviews.models import Review
    from instructor_earnings.models import InstructorEarning
    from subscription_plans.models import PlanCourse

    checks = [
        Enrollment.objects.filter(course=course, is_deleted=False),
        Payment_Details.objects.filter(course=course, is_deleted=False),
        Certificate.objects.filter(course=course, is_deleted=False),
        Review.objects.filter(course=course, is_deleted=False),
        InstructorEarning.objects.filter(course=course, is_deleted=False),
        PlanCourse.objects.filter(course=course, status=PlanCourse.Status.ACTIVE, is_deleted=False),
    ]
    return any(qs.exists() for qs in checks)


def delete_course(course_id, requesting_user=None):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)

        if requesting_user and not is_active_admin(requesting_user):
            instructor = getattr(requesting_user, 'instructor', None)
            if not is_active_instructor(requesting_user) or course.instructor_id != instructor.id:
                raise ValidationError("Bạn không có quyền xóa khóa học này.")
            if _course_has_bound_data(course):
                raise ValidationError(
                    "Không thể xóa khóa học đã có học viên hoặc giao dịch. "
                    "Vui lòng lưu trữ (archive/unpublish) khóa học thay vì xóa."
                )
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


# Hành động xử lý vi phạm — đi qua copyright-case pipeline (hold/refund/strike).
COURSE_VIOLATION_ACTIONS = {'suspend_sale', 'freeze', 'takedown', 'restore'}


def moderate_course(course_id, action, reason='', actor=None,
                    count_as_strike=True, with_refund=True, with_hold=True):
    from rest_framework.exceptions import NotFound

    action = (action or '').strip().lower()

    # Vi phạm bản quyền: tái dùng pipeline case (tạo case do admin chủ động nếu
    # chưa có report nào), để hold/refund/strike chạy thống nhất ở mọi nơi.
    if action == 'release_holds':
        from reports.copyright_services import release_course_holds
        try:
            course = Course.objects.get(id=course_id, is_deleted=False)
        except Course.DoesNotExist:
            raise NotFound("Course not found.")
        release_course_holds(course_id, actor, reason)
        return course

    if action in COURSE_VIOLATION_ACTIONS:
        from reports.copyright_services import get_or_create_admin_case, admin_action
        case = get_or_create_admin_case(course_id, actor)
        admin_action(
            case.id, actor, action, message=reason,
            count_as_strike=count_as_strike, with_refund=with_refund, with_hold=with_hold,
        )
        try:
            return Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise NotFound("Course not found.")

    # Vòng đời duyệt bài.
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
    except Course.DoesNotExist:
        raise NotFound("Course not found.")

    if action == 'approve':
        course.status = Course.Status.PUBLISHED
        course.admin_hidden = False
        course.is_hard_blocked = False
    elif action == 'reject':
        course.status = Course.Status.REJECTED
    elif action == 'archive':
        course.status = Course.Status.ARCHIVED
        course.admin_hidden = True
    elif action == 'dismiss':
        pass
    else:
        raise ValidationError({
            'error': 'Invalid action. Use: approve, reject, archive, dismiss, '
                     'suspend_sale, freeze, takedown, restore, release_holds'
        })

    course.save()
    return course
