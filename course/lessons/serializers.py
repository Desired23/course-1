from rest_framework import serializers
from .models import Lesson
from coursemodules.models import CourseModule
from .video_signing import build_signed_video_url
from transcripts.services import (
    get_latest_transcript_version,
    get_lesson_transcript_languages,
    get_lesson_transcript_status,
    get_transcript_last_generated_at,
)

class LessonSerializer(serializers.ModelSerializer):
    signed_video_url = serializers.SerializerMethodField()
    signed_video_expires_at = serializers.SerializerMethodField()
    transcript_status = serializers.SerializerMethodField()
    has_published_transcript = serializers.SerializerMethodField()
    transcript_language_codes = serializers.SerializerMethodField()
    latest_transcript_version = serializers.SerializerMethodField()
    transcript_last_generated_at = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'coursemodule',
            'title',
            'description',
            'content_type',
            'content',
            'video_url',
            'video_public_id',
            'signed_video_url',
            'signed_video_expires_at',
            'transcript_status',
            'has_published_transcript',
            'transcript_language_codes',
            'latest_transcript_version',
            'transcript_last_generated_at',
            'file_path',
            'duration',
            'is_free',
            'order',
            'created_at',
            'updated_at',
        ]

    def _media_allowed(self, obj):
        course = getattr(getattr(obj, 'coursemodule', None), 'course', None)
        if getattr(course, 'is_hard_blocked', False):
            return False
        if obj.is_free:
            return True
        if self.context.get('media_allowed'):
            return True
        user = self.context.get('user')
        request = self.context.get('request')
        if user is None and request is not None:
            user = getattr(request, 'user', None)
        if not user:
            return False
        if not course:
            return False
        try:
            from utils.course_access import has_existing_course_access
            return has_existing_course_access(user, course)
        except Exception:
            return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._media_allowed(instance):
            data['video_url'] = None
            data['video_public_id'] = None
            data['signed_video_url'] = None
            data['signed_video_expires_at'] = None
        return data

    def validate_coursemodule(self, value):
        if value is None:
            raise serializers.ValidationError("Coursemodule is required.")

        try:
            coursemodule = CourseModule.objects.get(id=value.id, is_deleted=False)
        except CourseModule.DoesNotExist:
            raise serializers.ValidationError("Coursemodule does not exist or has been deleted.")

        return value

    def get_signed_video_url(self, obj):
        if not self._media_allowed(obj):
            return None
        cache = self.context.setdefault('_signed_video_cache', {})
        if obj.id not in cache:
            cache[obj.id] = build_signed_video_url(
                raw_video_url=obj.video_url,
                explicit_public_id=obj.video_public_id,
            )
        signed_url, _ = cache[obj.id]
        return signed_url

    def get_signed_video_expires_at(self, obj):
        if not self._media_allowed(obj):
            return None
        cache = self.context.setdefault('_signed_video_cache', {})
        if obj.id not in cache:
            cache[obj.id] = build_signed_video_url(
                raw_video_url=obj.video_url,
                explicit_public_id=obj.video_public_id,
            )
        _, expires_at = cache[obj.id]
        return expires_at

    def get_transcript_status(self, obj):
        return get_lesson_transcript_status(obj)

    def get_has_published_transcript(self, obj):
        return obj.transcripts.filter(status='published').exists()

    def get_transcript_language_codes(self, obj):
        return get_lesson_transcript_languages(obj)

    def get_latest_transcript_version(self, obj):
        return get_latest_transcript_version(obj)

    def get_transcript_last_generated_at(self, obj):
        return get_transcript_last_generated_at(obj)
