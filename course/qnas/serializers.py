from rest_framework import serializers
from .models import QnA
from courses.models import Course
from lessons.models import Lesson
from users.models import User


class QnASerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    answers_count = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    lesson_title = serializers.SerializerMethodField()

    class Meta:
        model = QnA
        fields = [
            'id',
            'course',
            'course_title',
            'lesson',
            'lesson_title',
            'question',
            'description',
            'tags',
            'user',
            'user_name',
            'user_avatar',
            'created_at',
            'status',
            'views',
            'votes',
            'report_count',
            'last_report_reason',
            'last_reported_at',
            'answers_count',
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True}
        }

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else None

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user else None

    def get_answers_count(self, obj):
        return obj.answwer_qna.count()

    def get_course_title(self, obj):
        return obj.course.title if obj.course else None

    def get_lesson_title(self, obj):
        return obj.lesson.title if obj.lesson else None

    def validate_course(self, value):
        """Validate course exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value

    def validate_lesson(self, value):
        """Validate lesson exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Lesson is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Lesson has been deleted.")
        return value
    
    def validate_user(self, value):
        """Validate user exists"""
        if value is None:
            raise serializers.ValidationError("User is required.")
        return value
