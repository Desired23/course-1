from __future__ import annotations

import importlib
import logging
import math
import os
import re
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from lessons.models import Lesson
from lessons.video_signing import build_signed_video_url

from .models import LessonTranscript, TranscriptChunk, TranscriptJob, TranscriptSegment, TranscriptWord

logger = logging.getLogger(__name__)
PUNCTUATION_END_RE = re.compile(r"[.!?…]$")


def lesson_supports_transcript(lesson: Lesson) -> bool:
    return lesson.content_type == Lesson.ContentType.VIDEO and bool(get_lesson_source_snapshot(lesson))


def get_lesson_source_snapshot(lesson: Lesson) -> str:
    if lesson.video_public_id:
        return f"public_id:{lesson.video_public_id}"
    if lesson.video_url:
        return f"url:{lesson.video_url}"
    return ""


def build_lesson_source_url(lesson: Lesson, snapshot: str | None = None) -> str:
    source_snapshot = snapshot or get_lesson_source_snapshot(lesson)
    if source_snapshot.startswith("public_id:"):
        signed, _ = build_signed_video_url(
            raw_video_url=lesson.video_url,
            explicit_public_id=source_snapshot.split(":", 1)[1],
        )
        return signed or ""
    if source_snapshot.startswith("url:"):
        return source_snapshot.split(":", 1)[1]
    return ""


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def _token_count(text: str) -> int:
    normalized = _normalize_text(text)
    return len(normalized.split()) if normalized else 0


def _group_words_into_segments(words: list[dict], max_words: int = 18, max_duration_ms: int = 5000) -> list[dict]:
    segments: list[dict] = []
    current_words: list[dict] = []

    def flush_segment() -> None:
        nonlocal current_words
        if not current_words:
            return
        start_ms = int(current_words[0]["start_ms"])
        end_ms = int(current_words[-1]["end_ms"])
        text = _normalize_text(" ".join(word["text"] for word in current_words))
        confidence_values = [word.get("confidence") for word in current_words if word.get("confidence") is not None]
        confidence = sum(confidence_values) / len(confidence_values) if confidence_values else None
        segments.append(
            {
                "start_ms": start_ms,
                "end_ms": end_ms,
                "text": text,
                "confidence": confidence,
                "words": current_words,
            }
        )
        current_words = []

    for word in words:
        word_text = _normalize_text(word.get("text", ""))
        if not word_text:
            continue
        cleaned_word = {
            "text": word_text,
            "start_ms": max(0, int(word.get("start_ms", 0))),
            "end_ms": max(0, int(word.get("end_ms", 0))),
            "confidence": word.get("confidence"),
        }
        current_words.append(cleaned_word)
        duration_ms = current_words[-1]["end_ms"] - current_words[0]["start_ms"]
        if (
            len(current_words) >= max_words
            or duration_ms >= max_duration_ms
            or PUNCTUATION_END_RE.search(word_text)
        ):
            flush_segment()

    flush_segment()
    return segments


def _build_chunks_from_segments(segments: list[dict], max_segments: int = 5, max_tokens: int = 120) -> list[dict]:
    chunks: list[dict] = []
    current: list[dict] = []
    current_tokens = 0

    def flush_chunk() -> None:
        nonlocal current, current_tokens
        if not current:
            return
        text = _normalize_text(" ".join(segment["text"] for segment in current))
        chunks.append(
            {
                "start_ms": current[0]["start_ms"],
                "end_ms": current[-1]["end_ms"],
                "text": text,
                "token_count": _token_count(text),
                "source_segment_start": current[0]["segment_index"],
                "source_segment_end": current[-1]["segment_index"],
            }
        )
        current = []
        current_tokens = 0

    for segment in segments:
        segment_tokens = _token_count(segment["text"])
        if current and (len(current) >= max_segments or current_tokens + segment_tokens > max_tokens):
            flush_chunk()
        current.append(segment)
        current_tokens += segment_tokens
    flush_chunk()
    return chunks


