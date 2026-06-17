from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import F
from django.http import FileResponse, Http404
from django.shortcuts import redirect
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.pagination import paginate_queryset
from utils.roles import is_active_admin, is_active_instructor
from lessons.models import Lesson
from .serializers import LessonAttachmentSerializer
from .services import (
    create_lesson_attachment,
    get_lesson_attachments_by_lesson,
    update_lesson_attachment,
    delete_lesson_attachment,
    get_all_lesson_attachments,
)
from .models import LessonAttachment
from utils.course_access import check_course_access
from utils.permissions import RolePermissionFactory


def _ensure_instructor_can_manage_lesson(user, lesson_id):
    if is_active_admin(user):
        return
    if not is_active_instructor(user):
        raise PermissionDenied("You do not have permission to manage lesson resources.")

    lesson = Lesson.objects.select_related('coursemodule__course').filter(id=lesson_id, is_deleted=False).first()
    course = lesson.coursemodule.course if lesson and lesson.coursemodule else None
    if not course:
        raise ValidationError({"error": "Lesson does not belong to a course."})
    if course.instructor_id != user.instructor.id:
        raise PermissionDenied("You can only manage resources for your own courses.")


def _ensure_instructor_can_manage_attachment(user, attachment):
    if is_active_admin(user):
        return
    if not is_active_instructor(user):
        raise PermissionDenied("You do not have permission to manage lesson resources.")

    lesson = attachment.lesson
    course = lesson.coursemodule.course if lesson and lesson.coursemodule else None
    if not course:
        raise ValidationError({"error": "Lesson does not belong to a course."})
    if course.instructor_id != user.instructor.id:
        raise PermissionDenied("You can only manage resources for your own courses.")


def _attachment_filename(attachment):
    parsed_path = urlparse(attachment.file_path or '').path
    filename = Path(parsed_path).name
    if filename:
        return filename
    return f'attachment-{attachment.id}.pdf'


def _local_upload_path(file_path):
    parsed_path = urlparse(file_path or '').path
    if not parsed_path:
        return None

    uploads_root = (settings.BASE_DIR / 'uploads').resolve()
    target = (settings.BASE_DIR / parsed_path.lstrip('/')).resolve()
    if target.is_file() and target.is_relative_to(uploads_root):
        return target
    return None


class LessonAttachmentManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def _is_admin_or_instructor(self, user):
        return bool(is_active_admin(user) or is_active_instructor(user))

    def post(self, request):
        if not self._is_admin_or_instructor(request.user):
            return Response({"errors": {"error": "Bạn không có quyền truy cập."}}, status=status.HTTP_403_FORBIDDEN)
        try:
            _ensure_instructor_can_manage_lesson(request.user, request.data.get('lesson'))
            lesson_attachment = create_lesson_attachment(request.data)
            return Response(lesson_attachment, status=status.HTTP_201_CREATED)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, lesson_id):
        try:
            if self._is_admin_or_instructor(request.user):
                _ensure_instructor_can_manage_lesson(request.user, lesson_id)
            else:
                lesson = Lesson.objects.select_related('coursemodule__course').filter(id=lesson_id, is_deleted=False).first()
                if not lesson or not lesson.coursemodule or not lesson.coursemodule.course:
                    raise ValidationError({"error": "Lesson không tồn tại."})
                check_course_access(request.user, lesson.coursemodule.course)

            lesson_attachments = get_lesson_attachments_by_lesson(lesson_id)
            return paginate_queryset(lesson_attachments, request, LessonAttachmentSerializer)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def patch (self, request, attachment_id):
        if not self._is_admin_or_instructor(request.user):
            return Response({"errors": {"error": "Bạn không có quyền truy cập."}}, status=status.HTTP_403_FORBIDDEN)
        try:
            attachment = LessonAttachment.objects.select_related('lesson__coursemodule__course').get(id=attachment_id)
            _ensure_instructor_can_manage_attachment(request.user, attachment)
            updated_lesson_attachment = update_lesson_attachment(attachment_id, request.data)
            return Response(updated_lesson_attachment, status=status.HTTP_200_OK)
        except LessonAttachment.DoesNotExist:
            return Response({"errors": {"error": "Lesson attachment not found."}}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, attachment_id):
        if not self._is_admin_or_instructor(request.user):
            return Response({"errors": {"error": "Bạn không có quyền truy cập."}}, status=status.HTTP_403_FORBIDDEN)
        try:
            attachment = LessonAttachment.objects.select_related('lesson__coursemodule__course').get(id=attachment_id)
            _ensure_instructor_can_manage_attachment(request.user, attachment)
            response = delete_lesson_attachment(attachment_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except LessonAttachment.DoesNotExist:
            return Response({"errors": {"error": "Lesson attachment not found."}}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class LessonAttachmentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request, attachment_id):
        try:
            attachment = LessonAttachment.objects.select_related('lesson__coursemodule__course').get(id=attachment_id)
            _ensure_instructor_can_manage_attachment(request.user, attachment)
            serializer = LessonAttachmentSerializer(attachment)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except LessonAttachment.DoesNotExist:
            return Response({"errors": {"error": "Lesson attachment not found."}}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class LessonAttachmentDownloadView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def _is_admin_or_instructor(self, user):
        return bool(is_active_admin(user) or is_active_instructor(user))

    def _mark_downloaded(self, attachment_id):
        LessonAttachment.objects.filter(id=attachment_id).update(
            download_count=F('download_count') + 1
        )

    def get(self, request, attachment_id):
        try:
            attachment = LessonAttachment.objects.select_related(
                'lesson__coursemodule__course'
            ).get(id=attachment_id, is_deleted=False)

            lesson = attachment.lesson
            course = lesson.coursemodule.course if lesson and lesson.coursemodule else None
            if not course:
                raise ValidationError({"error": "Lesson does not belong to a course."})

            if not self._is_admin_or_instructor(request.user):
                check_course_access(request.user, course)

            file_path = attachment.file_path or ''
            if file_path.startswith(('http://', 'https://')):
                self._mark_downloaded(attachment.id)
                return redirect(file_path)
            if file_path.startswith('//'):
                self._mark_downloaded(attachment.id)
                return redirect(f'https:{file_path}')

            filename = _attachment_filename(attachment)
            local_path = _local_upload_path(file_path)
            if local_path:
                self._mark_downloaded(attachment.id)
                return FileResponse(
                    open(local_path, 'rb'),
                    as_attachment=True,
                    filename=filename,
                    content_type=attachment.file_type or 'application/octet-stream',
                )

            raise Http404('Attachment file not found.')
        except LessonAttachment.DoesNotExist:
            return Response({"errors": {"error": "Lesson attachment not found."}}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as e:
            return Response({"errors": {"error": str(e)}}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class LessonAttachmentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            filters = {}
            if request.query_params.get('instructor_id'):
                filters['instructor_id'] = request.query_params.get('instructor_id')
            if is_active_instructor(request.user) and not is_active_admin(request.user):
                filters['instructor_id'] = request.user.instructor.id
            if request.query_params.get('course_id'):
                filters['course_id'] = request.query_params.get('course_id')
            if request.query_params.get('file_type'):
                filters['file_type'] = request.query_params.get('file_type')
            if request.query_params.get('search'):
                filters['search'] = request.query_params.get('search')
            if request.query_params.get('sort_by'):
                filters['sort_by'] = request.query_params.get('sort_by')
            lesson_attachments = get_all_lesson_attachments(filters if filters else None)
            return paginate_queryset(lesson_attachments, request, LessonAttachmentSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
