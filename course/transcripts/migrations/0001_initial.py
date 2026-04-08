from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("lessons", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TranscriptJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("queued", "queued"), ("processing", "processing"), ("completed", "completed"), ("failed", "failed")], default="queued", max_length=20)),
                ("trigger_source", models.CharField(choices=[("auto_upload", "auto_upload"), ("video_updated", "video_updated"), ("manual", "manual")], default="auto_upload", max_length=20)),
                ("provider", models.CharField(choices=[("local_whisper", "local_whisper")], default="local_whisper", max_length=30)),
                ("source_video_url_snapshot", models.CharField(blank=True, default="", max_length=500)),
                ("language_code", models.CharField(blank=True, default="", max_length=16)),
                ("error_message", models.TextField(blank=True, default="")),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("lesson", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transcript_jobs", to="lessons.lesson")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="LessonTranscript",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("language_code", models.CharField(default="und", max_length=16)),
                ("status", models.CharField(choices=[("draft", "draft"), ("reviewed", "reviewed"), ("published", "published"), ("stale", "stale")], default="draft", max_length=16)),
                ("origin", models.CharField(choices=[("asr", "asr"), ("manual", "manual"), ("regenerated", "regenerated")], default="asr", max_length=16)),
                ("provider", models.CharField(choices=[("local_whisper", "local_whisper")], default="local_whisper", max_length=30)),
                ("version", models.PositiveIntegerField(default=1)),
                ("source_video_url_snapshot", models.CharField(blank=True, default="", max_length=500)),
                ("detected_language_code", models.CharField(blank=True, default="", max_length=16)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("lesson", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transcripts", to="lessons.lesson")),
                ("published_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="published_lesson_transcripts", to="users.user")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TranscriptSegment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("segment_index", models.PositiveIntegerField()),
                ("start_ms", models.PositiveIntegerField()),
                ("end_ms", models.PositiveIntegerField()),
                ("text", models.TextField()),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("speaker_label", models.CharField(blank=True, max_length=50, null=True)),
                ("transcript", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="segments", to="transcripts.lessontranscript")),
            ],
            options={"ordering": ["segment_index", "id"]},
        ),
        migrations.CreateModel(
            name="TranscriptWord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("word_index", models.PositiveIntegerField()),
                ("start_ms", models.PositiveIntegerField()),
                ("end_ms", models.PositiveIntegerField()),
                ("text", models.CharField(max_length=255)),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("segment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="words", to="transcripts.transcriptsegment")),
            ],
            options={"ordering": ["word_index", "id"]},
        ),
        migrations.CreateModel(
            name="TranscriptChunk",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("chunk_index", models.PositiveIntegerField()),
                ("start_ms", models.PositiveIntegerField()),
                ("end_ms", models.PositiveIntegerField()),
                ("text", models.TextField()),
                ("token_count", models.PositiveIntegerField(default=0)),
                ("source_segment_start", models.PositiveIntegerField(default=0)),
                ("source_segment_end", models.PositiveIntegerField(default=0)),
                ("transcript", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chunks", to="transcripts.lessontranscript")),
            ],
            options={"ordering": ["chunk_index", "id"]},
        ),
        migrations.AddConstraint(
            model_name="lessontranscript",
            constraint=models.UniqueConstraint(fields=("lesson", "language_code", "version"), name="unique_lesson_transcript_version"),
        ),
        migrations.AddConstraint(
            model_name="lessontranscript",
            constraint=models.UniqueConstraint(condition=Q(("status", "published")), fields=("lesson", "language_code"), name="unique_published_transcript_per_lesson_language"),
        ),
        migrations.AddConstraint(
            model_name="transcriptsegment",
            constraint=models.UniqueConstraint(fields=("transcript", "segment_index"), name="unique_transcript_segment_index"),
        ),
        migrations.AddConstraint(
            model_name="transcriptword",
            constraint=models.UniqueConstraint(fields=("segment", "word_index"), name="unique_transcript_word_index"),
        ),
        migrations.AddConstraint(
            model_name="transcriptchunk",
            constraint=models.UniqueConstraint(fields=("transcript", "chunk_index"), name="unique_transcript_chunk_index"),
        ),
    ]
