from rest_framework import serializers

from .models import LearningPath, LearningPathItem, PathConversation


class LearningPathItemSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(source='course.id')
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_level = serializers.CharField(source='course.level', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    course_price = serializers.CharField(source='course.price', read_only=True)
    course_discount_price = serializers.CharField(source='course.discount_price', read_only=True)
    course_discount_start_date = serializers.DateTimeField(source='course.discount_start_date', read_only=True)
    course_discount_end_date = serializers.DateTimeField(source='course.discount_end_date', read_only=True)
    skills_taught = serializers.ListField(source='course.skills_taught', child=serializers.CharField(), read_only=True)

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
            'skills_taught',
            'order',
            'reason',
            'is_skippable',
            'skippable_reason',
        ]

    def get_duration_hours(self, obj):
        if obj.course.duration is None:
            return None
        return round(obj.course.duration / 60, 2)


class PathConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PathConversation
        fields = ['messages', 'advisor_meta', 'created_at', 'updated_at']


class LearningPathListSerializer(serializers.ModelSerializer):
    items = LearningPathItemSerializer(many=True, read_only=True)
    conversation_count = serializers.SerializerMethodField()
    advisor_meta = serializers.SerializerMethodField()

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
            'conversation_count',
            'advisor_meta',
            'items',
        ]

    def get_conversation_count(self, obj):
        if not hasattr(obj, 'conversation') or not obj.conversation:
            return 0
        return len(obj.conversation.messages or [])

    def get_advisor_meta(self, obj):
        if not hasattr(obj, 'conversation') or not obj.conversation:
            return {}
        return obj.conversation.advisor_meta or {}


class LearningPathDetailSerializer(serializers.ModelSerializer):
    items = LearningPathItemSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    advisor_meta = serializers.SerializerMethodField()

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
            'messages',
            'advisor_meta',
        ]

    def get_messages(self, obj):
        if not hasattr(obj, 'conversation') or not obj.conversation:
            return []
        return obj.conversation.messages or []

    def get_advisor_meta(self, obj):
        if not hasattr(obj, 'conversation') or not obj.conversation:
            return {}
        return obj.conversation.advisor_meta or {}


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
    messages = serializers.ListField(child=serializers.DictField(), required=False)
    advisor_meta = serializers.DictField(required=False)


class LearningPathAdvisorMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField()


class LearningPathAdvisorRequestSerializer(serializers.Serializer):
    goal_text = serializers.CharField()
    weekly_hours = serializers.IntegerField(required=False, min_value=1, max_value=80)
    messages = LearningPathAdvisorMessageSerializer(many=True, required=False)
    known_skills = serializers.ListField(child=serializers.CharField(), required=False)
    path_id = serializers.IntegerField(required=False)
    persist_conversation = serializers.BooleanField(required=False, default=False)
