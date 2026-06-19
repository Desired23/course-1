from rest_framework import serializers
from decimal import Decimal
from .models import Course
from instructors.models import Instructor
from categories.models import Category
from instructors.serializers import InstructorSerializers

from lessons.video_signing import build_signed_video_url
from transcripts.services import (
    get_latest_transcript_version,
    get_lesson_transcript_languages,
    get_lesson_transcript_status,
    get_transcript_last_generated_at,
)


def _can_view_course_holds(serializer):
    user = serializer.context.get('user')
    request = serializer.context.get('request')
    if user is None and request is not None:
        user = getattr(request, 'user', None)
    try:
        from utils.roles import is_active_admin
        return is_active_admin(user)
    except Exception:
        return False


def _can_view_draft_course_content(serializer, course):
    user = serializer.context.get('user')
    request = serializer.context.get('request')
    if user is None and request is not None:
        user = getattr(request, 'user', None)
    try:
        from utils.roles import is_active_admin, is_active_instructor
        if is_active_admin(user):
            return True
        return bool(
            user
            and is_active_instructor(user)
            and getattr(user, 'instructor', None)
            and course.instructor_id == user.instructor.id
        )
    except Exception:
        return False


def _active_course_holds(course):
    return course.copyright_earning_holds.filter(status='active').select_related('earning')


def _active_course_hold_count(course):
    return _active_course_holds(course).count()


def _active_course_held_amount(course):
    total = sum((hold.earning.net_amount for hold in _active_course_holds(course)), Decimal('0.00'))
    return str(total)


def _current_course_content_action(course):
    """content_action của copyright case hiện hành (mới nhất) cho khóa học —
    dùng để phân biệt takedown vs chặn truy cập (freeze) trên UI admin."""
    from reports.models import CopyrightCase, Report
    case = (
        CopyrightCase.objects
        .filter(target_type=Report.TargetType.COURSE, target_id=course.id)
        .order_by('-updated_at')
        .first()
    )
    return case.content_action if case else None

class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    instructor_avatar = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    active_hold_count = serializers.SerializerMethodField()
    held_amount = serializers.SerializerMethodField()
    moderation_action = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'shortdescription',
            'description',
            'instructor',
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
            'total_lessons',
            'total_modules',
            'requirements',
            'learning_objectives',
            'target_audience',
            'tags',
            'promotional_video',
            'status',
            'is_featured',
            'is_public',
            'admin_hidden',
            'is_hard_blocked',
            'created_at',
            'updated_at',
            'published_date',
            'content_changed_since_publish',
            'rating',
            'total_reviews',
            'total_students',
            'certificate',
            'instructor_name',
            'instructor_avatar',
            'category_name',
            'subcategory_name',
            'duration_hours',
            'active_hold_count',
            'held_amount',
            'moderation_action',
        ]
        read_only_fields = [
            'rating', 'total_reviews', 'total_students'
        ]

    def get_instructor_name(self, obj):
        if obj.instructor and hasattr(obj.instructor, 'user'):
            return obj.instructor.user.full_name
        return None

    def get_instructor_avatar(self, obj):
        if obj.instructor and hasattr(obj.instructor, 'user'):
            return obj.instructor.user.avatar
        return None

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return None

    def get_subcategory_name(self, obj):
        if obj.subcategory:
            return obj.subcategory.name
        return None

    def get_duration_hours(self, obj):
        if obj.duration is None:
            return None
        return round(obj.duration / 60, 2)

    def get_active_hold_count(self, obj):
        if not _can_view_course_holds(self):
            return 0
        return _active_course_hold_count(obj)

    def get_held_amount(self, obj):
        if not _can_view_course_holds(self):
            return '0.00'
        return _active_course_held_amount(obj)

    def get_moderation_action(self, obj):
        if not _can_view_course_holds(self):
            return None
        return _current_course_content_action(obj)