def _build_segments_from_provider_segments(provider_segments: Iterable[dict]) -> list[dict]:
    normalized_segments: list[dict] = []
    all_words: list[dict] = []

    for provider_segment in provider_segments:
        provider_words = provider_segment.get("words") or []
        if provider_words:
            for word in provider_words:
                all_words.append(
                    {
                        "text": word.get("text", ""),
                        "start_ms": word.get("start_ms", 0),
                        "end_ms": word.get("end_ms", 0),
                        "confidence": word.get("confidence"),
                    }
                )
        else:
            text = _normalize_text(provider_segment.get("text", ""))
            if not text:
                continue
            words = text.split()
            start_ms = int(provider_segment.get("start_ms", 0))
            end_ms = int(provider_segment.get("end_ms", start_ms))
            duration_ms = max(end_ms - start_ms, len(words) * 150)
            step = max(1, math.floor(duration_ms / max(len(words), 1)))
            for index, word_text in enumerate(words):
                word_start = start_ms + (index * step)
                word_end = min(end_ms, word_start + step)
                all_words.append(
                    {
                        "text": word_text,
                        "start_ms": word_start,
                        "end_ms": word_end,
                        "confidence": provider_segment.get("confidence"),
                    }
                )

    grouped_segments = _group_words_into_segments(all_words)
    for index, segment in enumerate(grouped_segments):
        normalized_segments.append(
            {
                "segment_index": index,
                "start_ms": segment["start_ms"],
                "end_ms": segment["end_ms"],
                "text": segment["text"],
                "confidence": segment["confidence"],
                "speaker_label": None,
                "words": segment["words"],
            }
        )
    return normalized_segments


@dataclass
class ProviderTranscriptionResult:
    language_code: str
    text: str
    segments: list[dict]


class LocalWhisperTranscriptProvider:
    provider_name = TranscriptJob.Provider.LOCAL_WHISPER

    def __init__(self) -> None:
        self._backend_name = ""
        self._model = None

    def _get_model(self):
        if self._model is not None:
            return self._model

        model_name = getattr(settings, "TRANSCRIPT_LOCAL_WHISPER_MODEL", "small")
        faster_whisper_spec = importlib.util.find_spec("faster_whisper")
        if faster_whisper_spec:
            module = importlib.import_module("faster_whisper")
            self._backend_name = "faster_whisper"
            self._model = module.WhisperModel(
                model_name,
                device=getattr(settings, "TRANSCRIPT_LOCAL_WHISPER_DEVICE", "cpu"),
                compute_type=getattr(settings, "TRANSCRIPT_LOCAL_WHISPER_COMPUTE_TYPE", "int8"),
            )
            return self._model

        whisper_spec = importlib.util.find_spec("whisper")
        if whisper_spec:
            module = importlib.import_module("whisper")
            self._backend_name = "openai_whisper"
            self._model = module.load_model(model_name)
            return self._model

        raise RuntimeError(
            "Whisper backend is not installed. Install `faster-whisper` or `openai-whisper` to process transcript jobs."
        )

    def transcribe(self, media_path: str, language_hint: str | None = None) -> ProviderTranscriptionResult:
        model = self._get_model()

        if self._backend_name == "faster_whisper":
            segments_iter, info = model.transcribe(
                media_path,
                language=language_hint or None,
                word_timestamps=True,
                vad_filter=True,
                beam_size=5,
            )
            provider_segments: list[dict] = []
            full_text: list[str] = []
            for segment in segments_iter:
                full_text.append(segment.text or "")
                provider_segments.append(
                    {
                        "start_ms": int((segment.start or 0) * 1000),
                        "end_ms": int((segment.end or 0) * 1000),
                        "text": segment.text or "",
                        "confidence": getattr(segment, "avg_logprob", None),
                        "words": [
                            {
                                "text": word.word,
                                "start_ms": int((word.start or 0) * 1000),
                                "end_ms": int((word.end or 0) * 1000),
                                "confidence": getattr(word, "probability", None),
                            }
                            for word in (segment.words or [])
                        ],
                    }
                )
            return ProviderTranscriptionResult(
                language_code=getattr(info, "language", "") or "und",
                text=_normalize_text(" ".join(full_text)),
                segments=provider_segments,
            )

        result = model.transcribe(
            media_path,
            word_timestamps=True,
            language=language_hint or None,
            verbose=False,
        )
        provider_segments = []
        for segment in result.get("segments", []):
            provider_segments.append(
                {
                    "start_ms": int(float(segment.get("start", 0)) * 1000),
                    "end_ms": int(float(segment.get("end", 0)) * 1000),
                    "text": segment.get("text", ""),
                    "confidence": segment.get("avg_logprob"),
                    "words": [
                        {
                            "text": word.get("word", ""),
                            "start_ms": int(float(word.get("start", 0)) * 1000),
                            "end_ms": int(float(word.get("end", 0)) * 1000),
                            "confidence": word.get("probability"),
                        }
                        for word in segment.get("words", [])
                    ],
                }
            )

        return ProviderTranscriptionResult(
            language_code=result.get("language") or "und",
            text=_normalize_text(result.get("text", "")),
            segments=provider_segments,
        )


