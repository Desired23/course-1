from rest_framework import serializers
from .models import Course
from instructors.models import Instructor
from categories.models import Category
from instructors.serializers import InstructorSerializers  # giả sử đã có sẵn

class CourseSerializer(serializers.ModelSerializer):
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
            'status',
            'is_featured',
            'is_public',
            'created_at',
            'updated_at',
            'published_date',
            'rating',
            'total_reviews',
            'total_students',
            'certificate',
        ]
        read_only_fields = [
            'rating', 'total_reviews', 'total_students'
        ]


# ---- Nested serializers for detail response ----

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
    duration = serializers.IntegerField(allow_null=True)
    is_free = serializers.BooleanField()
    order = serializers.IntegerField()
    has_quiz = serializers.SerializerMethodField()
    quiz_count = serializers.SerializerMethodField()

    def get_has_quiz(self, obj):
        return obj.quiz_question_lesson.filter(is_deleted=False).exists()

    def get_quiz_count(self, obj):
        return obj.quiz_question_lesson.filter(is_deleted=False).count()


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
        return LessonSummarySerializer(lessons, many=True).data


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
            'status',
            'is_featured',
            'is_public',
            'created_at',
            'updated_at',
            'published_date',
            'rating',
            'total_reviews',
            'total_students',
            'certificate',
            'modules',
            'user_enrollment',
            'access_info',
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

    def get_access_info(self, obj):
        """
        Returns access info for UX:
        - has_access: bool
        - access_type: 'admin' | 'instructor' | 'purchase' | 'subscription' | None
        - in_subscription: bool (whether course is in any active plan)
        """
        user = self.context.get('user')
        if not user:
            # Check if course is in any subscription plan (for anonymous users)
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
