from rest_framework import serializers

from .models import LearningPath, LearningPathItem


class LearningPathItemSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(source='course.id')
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_level = serializers.CharField(source='course.level', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    course_price = serializers.CharField(source='course.price', read_only=True)
    course_discount_price = serializers.CharField(source='course.discount_price', read_only=True)
    course_discount_start_date = serializers.DateTimeField(source='course.discount_start_date', read_only=True)
    course_discount_end_date = serializers.DateTimeField(source='course.discount_end_date', read_only=True)
    course_rating = serializers.CharField(source='course.rating', read_only=True)
    course_total_students = serializers.IntegerField(source='course.total_students', read_only=True)
    course_instructor_name = serializers.SerializerMethodField()
    course_language = serializers.CharField(source='course.language', read_only=True)

    class Meta:
        model = LearningPathItem
        fields = [
            'id',
            'course_id',
            'course_title',
            'course_level',
            'duration_hours',
            'course_price',
            'course_discount_price',
            'course_discount_start_date',
            'course_discount_end_date',
            'course_rating',
            'course_total_students',
            'course_instructor_name',
            'course_language',
            'order',
            'reason',
            'is_skippable',
            'skippable_reason',
        ]

    def get_duration_hours(self, obj):
        if obj.course.duration is None:
            return None
        return round(obj.course.duration / 60, 2)

    def get_course_instructor_name(self, obj):
        if obj.course.instructor and obj.course.instructor.user:
            return obj.course.instructor.user.full_name
        return ''


class LearningPathListSerializer(serializers.ModelSerializer):
    items = LearningPathItemSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = [
            'id',
            'goal_text',
            'summary',
            'estimated_weeks',
            'is_archived',
            'created_at',
            'updated_at',
            'items',
        ]


class LearningPathDetailSerializer(serializers.ModelSerializer):
    items = LearningPathItemSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = [
            'id',
            'goal_text',
            'summary',
            'estimated_weeks',
            'is_archived',
            'created_at',
            'updated_at',
            'items',
        ]


class LearningPathCreateItemInputSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    order = serializers.IntegerField(min_value=1)
    reason = serializers.CharField()
    is_skippable = serializers.BooleanField(default=False)
    skippable_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class LearningPathCreateSerializer(serializers.Serializer):
    goal_text = serializers.CharField()
    summary = serializers.CharField()
    estimated_weeks = serializers.IntegerField(min_value=0)
    path = LearningPathCreateItemInputSerializer(many=True)


class LearningPathAdvisorMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField()
    artifact = serializers.JSONField(required=False)


class LearningPathAdvisorRequestSerializer(serializers.Serializer):
    goal_text = serializers.CharField()
    weekly_hours = serializers.IntegerField(required=False, min_value=1, max_value=80)
    messages = LearningPathAdvisorMessageSerializer(many=True, required=False)
    known_skills = serializers.ListField(child=serializers.CharField(), required=False)
