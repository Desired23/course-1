from rest_framework import serializers
from .models import Enrollment

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            'id',
            'user',
            'course',
            'enrollment_date',
            'status',
            'progress',
            'certificate_issue_date'
        ]
        read_only_fields = [
            'id', 'enrollment_date'
        ]
class EnrollmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            'user',
            'course',
            'enrollment_date',
            'status',
            'progress',
            'certificate_issue_date'
        ]
        read_only_fields = [
            'id', 'enrollment_date'
        ]