from rest_framework import serializers

from .models import Report


class CreateReportSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=Report.TargetType.choices)
    target_id = serializers.IntegerField(min_value=1)
    reason = serializers.ChoiceField(choices=Report.Reason.choices)
    description = serializers.CharField(required=False, allow_blank=True, default='', max_length=1000)


class ReportCaseSerializer(serializers.Serializer):
    id = serializers.CharField()
    target_type = serializers.ChoiceField(choices=Report.TargetType.choices)
    target_id = serializers.IntegerField()
    report_count = serializers.IntegerField()
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'])
    status = serializers.CharField()
    title = serializers.CharField(allow_blank=True, allow_null=True)
    owner_name = serializers.CharField(allow_blank=True, allow_null=True)
    snippet = serializers.CharField(allow_blank=True, allow_null=True)
    top_reason = serializers.CharField(allow_blank=True, allow_null=True)
    reason_breakdown = serializers.DictField(child=serializers.IntegerField())
    last_reported_at = serializers.DateTimeField(allow_null=True)


class IndividualReportSerializer(serializers.Serializer):
    report_id = serializers.IntegerField()
    reporter_name = serializers.CharField(allow_blank=True, allow_null=True)
    reporter_email = serializers.CharField(allow_blank=True, allow_null=True)
    reason = serializers.CharField()
    reason_label = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
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
