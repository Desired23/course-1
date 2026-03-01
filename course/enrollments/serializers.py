from rest_framework import serializers
from .models import Enrollment


class CourseSummarySerializer(serializers.Serializer):
    """Lightweight course info nested inside enrollment list response."""
    course_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    thumbnail = serializers.CharField(allow_null=True)
    instructor_name = serializers.SerializerMethodField()
    total_lessons = serializers.IntegerField()
    duration = serializers.IntegerField(allow_null=True)
    rating = serializers.DecimalField(max_digits=4, decimal_places=2)

    def get_instructor_name(self, obj):
        try:
            return obj.instructor.user.full_name
        except Exception:
            return None


class EnrollmentSerializer(serializers.ModelSerializer):
    """Full enrollment with nested course summary — used in list endpoint."""
    course = CourseSummarySerializer(read_only=True)
    enrollment_id = serializers.IntegerField(source='id', read_only=True)
    completion_date = serializers.DateTimeField(allow_null=True, read_only=True)
    last_access_date = serializers.DateTimeField(allow_null=True, read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'enrollment_id',
            'user',
            'course',
            'enrollment_date',
            'status',
            'source',
            'subscription',
            'progress',
            'certificate_issue_date',
            'completion_date',
            'last_access_date',
        ]
        read_only_fields = ['enrollment_id', 'enrollment_date']


class EnrollmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            'user',
            'course',
            'enrollment_date',
            'status',
            'source',
            'subscription',
            'progress',
            'certificate_issue_date'
        ]
        read_only_fields = [
            'id', 'enrollment_date'
        ]