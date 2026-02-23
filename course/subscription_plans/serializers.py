from rest_framework import serializers
from .models import SubscriptionPlan, PlanCourse, UserSubscription


class PlanCourseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.CharField(source='course.thumbnail', read_only=True)
    course_instructor = serializers.SerializerMethodField()

    class Meta:
        model = PlanCourse
        fields = [
            'id', 'plan', 'course', 'added_at',
            'course_title', 'course_thumbnail', 'course_instructor',
        ]
        read_only_fields = ['id', 'added_at']
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
            'thumbnail', 'created_by', 'created_at', 'updated_at',
            'effective_price', 'current_subscribers', 'course_count',
            'courses',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'effective_price', 'current_subscribers',
        ]

    def get_course_count(self, obj):
        return obj.plan_courses.filter(is_deleted=False).count()


class SubscriptionPlanListSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'discount_price',
            'duration_type', 'duration_days', 'status',
            'is_featured', 'thumbnail', 'effective_price', 'course_count',
        ]

    def get_course_count(self, obj):
        return obj.plan_courses.filter(is_deleted=False).count()


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

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_name', 'status',
            'start_date', 'end_date', 'is_active',
        ]
