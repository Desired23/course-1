from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import F
from django.http import FileResponse, Http404
from django.shortcuts import redirect
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
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
    find_lesson_attachment_by_id,
    update_lesson_attachment,
    delete_lesson_attachment,
    get_all_lesson_attachments,
)
from .models import LessonAttachment
from utils.course_access import check_course_access
from utils.permissions import RolePermissionFactory


def _safe_pdf_text(value):
    return str(value or '').encode('latin-1', 'replace').decode('latin-1')


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


def _seed_resource_pdf(attachment):
    buffer = BytesIO()
    page = canvas.Canvas(buffer, pagesize=A4)
    _, height = A4
    page.setTitle(_safe_pdf_text(attachment.title or _attachment_filename(attachment)))
    page.setFont('Helvetica-Bold', 18)
    page.drawString(72, height - 72, 'Course Lesson Resource')
    page.setFont('Helvetica', 11)
    lines = [
        f'Title: {attachment.title or "Lesson resource"}',
        f'Attachment ID: {attachment.id}',
        'This PDF is generated for seeded demo data.',
        'Upload a real file or paste an external file URL to replace it.',
    ]
    y = height - 112
    for line in lines:
        page.drawString(72, y, _safe_pdf_text(line))
        y -= 20
    page.showPage()
    page.save()
    buffer.seek(0)
    return buffer


class LessonAttachmentManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def _is_admin_or_instructor(self, user):
        return bool(is_active_admin(user) or is_active_instructor(user))

    def post(self, request):
        if not self._is_admin_or_instructor(request.user):
            return Response({"errors": {"error": "Bạn không có quyền truy cập."}}, status=status.HTTP_403_FORBIDDEN)
        try:
            lesson_attachment = create_lesson_attachment(request.data)
            return Response(lesson_attachment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, lesson_id):
        try:
            if not self._is_admin_or_instructor(request.user):
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
            updated_lesson_attachment = update_lesson_attachment(attachment_id, request.data)
            return Response(updated_lesson_attachment, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, attachment_id):
        if not self._is_admin_or_instructor(request.user):
            return Response({"errors": {"error": "Bạn không có quyền truy cập."}}, status=status.HTTP_403_FORBIDDEN)
        try:
            response = delete_lesson_attachment(attachment_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class LessonAttachmentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request, attachment_id):
        try:
            lesson_attachment = find_lesson_attachment_by_id(attachment_id)
            return Response(lesson_attachment, status=status.HTTP_200_OK)
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

            if file_path.startswith('/uploads/resources/') and filename.lower().endswith('.pdf'):
                self._mark_downloaded(attachment.id)
                return FileResponse(
                    _seed_resource_pdf(attachment),
                    as_attachment=True,
                    filename=filename,
                    content_type='application/pdf',
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
