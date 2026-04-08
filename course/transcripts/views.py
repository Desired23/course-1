from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from lessons.models import Lesson
from utils.permissions import RolePermissionFactory

from .models import LessonTranscript, TranscriptJob
from .serializers import LessonTranscriptSerializer, TranscriptJobSerializer, TranscriptUpdateSerializer
from .services import (
    assert_transcript_management_access,
    enqueue_transcript_generation,
    get_editor_transcripts_for_lesson,
    get_published_transcript_for_lesson,
    publish_transcript,
    update_transcript,
)


class LessonTranscriptGenerateView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = "burst"

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related("coursemodule__course").get(id=lesson_id)
            assert_transcript_management_access(request.user, lesson)
            job = enqueue_transcript_generation(
                lesson,
                trigger_source=TranscriptJob.TriggerSource.MANUAL,
                force=True,
            )
            if not job:
                return Response(
                    {"error": "Transcript generation is only available for video lessons with a video source."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(TranscriptJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class LessonTranscriptPublicView(APIView):
    permission_classes = [RolePermissionFactory(["student", "instructor", "admin"])]
    throttle_scope = "burst"

    def get(self, request, lesson_id):
        include_words = request.query_params.get("include_words", "").lower() in ("1", "true", "yes")
        try:
            transcript = get_published_transcript_for_lesson(lesson_id)
            return Response(
                LessonTranscriptSerializer(
                    transcript,
                    context={"include_words": include_words, "include_chunks": False},
                ).data,
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)


class LessonTranscriptEditorView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = "burst"

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related("coursemodule__course").get(id=lesson_id)
            assert_transcript_management_access(request.user, lesson)
            data = get_editor_transcripts_for_lesson(lesson_id)
            return Response(
                {
                    "latest": LessonTranscriptSerializer(
                        data["latest"],
                        context={"include_words": True, "include_chunks": True},
                    ).data if data["latest"] else None,
                    "published": LessonTranscriptSerializer(
                        data["published"],
                        context={"include_words": True, "include_chunks": True},
                    ).data if data["published"] else None,
                    "latest_job": TranscriptJobSerializer(data["latest_job"]).data if data["latest_job"] else None,
                },
                status=status.HTTP_200_OK,
            )
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class TranscriptDetailView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = "burst"

    def patch(self, request, transcript_id):
        try:
            transcript = LessonTranscript.objects.select_related("lesson__coursemodule__course").prefetch_related(
                "segments", "chunks", "segments__words"
            ).get(id=transcript_id)
            assert_transcript_management_access(request.user, transcript.lesson)
            serializer = TranscriptUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated = update_transcript(transcript, serializer.validated_data)
            return Response(
                LessonTranscriptSerializer(
                    updated,
                    context={"include_words": True, "include_chunks": True},
                ).data,
                status=status.HTTP_200_OK,
            )
        except LessonTranscript.DoesNotExist:
            return Response({"error": "Transcript not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class TranscriptPublishView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = "burst"

    def post(self, request, transcript_id):
        try:
            transcript = LessonTranscript.objects.select_related("lesson__coursemodule__course").prefetch_related(
                "segments__words", "chunks"
            ).get(id=transcript_id)
            assert_transcript_management_access(request.user, transcript.lesson)
            published = publish_transcript(transcript, request.user)
            return Response(
                LessonTranscriptSerializer(
                    published,
                    context={"include_words": True, "include_chunks": True},
                ).data,
                status=status.HTTP_200_OK,
            )
        except LessonTranscript.DoesNotExist:
            return Response({"error": "Transcript not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class TranscriptJobStatusView(APIView):
    permission_classes = [RolePermissionFactory(["instructor", "admin"])]
    throttle_scope = "burst"

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related("coursemodule__course").get(id=lesson_id)
            assert_transcript_management_access(request.user, lesson)
            jobs = lesson.transcript_jobs.all().order_by("-created_at")[:10]
            return Response(
                {
                    "lesson_id": lesson_id,
                    "results": TranscriptJobSerializer(jobs, many=True).data,
                },
                status=status.HTTP_200_OK,
            )
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
