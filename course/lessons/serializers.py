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
            'status',
            'created_at',
            'updated_at',
        ]
    
    def validate_coursemodule(self, value):
        """Validate coursemodule exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Coursemodule is required.")
        
        try:
            coursemodule = CourseModule.objects.get(id=value.id, is_deleted=False)
        except CourseModule.DoesNotExist:
            raise serializers.ValidationError("Coursemodule does not exist or has been deleted.")
        
        return value

    def get_signed_video_url(self, obj):
        cache = self.context.setdefault('_signed_video_cache', {})
        if obj.id not in cache:
            cache[obj.id] = build_signed_video_url(
                raw_video_url=obj.video_url,
                explicit_public_id=obj.video_public_id,
            )
        signed_url, _ = cache[obj.id]
        return signed_url

    def get_signed_video_expires_at(self, obj):
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