def get_transcript_provider(provider_name: str = TranscriptJob.Provider.LOCAL_WHISPER):
    if provider_name != TranscriptJob.Provider.LOCAL_WHISPER:
        raise ValidationError({"provider": "Unsupported transcript provider."})
    return LocalWhisperTranscriptProvider()


def get_next_transcript_version(lesson: Lesson, language_code: str) -> int:
    latest_version = (
        LessonTranscript.objects.filter(lesson=lesson, language_code=language_code)
        .aggregate(max_version=Max("version"))
        .get("max_version")
    )
    return int(latest_version or 0) + 1


def mark_lesson_transcripts_stale(lesson: Lesson, current_snapshot: str | None = None) -> int:
    snapshot = current_snapshot if current_snapshot is not None else get_lesson_source_snapshot(lesson)
    stale_statuses = [
        LessonTranscript.Status.DRAFT,
        LessonTranscript.Status.REVIEWED,
        LessonTranscript.Status.PUBLISHED,
    ]
    queryset = lesson.transcripts.filter(status__in=stale_statuses)
    if snapshot:
        queryset = queryset.exclude(source_video_url_snapshot=snapshot)
    return queryset.update(status=LessonTranscript.Status.STALE)


def enqueue_transcript_generation(
    lesson: Lesson,
    trigger_source: str = TranscriptJob.TriggerSource.AUTO_UPLOAD,
    force: bool = False,
) -> TranscriptJob | None:
    if not lesson_supports_transcript(lesson):
        return None

    snapshot = get_lesson_source_snapshot(lesson)
    mark_lesson_transcripts_stale(lesson, current_snapshot=snapshot)

    active_job = lesson.transcript_jobs.filter(
        status__in=[TranscriptJob.Status.QUEUED, TranscriptJob.Status.PROCESSING],
        source_video_url_snapshot=snapshot,
    ).first()
    if active_job and not force:
        return active_job

    return TranscriptJob.objects.create(
        lesson=lesson,
        status=TranscriptJob.Status.QUEUED,
        trigger_source=trigger_source,
        provider=TranscriptJob.Provider.LOCAL_WHISPER,
        source_video_url_snapshot=snapshot,
    )


def get_published_transcript_for_lesson(lesson_id: int, language_code: str | None = None) -> LessonTranscript:
    queryset = LessonTranscript.objects.filter(
        lesson_id=lesson_id,
        status=LessonTranscript.Status.PUBLISHED,
    ).prefetch_related("segments__words", "chunks")
    if language_code:
        queryset = queryset.filter(language_code=language_code)
    transcript = queryset.order_by("-version", "-created_at").first()
    if not transcript:
        raise ValidationError({"transcript": "Published transcript not found."})
    return transcript


def get_editor_transcripts_for_lesson(lesson_id: int) -> dict:
    transcripts = (
        LessonTranscript.objects.filter(lesson_id=lesson_id)
        .prefetch_related("segments__words", "chunks")
        .order_by("-created_at")
    )
    latest = transcripts.first()
    published = next((item for item in transcripts if item.status == LessonTranscript.Status.PUBLISHED), None)
    latest_job = TranscriptJob.objects.filter(lesson_id=lesson_id).order_by("-created_at").first()
    return {
        "latest": latest,
        "published": published,
        "latest_job": latest_job,
    }


def _assert_transcript_editable(transcript: LessonTranscript) -> None:
    if transcript.status in [LessonTranscript.Status.PUBLISHED, LessonTranscript.Status.STALE]:
        raise ValidationError({"transcript": "Only draft or reviewed transcripts can be edited."})


