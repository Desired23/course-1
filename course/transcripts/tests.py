from django.test import TestCase

from coursemodules.models import CourseModule
from courses.models import Course
from instructors.models import Instructor
from lessons.models import Lesson
from transcripts.models import LessonTranscript, TranscriptJob
from transcripts.services import (
    enqueue_transcript_generation,
    get_lesson_transcript_status,
    persist_transcription_result,
    publish_transcript,
    update_transcript,
)
from users.models import User


class TranscriptServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            username="inst",
            email="inst@example.com",
            password_hash="secret",
            full_name="Instructor User",
            user_type=User.UserTypeChoices.INSTRUCTOR,
            status=User.StatusChoices.ACTIVE,
        )
        self.instructor = Instructor.objects.create(user=self.user)
        self.course = Course.objects.create(
            title="Transcript Course",
            shortdescription="short",
            description="desc",
            instructor=self.instructor,
            price=0,
            status="draft",
            is_public=False,
        )
        self.module = CourseModule.objects.create(
            course=self.course,
            title="Module 1",
            order_number=1,
            status="Draft",
        )
        self.lesson = Lesson.objects.create(
            coursemodule=self.module,
            title="Video Lesson",
            content_type=Lesson.ContentType.VIDEO,
            video_url="https://example.com/video.mp4",
            duration=120,
            is_free=False,
            order=1,
            status=Lesson.Status.DRAFT,
        )

    def _build_result(self, text="hello world"):
        return type(
            "Result",
            (),
            {
                "language_code": "en",
                "text": text,
                "segments": [
                    {
                        "start_ms": 0,
                        "end_ms": 1200,
                        "text": text,
                        "words": [
                            {"text": "hello", "start_ms": 0, "end_ms": 500, "confidence": 0.9},
                            {"text": "world", "start_ms": 501, "end_ms": 1200, "confidence": 0.9},
                        ],
                    }
                ],
            },
        )()

    def test_enqueue_transcript_generation_for_video_lesson(self):
        job = enqueue_transcript_generation(self.lesson)
        self.assertIsNotNone(job)
        self.assertEqual(job.status, TranscriptJob.Status.QUEUED)
        self.assertEqual(get_lesson_transcript_status(self.lesson), TranscriptJob.Status.QUEUED)

    def test_persist_transcription_result_creates_segments_words_and_chunks(self):
        job = enqueue_transcript_generation(self.lesson)
        transcript = persist_transcription_result(job, self._build_result("hello world this test"))
        self.assertEqual(transcript.status, LessonTranscript.Status.DRAFT)
        self.assertGreater(transcript.segments.count(), 0)
        self.assertGreater(transcript.segments.first().words.count(), 0)
        self.assertGreater(transcript.chunks.count(), 0)

    def test_update_and_publish_transcript(self):
        job = enqueue_transcript_generation(self.lesson)
        transcript = persist_transcription_result(job, self._build_result())
        updated = update_transcript(
            transcript,
            {
                "segments": [
                    {
                        "id": transcript.segments.first().id,
                        "text": "hello updated world",
                    }
                ]
            },
        )
        self.assertEqual(updated.status, LessonTranscript.Status.REVIEWED)
        self.assertEqual(updated.segments.first().text, "hello updated world")

        published = publish_transcript(updated, self.user)
        self.assertEqual(published.status, LessonTranscript.Status.PUBLISHED)
