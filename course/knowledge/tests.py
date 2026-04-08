import os
import tempfile

from django.test import TestCase
from django.urls import Resolver404, resolve

from coursemodules.models import CourseModule
from courses.models import Course
from instructors.models import Instructor
from knowledge.models import KnowledgeIngestJob
from lesson_attachments.services import create_lesson_attachment, update_lesson_attachment
from lessons.models import Lesson
from transcripts.services import (
    enqueue_transcript_generation,
    persist_transcription_result,
    publish_transcript,
    update_transcript,
)
from users.models import User


class KnowledgeLegacyRegressionTests(TestCase):
    def setUp(self):
        self.instructor_user = User.objects.create(
            username="inst-legacy",
            email="inst-legacy@example.com",
            password_hash="secret",
            full_name="Instructor Legacy",
            user_type=User.UserTypeChoices.INSTRUCTOR,
            status=User.StatusChoices.ACTIVE,
        )
        self.instructor = Instructor.objects.create(user=self.instructor_user)
        self.course = Course.objects.create(
            title="Legacy AI Course",
            shortdescription="short",
            description="desc",
            instructor=self.instructor,
            price=0,
            status=Course.Status.PUBLISHED,
            is_public=True,
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
            status=Lesson.Status.PUBLISHED,
        )

    @staticmethod
    def _build_result(text="Python classes and methods"):
        words = text.split()
        return type(
            "Result",
            (),
            {
                "language_code": "en",
                "text": text,
                "segments": [
                    {
                        "start_ms": 0,
                        "end_ms": 1500,
                        "text": text,
                        "words": [
                            {
                                "text": word,
                                "start_ms": index * 300,
                                "end_ms": (index + 1) * 300,
                                "confidence": 0.9,
                            }
                            for index, word in enumerate(words)
                        ],
                    }
                ],
            },
        )()

    def test_transcript_update_and_publish_do_not_enqueue_knowledge_jobs(self):
        job = enqueue_transcript_generation(self.lesson)
        transcript = persist_transcription_result(job, self._build_result())

        update_transcript(
            transcript,
            {
                "segments": [
                    {
                        "id": transcript.segments.first().id,
                        "text": "Updated transcript content",
                    }
                ]
            },
        )
        publish_transcript(transcript, self.instructor_user)

        self.assertEqual(KnowledgeIngestJob.objects.count(), 0)

    def test_attachment_create_and_update_do_not_enqueue_knowledge_jobs(self):
        fd, attachment_path = tempfile.mkstemp(suffix=".txt")
        os.close(fd)
        try:
            with open(attachment_path, "w", encoding="utf-8") as handle:
                handle.write("Lesson notes")

            created = create_lesson_attachment(
                {
                    "lesson": self.lesson.id,
                    "title": "Lesson Notes",
                    "file_path": attachment_path,
                    "file_type": "txt",
                    "file_size": 20,
                }
            )

            update_lesson_attachment(created["id"], {"title": "Lesson Notes v2"})

            self.assertEqual(KnowledgeIngestJob.objects.count(), 0)
        finally:
            if os.path.exists(attachment_path):
                os.remove(attachment_path)

    def test_removed_knowledge_and_assistant_routes_are_not_registered(self):
        removed_paths = [
            "/api/internal/knowledge/ingest",
            "/api/internal/knowledge/documents",
            "/api/internal/knowledge/search",
            "/api/internal/ai/course-assistant/answer",
            "/api/course-assistant/conversations",
            "/api/course-assistant/conversations/1",
            "/api/course-assistant/conversations/1/messages",
            "/api/lessons/1/transcript/ai",
        ]

        for path in removed_paths:
            with self.assertRaises(Resolver404):
                resolve(path)

    def test_transcript_routes_still_resolve(self):
        self.assertEqual(resolve("/api/lessons/1/transcript").url_name, "lesson-transcript-public")
        self.assertEqual(resolve("/api/lessons/1/transcript/editor").url_name, "lesson-transcript-editor")
        self.assertEqual(resolve("/api/lessons/1/transcript/generate").url_name, "lesson-transcript-generate")
        self.assertEqual(resolve("/api/transcripts/1").url_name, "transcript-detail")
        self.assertEqual(resolve("/api/transcripts/1/publish").url_name, "transcript-publish")
        self.assertEqual(resolve("/api/transcript-jobs/1").url_name, "transcript-job-status")
