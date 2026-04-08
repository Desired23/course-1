from django.urls import path

from .views import (
    LessonTranscriptEditorView,
    LessonTranscriptGenerateView,
    LessonTranscriptPublicView,
    TranscriptDetailView,
    TranscriptJobStatusView,
    TranscriptPublishView,
)

urlpatterns = [
    path("lessons/<int:lesson_id>/transcript/generate", LessonTranscriptGenerateView.as_view(), name="lesson-transcript-generate"),
    path("lessons/<int:lesson_id>/transcript", LessonTranscriptPublicView.as_view(), name="lesson-transcript-public"),
    path("lessons/<int:lesson_id>/transcript/editor", LessonTranscriptEditorView.as_view(), name="lesson-transcript-editor"),
    path("transcripts/<int:transcript_id>", TranscriptDetailView.as_view(), name="transcript-detail"),
    path("transcripts/<int:transcript_id>/publish", TranscriptPublishView.as_view(), name="transcript-publish"),
    path("transcript-jobs/<int:lesson_id>", TranscriptJobStatusView.as_view(), name="transcript-job-status"),
]
