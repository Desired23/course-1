from rest_framework import serializers
from .models import Wishlist
from courses.models import Course


class WishlistCourseSerializer(serializers.Serializer):
    """Lightweight course info nested inside wishlist response."""
    id = serializers.IntegerField()
    title = serializers.CharField()
    thumbnail = serializers.CharField(allow_null=True)
    instructor_name = serializers.SerializerMethodField()
    original_price = serializers.DecimalField(source='price', max_digits=10, decimal_places=2, allow_null=True)
    discount_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    discount_start_date = serializers.DateTimeField(allow_null=True)
    discount_end_date = serializers.DateTimeField(allow_null=True)
    rating = serializers.DecimalField(max_digits=4, decimal_places=2)
    enrollment_count = serializers.IntegerField(source='total_students')
    duration = serializers.IntegerField(allow_null=True)
    level = serializers.CharField()
    short_description = serializers.CharField(allow_null=True)
    status = serializers.CharField()

    def get_instructor_name(self, obj):
        try:
            return obj.instructor.user.full_name
        except Exception:
            return None


class WishlistSerializer(serializers.ModelSerializer):
    course_detail = WishlistCourseSerializer(source='course', read_only=True)

    class Meta:
        model = Wishlist
        fields = [
            'id',
            'user',
            'course',
            'course_detail',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'created_at'
        ]

    def validate_course(self, value):
        """Validate course exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value