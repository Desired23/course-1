from rest_framework import serializers
from .models import (
    SubscriptionPlan,
    PlanCourse,
    UserSubscription,
    CourseSubscriptionConsent,
    SubscriptionUsage,
)


class PlanCourseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.CharField(source='course.thumbnail', read_only=True)
    course_instructor = serializers.SerializerMethodField()
    course_price = serializers.DecimalField(
        source='course.price', max_digits=10, decimal_places=2, read_only=True
    )
    course_rating = serializers.DecimalField(
        source='course.rating', max_digits=4, decimal_places=2, read_only=True
    )

    class Meta:
        model = PlanCourse
        fields = [
            'id', 'plan', 'course', 'status', 'added_at',
            'added_reason', 'removed_at',
            'course_title', 'course_thumbnail', 'course_instructor',
            'course_price', 'course_rating',
        ]
        read_only_fields = ['id', 'added_at', 'removed_at']
        extra_kwargs = {'plan': {'required': False}}

    def get_course_instructor(self, obj):
        if obj.course.instructor and obj.course.instructor.user:
            return obj.course.instructor.user.full_name
        return None


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    courses = PlanCourseSerializer(source='plan_courses', many=True, read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    current_subscribers = serializers.IntegerField(read_only=True)
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'discount_price',
            'duration_type', 'duration_days', 'status',
            'is_featured', 'max_subscribers', 'instructor_share_percent',
            'yearly_discount_percent',
            'thumbnail', 'features', 'not_included', 'badge_text',
            'icon', 'highlight_color',
            'created_by', 'created_at', 'updated_at',
            'effective_price', 'current_subscribers', 'course_count',
            'courses',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'effective_price', 'current_subscribers',
        ]

    def get_course_count(self, obj):
        return obj.plan_courses.filter(is_deleted=False, status='active').count()


class SubscriptionPlanListSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'discount_price',
            'duration_type', 'duration_days', 'status',
            'is_featured', 'thumbnail', 'features', 'not_included',
            'yearly_discount_percent',
            'badge_text', 'icon', 'highlight_color',
            'effective_price', 'course_count',
        ]

    def get_course_count(self, obj):
        return obj.plan_courses.filter(is_deleted=False, status='active').count()


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_detail = SubscriptionPlanListSerializer(source='plan', read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'plan', 'payment', 'status',
            'start_date', 'end_date', 'auto_renew',
            'cancelled_at', 'created_at',
            'plan_name', 'plan_detail', 'is_active',
        ]
        read_only_fields = [
            'id', 'created_at', 'cancelled_at',
        ]


class UserSubscriptionListSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_name', 'status',
            'start_date', 'end_date', 'auto_renew', 'cancelled_at',
            'is_active', 'user', 'user_name', 'user_email',
        ]


class CourseSubscriptionConsentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CourseSubscriptionConsent
        fields = [
            'id', 'instructor', 'course', 'course_title',
            'consent_status', 'note', 'consented_at',
        ]
        read_only_fields = ['id', 'consented_at', 'instructor']


class SubscriptionUsageSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = SubscriptionUsage
        fields = [
            'id', 'user_subscription', 'user', 'course', 'course_title',
            'enrollment', 'usage_type', 'usage_date',
            'access_count', 'consumed_minutes', 'last_accessed_at',
        ]
        read_only_fields = [
            'id', 'usage_date', 'last_accessed_at',
            'access_count', 'user_subscription', 'user',
        ]
