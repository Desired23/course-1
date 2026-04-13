from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.pagination import paginate_queryset
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
from utils.course_access import check_course_access
from utils.permissions import RolePermissionFactory

class LessonAttachmentManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def _is_admin_or_instructor(self, user):
        return bool(getattr(user, 'admin', None) or getattr(user, 'instructor', None))

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
