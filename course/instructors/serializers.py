from rest_framework import serializers
from .models import Instructor
from users.models import User
from users.serializers import Userserializers
from instructor_levels.serializers import InstructorLevelSerializer
from instructor_levels.models import InstructorLevel

class InstructorSerializers(serializers.ModelSerializer):

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True, required=False
    )
    user = Userserializers(read_only=True)
    level = InstructorLevelSerializer(read_only=True)
    level_id = serializers.PrimaryKeyRelatedField(
        queryset=InstructorLevel.objects.filter(is_deleted=False),
        source='level', write_only=True, required=False, allow_null=True,
    )
    # Tính động: các field này trong DB không được maintain khi tạo khóa/ghi danh/đánh giá.
    total_courses = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()

    def get_total_courses(self, obj):
        from .stats import published_course_count
        return published_course_count(obj)

    def get_total_students(self, obj):
        from .stats import student_count
        return student_count(obj)

    def get_rating(self, obj):
        from .stats import average_rating
        return average_rating(obj)

    class Meta:
        model = Instructor
        fields = [
            'id',
            'user',
            'user_id',
            'bio',
            'specialization',
            'qualification',
            'experience',
            'social_links',
            'rating',
            'total_students',
            'total_courses',
            'payment_info',
            'profile_settings',
            'level',
            'level_id',
            'level_locked',
        ]
