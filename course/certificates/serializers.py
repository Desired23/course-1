from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = [
            'id', 'user', 'course', 'enrollment',
            'verification_code', 'certificate_url',
            'issued_at', 'revoked',
            'student_name', 'course_title', 'instructor_name',
            'completion_date', 'created_at',
        ]
        read_only_fields = fields


class CertificateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = [
            'id', 'verification_code', 'certificate_url',
            'student_name', 'course_title', 'issued_at', 'revoked',
        ]
        read_only_fields = fields


class CertificateVerifySerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'verification_code', 'student_name', 'course_title',
            'instructor_name', 'completion_date', 'issued_at',
            'revoked', 'is_valid',
        ]

    def get_is_valid(self, obj):
        return not obj.revoked and not obj.is_deleted
