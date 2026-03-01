from rest_framework import serializers
from .models import InstructorLevel


class InstructorLevelSerializer(serializers.ModelSerializer):
    instructor_count = serializers.SerializerMethodField()

    class Meta:
        model = InstructorLevel
        fields = [
            'id', 'name', 'description',
            'min_students', 'min_revenue',
            'commission_rate', 'plan_commission_rate',
            'min_plan_minutes',
            'instructor_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'instructor_count']

    def get_instructor_count(self, obj):
        return obj.instructors.filter(is_deleted=False).count()