def rebuild_transcript_chunks(transcript: LessonTranscript) -> None:
    segment_rows = list(
        transcript.segments.all().order_by("segment_index").values(
            "segment_index",
            "start_ms",
            "end_ms",
            "text",
        )
    )
    TranscriptChunk.objects.filter(transcript=transcript).delete()
    chunks = _build_chunks_from_segments(segment_rows)
    TranscriptChunk.objects.bulk_create(
        [
            TranscriptChunk(
                transcript=transcript,
                chunk_index=index,
                start_ms=chunk["start_ms"],
                end_ms=chunk["end_ms"],
                text=chunk["text"],
                token_count=chunk["token_count"],
                source_segment_start=chunk["source_segment_start"],
                source_segment_end=chunk["source_segment_end"],
            )
            for index, chunk in enumerate(chunks)
        ]
    )


def update_transcript(transcript: LessonTranscript, payload: dict) -> LessonTranscript:
    _assert_transcript_editable(transcript)
    status = payload.get("status")
    should_enqueue_preview = False
    if status:
        transcript.status = status
        transcript.save(update_fields=["status", "updated_at"])
        should_enqueue_preview = True

    segment_updates = payload.get("segments") or []
    if segment_updates:
        segments_by_id = {segment.id: segment for segment in transcript.segments.all()}
        dirty_segments = []
        for segment_payload in segment_updates:
            segment = segments_by_id.get(int(segment_payload.get("id", 0)))
            if not segment:
                continue
            new_text = _normalize_text(segment_payload.get("text", ""))
            if new_text and new_text != segment.text:
                segment.text = new_text
                dirty_segments.append(segment)

        if dirty_segments:
            TranscriptSegment.objects.bulk_update(dirty_segments, ["text"])
            if transcript.status == LessonTranscript.Status.DRAFT:
                transcript.status = LessonTranscript.Status.REVIEWED
                transcript.save(update_fields=["status", "updated_at"])
            rebuild_transcript_chunks(transcript)
            should_enqueue_preview = True

    updated = LessonTranscript.objects.prefetch_related("segments__words", "chunks").get(pk=transcript.pk)
    return updated


@transaction.atomic
def publish_transcript(transcript: LessonTranscript, published_by) -> LessonTranscript:
    if transcript.status == LessonTranscript.Status.STALE:
        raise ValidationError({"transcript": "Stale transcripts cannot be published."})

    LessonTranscript.objects.filter(
        lesson=transcript.lesson,
        language_code=transcript.language_code,
        status=LessonTranscript.Status.PUBLISHED,
    ).exclude(pk=transcript.pk).update(status=LessonTranscript.Status.STALE)

    transcript.status = LessonTranscript.Status.PUBLISHED
    transcript.published_at = timezone.now()
    transcript.published_by = published_by
    transcript.save(update_fields=["status", "published_at", "published_by", "updated_at"])
    return transcript


def get_lesson_transcript_status(lesson: Lesson) -> str | None:
    active_job = lesson.transcript_jobs.filter(
        status__in=[TranscriptJob.Status.QUEUED, TranscriptJob.Status.PROCESSING]
    ).order_by("-created_at").first()
    if active_job:
        return active_job.status

    latest_transcript = lesson.transcripts.order_by("-created_at").first()
    if latest_transcript:
        return latest_transcript.status

    failed_job = lesson.transcript_jobs.filter(status=TranscriptJob.Status.FAILED).order_by("-created_at").first()
    if failed_job:
        return failed_job.status
    return None


def get_lesson_transcript_languages(lesson: Lesson) -> list[str]:
    return list(lesson.transcripts.values_list("language_code", flat=True).distinct().order_by("language_code"))


def get_latest_transcript_version(lesson: Lesson) -> int | None:
    latest = lesson.transcripts.aggregate(max_version=Max("version")).get("max_version")
    return int(latest) if latest is not None else None


def get_transcript_last_generated_at(lesson: Lesson):
    latest_job = lesson.transcript_jobs.filter(status=TranscriptJob.Status.COMPLETED).order_by("-finished_at").first()
    return latest_job.finished_at if latest_job else None


def estimate_language_hint(lesson: Lesson) -> str | None:
    course_language = getattr(getattr(lesson.coursemodule, "course", None), "language", None)
    if not course_language:
        return None
    normalized = str(course_language).strip().lower()
    mapping = {
        "vietnamese": "vi",
        "vi": "vi",
        "english": "en",
        "en": "en",
    }
    return mapping.get(normalized)


