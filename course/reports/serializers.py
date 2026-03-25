from rest_framework import serializers


class AdminReportSerializer(serializers.Serializer):
    id = serializers.CharField()
    reported_type = serializers.ChoiceField(choices=['forum_post', 'review', 'qa_question', 'message'])
    reported_id = serializers.IntegerField()
    report_count = serializers.IntegerField()
    reporter_name = serializers.CharField(allow_blank=True, allow_null=True)
    reporter_email = serializers.CharField(allow_blank=True, allow_null=True)
    reported_user_name = serializers.CharField(allow_blank=True, allow_null=True)
    reported_content_title = serializers.CharField(allow_blank=True, allow_null=True)
    reason = serializers.CharField(allow_blank=True, allow_null=True)
    description = serializers.CharField(allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=['pending'])
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'])
    created_at = serializers.DateTimeField(allow_null=True)
    updated_at = serializers.DateTimeField(allow_null=True)
    resolution = serializers.CharField(allow_blank=True, allow_null=True)
    action_taken = serializers.CharField(allow_blank=True, allow_null=True)
