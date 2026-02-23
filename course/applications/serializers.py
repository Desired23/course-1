from rest_framework import serializers
from .models import Application, ApplicationResponse
from registration_forms.serializers import FormQuestionSerializer


class ApplicationResponseSerializer(serializers.ModelSerializer):
    question_detail = FormQuestionSerializer(source='question', read_only=True)

    class Meta:
        model = ApplicationResponse
        fields = ['id', 'question', 'value', 'question_detail']
        read_only_fields = ['id']
        extra_kwargs = {
            'question': {'write_only': True},
        }


class ApplicationSerializer(serializers.ModelSerializer):
    responses = ApplicationResponseSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    form_title = serializers.CharField(source='form.title', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'user', 'form', 'status',
            'submitted_at', 'reviewed_at', 'reviewed_by',
            'admin_notes', 'rejection_reason', 'updated_at',
            'user_email', 'user_full_name', 'form_title',
            'reviewed_by_name', 'responses',
        ]
        read_only_fields = [
            'id', 'submitted_at', 'reviewed_at',
            'reviewed_by', 'updated_at',
        ]

    def get_user_full_name(self, obj):
        return obj.user.full_name or str(obj.user)

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.full_name or str(obj.reviewed_by)
        return None


class ApplicationListSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    form_title = serializers.CharField(source='form.title', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'user', 'form', 'status',
            'submitted_at', 'reviewed_at',
            'user_email', 'user_full_name', 'form_title',
        ]

    def get_user_full_name(self, obj):
        return obj.user.full_name or str(obj.user)


class SubmitApplicationSerializer(serializers.Serializer):
    form_id = serializers.IntegerField()
    responses = serializers.ListField(
        child=serializers.DictField(), min_length=1
    )
