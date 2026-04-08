from django.db import models
from django.db.models import Q


class TranscriptJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued"
        PROCESSING = "processing"
        COMPLETED = "completed"
        FAILED = "failed"

    class TriggerSource(models.TextChoices):
        AUTO_UPLOAD = "auto_upload"
        VIDEO_UPDATED = "video_updated"
        MANUAL = "manual"

    class Provider(models.TextChoices):
        LOCAL_WHISPER = "local_whisper"

    lesson = models.ForeignKey(
        "lessons.Lesson",
        on_delete=models.CASCADE,
        related_name="transcript_jobs",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    trigger_source = models.CharField(
        max_length=20,
        choices=TriggerSource.choices,
        default=TriggerSource.AUTO_UPLOAD,
    )
    provider = models.CharField(
        max_length=30,
        choices=Provider.choices,
        default=Provider.LOCAL_WHISPER,
    )
    source_video_url_snapshot = models.CharField(max_length=500, blank=True, default="")
    language_code = models.CharField(max_length=16, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"TranscriptJob<{self.id}> lesson={self.lesson_id} status={self.status}"


class LessonTranscript(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        REVIEWED = "reviewed"
        PUBLISHED = "published"
        STALE = "stale"

    class Origin(models.TextChoices):
        ASR = "asr"
        MANUAL = "manual"
        REGENERATED = "regenerated"

    lesson = models.ForeignKey(
        "lessons.Lesson",
        on_delete=models.CASCADE,
        related_name="transcripts",
    )
    language_code = models.CharField(max_length=16, default="und")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    origin = models.CharField(max_length=16, choices=Origin.choices, default=Origin.ASR)
    provider = models.CharField(
        max_length=30,
        choices=TranscriptJob.Provider.choices,
        default=TranscriptJob.Provider.LOCAL_WHISPER,
    )
    version = models.PositiveIntegerField(default=1)
    source_video_url_snapshot = models.CharField(max_length=500, blank=True, default="")
    detected_language_code = models.CharField(max_length=16, blank=True, default="")
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="published_lesson_transcripts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["lesson", "language_code", "version"],
                name="unique_lesson_transcript_version",
            ),
            models.UniqueConstraint(
                fields=["lesson", "language_code"],
                condition=Q(status="published"),
                name="unique_published_transcript_per_lesson_language",
            ),
        ]

    def __str__(self):
        return f"LessonTranscript<{self.id}> lesson={self.lesson_id} v{self.version} {self.status}"


class TranscriptSegment(models.Model):
    transcript = models.ForeignKey(
        LessonTranscript,
        on_delete=models.CASCADE,
        related_name="segments",
    )
    segment_index = models.PositiveIntegerField()
    start_ms = models.PositiveIntegerField()
    end_ms = models.PositiveIntegerField()
    text = models.TextField()
    confidence = models.FloatField(null=True, blank=True)
    speaker_label = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ["segment_index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["transcript", "segment_index"],
                name="unique_transcript_segment_index",
            )
        ]

    def __str__(self):
        return f"TranscriptSegment<{self.id}> transcript={self.transcript_id} idx={self.segment_index}"


class TranscriptWord(models.Model):
    segment = models.ForeignKey(
        TranscriptSegment,
        on_delete=models.CASCADE,
        related_name="words",
    )
    word_index = models.PositiveIntegerField()
    start_ms = models.PositiveIntegerField()
    end_ms = models.PositiveIntegerField()
    text = models.CharField(max_length=255)
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["word_index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["segment", "word_index"],
                name="unique_transcript_word_index",
            )
        ]

    def __str__(self):
        return f"TranscriptWord<{self.id}> segment={self.segment_id} idx={self.word_index}"


class TranscriptChunk(models.Model):
    transcript = models.ForeignKey(
        LessonTranscript,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField()
    start_ms = models.PositiveIntegerField()
    end_ms = models.PositiveIntegerField()
    text = models.TextField()
    token_count = models.PositiveIntegerField(default=0)
    source_segment_start = models.PositiveIntegerField(default=0)
    source_segment_end = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["chunk_index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["transcript", "chunk_index"],
                name="unique_transcript_chunk_index",
            )
        ]

    def __str__(self):
        return f"TranscriptChunk<{self.id}> transcript={self.transcript_id} idx={self.chunk_index}"