class InstructorSummarySerializer(serializers.Serializer):
    instructor_id = serializers.IntegerField(source='id')
    user_id = serializers.IntegerField(source='user.id')
    full_name = serializers.CharField(source='user.full_name')
    avatar = serializers.CharField(source='user.avatar', allow_null=True)
    bio = serializers.CharField(allow_null=True)
    specialization = serializers.CharField(allow_null=True)
    # Tính động — field lưu cứng trên Instructor không được maintain.
    rating = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()
    total_courses = serializers.SerializerMethodField()

    def get_rating(self, obj):
        from instructors.stats import average_rating
        return average_rating(obj)

    def get_total_students(self, obj):
        from instructors.stats import student_count
        return student_count(obj)

    def get_total_courses(self, obj):
        from instructors.stats import published_course_count
        return published_course_count(obj)


class CategorySummarySerializer(serializers.Serializer):
    category_id = serializers.IntegerField(source='id')
    name = serializers.CharField()


class LessonSummarySerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    content_type = serializers.CharField()
    video_url = serializers.SerializerMethodField()
    video_public_id = serializers.SerializerMethodField()
    signed_video_url = serializers.SerializerMethodField()
    signed_video_expires_at = serializers.SerializerMethodField()
    duration = serializers.IntegerField(allow_null=True)
    is_free = serializers.BooleanField()
    order = serializers.IntegerField()
    has_quiz = serializers.SerializerMethodField()
    quiz_count = serializers.SerializerMethodField()

    def _media_allowed(self, obj):
        return bool(self.context.get('media_allowed')) or bool(obj.is_free)

    def get_video_url(self, obj):
        return obj.video_url if self._media_allowed(obj) else None

    def get_video_public_id(self, obj):
        return obj.video_public_id if self._media_allowed(obj) else None
    transcript_status = serializers.SerializerMethodField()
    has_published_transcript = serializers.SerializerMethodField()
    transcript_language_codes = serializers.SerializerMethodField()
    latest_transcript_version = serializers.SerializerMethodField()
    transcript_last_generated_at = serializers.SerializerMethodField()

    def get_has_quiz(self, obj):
        if obj.content_type == 'code' and obj.content:
            return True
        return obj.quiz_question_lesson.filter(is_deleted=False).exists()

    def get_quiz_count(self, obj):
        return obj.quiz_question_lesson.filter(is_deleted=False).count()

    def _get_signed_tuple(self, obj):
        cache = self.context.setdefault('_signed_video_cache', {})
        if obj.id not in cache:
            cache[obj.id] = build_signed_video_url(
                raw_video_url=obj.video_url,
                explicit_public_id=obj.video_public_id,
            )
        return cache[obj.id]

    def get_signed_video_url(self, obj):
        if not self._media_allowed(obj):
            return None
        signed, _ = self._get_signed_tuple(obj)
        return signed

    def get_signed_video_expires_at(self, obj):
        if not self._media_allowed(obj):
            return None
        _, expires_at = self._get_signed_tuple(obj)
        return expires_at

    def get_transcript_status(self, obj):
        return get_lesson_transcript_status(obj)

    def get_has_published_transcript(self, obj):
        return obj.transcripts.filter(status='published').exists()

    def get_transcript_language_codes(self, obj):
        return get_lesson_transcript_languages(obj)

    def get_latest_transcript_version(self, obj):
        return get_latest_transcript_version(obj)

    def get_transcript_last_generated_at(self, obj):
        return get_transcript_last_generated_at(obj)


class ModuleSummarySerializer(serializers.Serializer):
    module_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    description = serializers.CharField(allow_null=True)
    order_number = serializers.IntegerField()
    duration = serializers.IntegerField(allow_null=True)
    lessons = serializers.SerializerMethodField()

    def get_lessons(self, obj):
        lessons = obj.lessons.filter(
            is_deleted=False,
            content_type__in=['video', 'quiz', 'code'],
        )
        if self.context.get('published_only'):
            lessons = lessons.filter(status='published')
        lessons = lessons.order_by('order')
        return LessonSummarySerializer(lessons, many=True, context=self.context).data


