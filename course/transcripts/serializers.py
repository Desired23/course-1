from rest_framework import serializers

from .models import LessonTranscript, TranscriptJob, TranscriptSegment, TranscriptWord


class TranscriptWordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranscriptWord
        fields = ["id", "word_index", "start_ms", "end_ms", "text", "confidence"]


class TranscriptSegmentSerializer(serializers.ModelSerializer):
    words = serializers.SerializerMethodField()

    class Meta:
        model = TranscriptSegment
        fields = [
            "id",
            "segment_index",
            "start_ms",
            "end_ms",
            "text",
            "confidence",
            "speaker_label",
            "words",
        ]

    def get_words(self, obj):
        if not self.context.get("include_words"):
            return None
        return TranscriptWordSerializer(obj.words.all().order_by("word_index"), many=True).data


class LessonTranscriptSerializer(serializers.ModelSerializer):
    lesson_id = serializers.IntegerField(source="lesson_id", read_only=True)
    segments = serializers.SerializerMethodField()

    class Meta:
        model = LessonTranscript
        fields = [
            "id",
            "lesson_id",
            "language_code",
            "detected_language_code",
            "status",
            "origin",
            "provider",
            "version",
            "published_at",
            "created_at",
            "updated_at",
            "segments",
        ]

    def get_segments(self, obj):
        return TranscriptSegmentSerializer(
            obj.segments.all().order_by("segment_index"),
            many=True,
            context={"include_words": bool(self.context.get("include_words"))},
        ).data


class TranscriptJobSerializer(serializers.ModelSerializer):
    lesson_id = serializers.IntegerField(source="lesson_id", read_only=True)

    class Meta:
        model = TranscriptJob
        fields = [
            "id",
            "lesson_id",
            "status",
            "trigger_source",
            "provider",
            "language_code",
            "error_message",
            "attempts",
            "created_at",
            "updated_at",
            "started_at",
            "finished_at",
        ]


class TranscriptUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            LessonTranscript.Status.DRAFT,
            LessonTranscript.Status.REVIEWED,
        ],
        required=False,
    )
    segments = serializers.ListField(child=serializers.DictField(), required=False)
