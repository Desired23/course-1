from rest_framework import serializers

from .models import CopyrightCase, CopyrightCaseMessage, Report


class CreateReportSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=Report.TargetType.choices)
    target_id = serializers.IntegerField(min_value=1)
    reason = serializers.ChoiceField(choices=Report.Reason.choices)
    description = serializers.CharField(required=False, allow_blank=True, default='', max_length=1000)
    metadata = serializers.JSONField(required=False, default=dict)
    attachments = serializers.ListField(child=serializers.DictField(), required=False, default=list)


class ReportCaseSerializer(serializers.Serializer):
    id = serializers.CharField()
    report_id = serializers.IntegerField()
    target_type = serializers.ChoiceField(choices=Report.TargetType.choices)
    target_id = serializers.IntegerField()
    report_count = serializers.IntegerField()
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'])
    status = serializers.CharField()
    title = serializers.CharField(allow_blank=True, allow_null=True)
    owner_name = serializers.CharField(allow_blank=True, allow_null=True)
    snippet = serializers.CharField(allow_blank=True, allow_null=True)
    reason = serializers.CharField()
    reason_label = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField(required=False, default=dict)
    attachments = serializers.ListField(required=False, default=list)
    reporter_name = serializers.CharField(allow_blank=True, allow_null=True)
    reporter_email = serializers.CharField(allow_blank=True, allow_null=True)
    reported_at = serializers.DateTimeField()
    processed_at = serializers.DateTimeField(allow_null=True)
    processed_by_name = serializers.CharField(allow_blank=True, allow_null=True)
    copyright_case_id = serializers.IntegerField(allow_null=True, required=False)
    moderation_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)


class ReportItemDetailSerializer(ReportCaseSerializer):
    created_at = serializers.DateTimeField()
    resolved_at = serializers.DateTimeField(allow_null=True)
    action_taken = serializers.CharField(allow_blank=True)
    resolution_notes = serializers.CharField(allow_blank=True)


class IndividualReportSerializer(serializers.Serializer):
    report_id = serializers.IntegerField()
    reporter_name = serializers.CharField(allow_blank=True, allow_null=True)
    reporter_email = serializers.CharField(allow_blank=True, allow_null=True)
    reason = serializers.CharField()
    reason_label = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField(required=False, default=dict)
    attachments = serializers.ListField(required=False, default=list)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()


class ReportCaseDetailSerializer(serializers.Serializer):
    target_type = serializers.CharField()
    target_id = serializers.IntegerField()
    title = serializers.CharField(allow_blank=True, allow_null=True)
    owner_name = serializers.CharField(allow_blank=True, allow_null=True)
    snippet = serializers.CharField(allow_blank=True, allow_null=True)
    reports = IndividualReportSerializer(many=True)


class ResolveReportSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'dismiss', 'hide', 'delete', 'revoke'])
    resolution_notes = serializers.CharField(required=False, allow_blank=True, default='')


class CopyrightCaseMessageSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, allow_null=True)

    class Meta:
        model = CopyrightCaseMessage
        fields = [
            'id',
            'actor',
            'actor_name',
            'actor_role',
            'message',
            'response_type',
            'attachments',
            'metadata',
            'visibility',
            'created_at',
        ]
        read_only_fields = ['id', 'actor', 'actor_name', 'actor_role', 'created_at']


class CopyrightCaseSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    target_label = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True, allow_null=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True, allow_null=True)
    instructor_name = serializers.CharField(source='instructor.user.full_name', read_only=True, allow_null=True)
    reporter_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    reporter_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    reporter_count = serializers.SerializerMethodField()
    held_amount = serializers.SerializerMethodField()
    active_hold_count = serializers.SerializerMethodField()

    class Meta:
        model = CopyrightCase
        fields = [
            'id',
            'target_type',
            'target_id',
            'target_label',
            'title',
            'course',
            'course_title',
            'lesson',
            'lesson_title',
            'instructor',
            'instructor_name',
            'created_by',
            'reporter_name',
            'reporter_email',
            'status',
            'severity',
            'content_action',
            'financial_action',
            'reporter_count',
            'held_amount',
            'active_hold_count',
            'manual_follow_up',
            'resolved_at',
            'created_at',
            'updated_at',
        ]

    def get_title(self, obj):
        if obj.target_type == Report.TargetType.LESSON and obj.lesson:
            return obj.lesson.title
        if obj.course:
            return obj.course.title
        return f'{obj.target_type} #{obj.target_id}'

    def get_target_label(self, obj):
        if obj.target_type == Report.TargetType.LESSON:
            return 'lesson'
        return 'course'

    def get_reporter_count(self, obj):
        return Report.objects.filter(
            target_type=obj.target_type,
            target_id=obj.target_id,
            reason=Report.Reason.COPYRIGHT,
        ).values('reporter_id').distinct().count()

    def get_held_amount(self, obj):
        total = sum((hold.earning.net_amount for hold in obj.earning_holds.all() if hold.status == 'active'), 0)
        return str(total)

    def get_active_hold_count(self, obj):
        return sum(1 for hold in obj.earning_holds.all() if hold.status == 'active')


class CopyrightCaseDetailSerializer(CopyrightCaseSerializer):
    messages = serializers.SerializerMethodField()
    reports = serializers.SerializerMethodField()

    class Meta(CopyrightCaseSerializer.Meta):
        fields = CopyrightCaseSerializer.Meta.fields + ['messages', 'reports']

    def get_messages(self, obj):
        visible_messages = self.context.get('visible_messages')
        qs = visible_messages if visible_messages is not None else obj.messages.all()
        return CopyrightCaseMessageSerializer(qs, many=True).data

    def get_reports(self, obj):
        reports = Report.objects.filter(
            target_type=obj.target_type,
            target_id=obj.target_id,
            reason=Report.Reason.COPYRIGHT,
        ).select_related('reporter')
        return IndividualReportSerializer([
            {
                'report_id': r.id,
                'reporter_name': r.reporter.full_name if r.reporter else None,
                'reporter_email': r.reporter.email if r.reporter else None,
                'reason': r.reason,
                'reason_label': 'Copyright',
                'description': r.description,
                'metadata': r.metadata,
                'attachments': r.attachments,
                'status': r.status,
                'created_at': r.created_at,
            }
            for r in reports
        ], many=True).data


class AdminCopyrightActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[
        'suspend_sale',
        'freeze',
        'takedown',
        'restore',
    ])
    message = serializers.CharField(required=False, allow_blank=True, default='', max_length=4000)
    severity = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'confirmed', 'legal'],
        required=False,
        allow_blank=True,
    )
    count_as_strike = serializers.BooleanField(required=False, default=True)
    with_refund = serializers.BooleanField(required=False, default=True)
    with_hold = serializers.BooleanField(required=False, default=True)