def _download_media_file(source_url: str) -> str:
    suffix = Path(urlparse(source_url).path).suffix or ".mp4"
    with urllib.request.urlopen(source_url, timeout=60) as response:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(response.read())
            return temp_file.name


@transaction.atomic
def persist_transcription_result(job: TranscriptJob, result: ProviderTranscriptionResult) -> LessonTranscript:
    lesson = job.lesson
    language_code = result.language_code or "und"
    version = get_next_transcript_version(lesson, language_code)
    has_existing = lesson.transcripts.filter(language_code=language_code).exists()
    normalized_segments = _build_segments_from_provider_segments(result.segments)

    transcript = LessonTranscript.objects.create(
        lesson=lesson,
        language_code=language_code,
        detected_language_code=result.language_code or language_code,
        status=LessonTranscript.Status.DRAFT,
        origin=LessonTranscript.Origin.REGENERATED if has_existing else LessonTranscript.Origin.ASR,
        provider=job.provider,
        version=version,
        source_video_url_snapshot=job.source_video_url_snapshot,
    )

    created_segments = TranscriptSegment.objects.bulk_create(
        [
            TranscriptSegment(
                transcript=transcript,
                segment_index=index,
                start_ms=segment["start_ms"],
                end_ms=segment["end_ms"],
                text=segment["text"],
                confidence=segment.get("confidence"),
                speaker_label=segment.get("speaker_label"),
            )
            for index, segment in enumerate(normalized_segments)
        ]
    )

    word_rows = []
    for segment_obj, segment_payload in zip(created_segments, normalized_segments):
        for word_index, word in enumerate(segment_payload.get("words", [])):
            word_rows.append(
                TranscriptWord(
                    segment=segment_obj,
                    word_index=word_index,
                    start_ms=word["start_ms"],
                    end_ms=word["end_ms"],
                    text=word["text"],
                    confidence=word.get("confidence"),
                )
            )
    if word_rows:
        TranscriptWord.objects.bulk_create(word_rows)

    rebuild_transcript_chunks(transcript)
    return LessonTranscript.objects.prefetch_related("segments__words", "chunks").get(pk=transcript.pk)


def process_transcript_job(job: TranscriptJob) -> LessonTranscript:
    lesson = job.lesson
    current_snapshot = get_lesson_source_snapshot(lesson)
    if current_snapshot != job.source_video_url_snapshot:
        raise RuntimeError("Transcript job is stale because the lesson video source changed.")

    source_url = build_lesson_source_url(lesson, snapshot=job.source_video_url_snapshot)
    if not source_url:
        raise RuntimeError("Lesson video source is unavailable.")

    provider = get_transcript_provider(job.provider)
    language_hint = estimate_language_hint(lesson)
    local_path = _download_media_file(source_url)
    try:
        result = provider.transcribe(local_path, language_hint=language_hint)
    finally:
        try:
            os.remove(local_path)
        except OSError:
            logger.warning("Failed to remove temporary transcript media file: %s", local_path)

    return persist_transcription_result(job, result)


def run_next_transcript_job() -> TranscriptJob | None:
    job = TranscriptJob.objects.filter(status=TranscriptJob.Status.QUEUED).order_by("created_at").select_related("lesson").first()
    if not job:
        return None

    job.status = TranscriptJob.Status.PROCESSING
    job.started_at = timezone.now()
    job.attempts += 1
    job.error_message = ""
    job.save(update_fields=["status", "started_at", "attempts", "error_message", "updated_at"])

    try:
        process_transcript_job(job)
        job.status = TranscriptJob.Status.COMPLETED
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "finished_at", "updated_at"])
    except Exception as exc:
        logger.exception("Transcript job %s failed", job.pk)
        job.status = TranscriptJob.Status.FAILED
        job.error_message = str(exc)
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
    return job


def assert_transcript_management_access(user, lesson: Lesson) -> None:
    is_admin = bool(user and hasattr(user, "admin"))
    if is_admin:
        return

    instructor = getattr(user, "instructor", None)
    owner_instructor_id = getattr(getattr(lesson.coursemodule, "course", None), "instructor_id", None)
    if not instructor or owner_instructor_id != instructor.id:
        raise ValidationError({"error": "You do not have permission to manage this transcript."})
