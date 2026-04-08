from rest_framework import serializers

from .models import LessonTranscript, TranscriptChunk, TranscriptJob, TranscriptSegment, TranscriptWord


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


class TranscriptChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranscriptChunk
        fields = [
            "id",
            "chunk_index",
            "start_ms",
            "end_ms",
            "text",
            "token_count",
            "source_segment_start",
            "source_segment_end",
        ]


class LessonTranscriptSerializer(serializers.ModelSerializer):
    lesson_id = serializers.IntegerField(source="lesson_id", read_only=True)
    segments = serializers.SerializerMethodField()
    chunks = serializers.SerializerMethodField()

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
            "chunks",
        ]

    def get_segments(self, obj):
        return TranscriptSegmentSerializer(
            obj.segments.all().order_by("segment_index"),
            many=True,
            context={"include_words": bool(self.context.get("include_words"))},
        ).data

    def get_chunks(self, obj):
        if not self.context.get("include_chunks"):
            return None
        return TranscriptChunkSerializer(obj.chunks.all().order_by("chunk_index"), many=True).data


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
