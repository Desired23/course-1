from rest_framework import serializers
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

class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    instructor_avatar = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()

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
            'skills_taught',
            'prerequisites',
            'tags',
            'promotional_video',
            'status',
            'is_featured',
            'is_public',
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




class InstructorSummarySerializer(serializers.Serializer):
    """Lightweight instructor info for course detail"""
    instructor_id = serializers.IntegerField(source='id')
    user_id = serializers.IntegerField(source='user.id')
    full_name = serializers.CharField(source='user.full_name')
    avatar = serializers.CharField(source='user.avatar', allow_null=True)
    bio = serializers.CharField(allow_null=True)
    specialization = serializers.CharField(allow_null=True)
    rating = serializers.DecimalField(max_digits=4, decimal_places=2)
    total_students = serializers.IntegerField()
    total_courses = serializers.IntegerField()


class CategorySummarySerializer(serializers.Serializer):
    """Lightweight category info for course detail"""
    category_id = serializers.IntegerField(source='id')
    name = serializers.CharField()


class LessonSummarySerializer(serializers.Serializer):
    """Lesson info nested inside module"""
    lesson_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    content_type = serializers.CharField()
    video_url = serializers.CharField(allow_null=True)
    video_public_id = serializers.CharField(allow_null=True)
    signed_video_url = serializers.SerializerMethodField()
    signed_video_expires_at = serializers.SerializerMethodField()
    duration = serializers.IntegerField(allow_null=True)
    is_free = serializers.BooleanField()
    order = serializers.IntegerField()
    has_quiz = serializers.SerializerMethodField()
    quiz_count = serializers.SerializerMethodField()
    transcript_status = serializers.SerializerMethodField()
    has_published_transcript = serializers.SerializerMethodField()
    transcript_language_codes = serializers.SerializerMethodField()
    latest_transcript_version = serializers.SerializerMethodField()
    transcript_last_generated_at = serializers.SerializerMethodField()

    def get_has_quiz(self, obj):
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
        signed, _ = self._get_signed_tuple(obj)
        return signed

    def get_signed_video_expires_at(self, obj):
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
    """Module with nested lessons for course detail"""
    module_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    description = serializers.CharField(allow_null=True)
    order_number = serializers.IntegerField()
    duration = serializers.IntegerField(allow_null=True)
    lessons = serializers.SerializerMethodField()

    def get_lessons(self, obj):
        lessons = obj.lessons.filter(is_deleted=False).order_by('order')
        return LessonSummarySerializer(lessons, many=True, context=self.context).data


class UserEnrollmentSerializer(serializers.Serializer):
    """Current user's enrollment info"""
    enrollment_id = serializers.IntegerField(source='id')
    enrollment_date = serializers.DateTimeField()
    progress = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()
    last_access_date = serializers.DateTimeField(allow_null=True)
    completion_date = serializers.DateTimeField(allow_null=True)


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course detail with nested instructor, category, modules, enrollment"""
    instructor = InstructorSummarySerializer(read_only=True)
    category = CategorySummarySerializer(read_only=True)
    subcategory = CategorySummarySerializer(read_only=True)
    modules = serializers.SerializerMethodField()
    user_enrollment = serializers.SerializerMethodField()
    access_info = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()

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
            'skills_taught',
            'prerequisites',
            'tags',
            'promotional_video',
            'status',
            'is_featured',
            'is_public',
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
        ]

    def get_modules(self, obj):
        modules = obj.modules.filter(is_deleted=False).order_by('order_number')
        return ModuleSummarySerializer(modules, many=True).data

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

    def get_access_info(self, obj):
        """
        Returns access info for UX:
        - has_access: bool
        - access_type: 'admin' | 'instructor' | 'purchase' | 'subscription' | None
        - in_subscription: bool (whether course is in any active plan)
        """
        user = self.context.get('user')
        if not user:

            from subscription_plans.models import PlanCourse
            in_sub = PlanCourse.objects.filter(
                course=obj, status='active', is_deleted=False,
                plan__status='active', plan__is_deleted=False,
            ).exists()
            return {
                "has_access": False,
                "access_type": None,
                "in_subscription": in_sub,
            }
        try:
            from utils.course_access import get_course_access_info
            return get_course_access_info(user, obj)
        except Exception:
            return {"has_access": False, "access_type": None, "in_subscription": False}