class UserEnrollmentSerializer(serializers.Serializer):
    enrollment_id = serializers.IntegerField(source='id')
    enrollment_date = serializers.DateTimeField()
    progress = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()
    last_access_date = serializers.DateTimeField(allow_null=True)
    completion_date = serializers.DateTimeField(allow_null=True)


class CourseDetailSerializer(serializers.ModelSerializer):
    instructor = InstructorSummarySerializer(read_only=True)
    category = CategorySummarySerializer(read_only=True)
    subcategory = CategorySummarySerializer(read_only=True)
    modules = serializers.SerializerMethodField()
    user_enrollment = serializers.SerializerMethodField()
    access_info = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    total_resources = serializers.SerializerMethodField()
    active_hold_count = serializers.SerializerMethodField()
    held_amount = serializers.SerializerMethodField()
    moderation_action = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'shortdescription',
            'description',
            'instructor',
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
            'total_lessons',
            'total_modules',
            'requirements',
            'learning_objectives',
            'target_audience',
            'tags',
            'promotional_video',
            'status',
            'is_featured',
            'is_public',
            'admin_hidden',
            'is_hard_blocked',
            'created_at',
            'updated_at',
            'published_date',
            'content_changed_since_publish',
            'rating',
            'total_reviews',
            'total_students',
            'certificate',
            'modules',
            'user_enrollment',
            'access_info',
            'duration_hours',
            'total_resources',
            'active_hold_count',
            'held_amount',
            'moderation_action',
        ]

    def get_modules(self, obj):
        modules = obj.modules.filter(is_deleted=False).order_by('order_number')
        published_only = not _can_view_draft_course_content(self, obj)
        if published_only:
            modules = modules.filter(status='Published')
        user = self.context.get('user')
        media_allowed = False
        if user:
            from utils.course_access import has_existing_course_access
            media_allowed = has_existing_course_access(user, obj)
        context = dict(self.context)
        context['media_allowed'] = media_allowed
        context['published_only'] = published_only
        return ModuleSummarySerializer(modules, many=True, context=context).data

    def get_user_enrollment(self, obj):
        user = self.context.get('user')
        if not user:
            return None
        try:
            from enrollments.models import Enrollment
            enrollment = Enrollment.objects.get(
                user=user, course=obj, is_deleted=False
            )
            return UserEnrollmentSerializer(enrollment).data
        except Exception:
            return None

    def get_duration_hours(self, obj):
        if obj.duration is None:
            return None
        return round(obj.duration / 60, 2)

    def get_total_resources(self, obj):
        from lesson_attachments.models import LessonAttachment
        resources = LessonAttachment.objects.filter(
            lesson__coursemodule__course=obj,
            is_deleted=False,
            lesson__is_deleted=False,
            lesson__coursemodule__is_deleted=False,
        )
        if not _can_view_draft_course_content(self, obj):
            resources = resources.filter(
                lesson__status='published',
                lesson__coursemodule__status='Published',
            )
        return resources.count()

    def get_active_hold_count(self, obj):
        if not _can_view_course_holds(self):
            return 0
        return _active_course_hold_count(obj)

    def get_held_amount(self, obj):
        if not _can_view_course_holds(self):
            return '0.00'
        return _active_course_held_amount(obj)

    def get_moderation_action(self, obj):
        if not _can_view_course_holds(self):
            return None
        return _current_course_content_action(obj)

    def get_access_info(self, obj):
        user = self.context.get('user')
        if not user:

            from utils.course_access import get_relevant_subscription_plan
            plan = get_relevant_subscription_plan(None, obj)
            return {
                "has_access": False,
                "access_type": None,
                "in_subscription": plan is not None,
                "subscription_plan": plan,
            }
        try:
            from utils.course_access import get_course_access_info
            return get_course_access_info(user, obj)
        except Exception:
            return {"has_access": False, "access_type": None, "in_subscription": False}
