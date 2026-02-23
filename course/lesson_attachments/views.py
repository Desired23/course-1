from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.pagination import paginate_queryset
from .serializers import LessonAttachmentSerializer
from .services import (
    create_lesson_attachment,
    get_lesson_attachments_by_lesson,
    find_lesson_attachment_by_id,
    update_lesson_attachment,
    delete_lesson_attachment,
    get_all_lesson_attachments,
)
from utils.permissions import RolePermissionFactory

class LessonAttachmentManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def post(self, request):
        try:
            lesson_attachment = create_lesson_attachment(request.data)
            return Response(lesson_attachment, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, lesson_id):
        try:
            lesson_attachments = get_lesson_attachments_by_lesson(lesson_id)
            return paginate_queryset(lesson_attachments, request, LessonAttachmentSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def patch (self, request, attachment_id):
        try:
            updated_lesson_attachment = update_lesson_attachment(attachment_id, request.data)
            return Response(updated_lesson_attachment, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, attachment_id):
        try:
            response = delete_lesson_attachment(attachment_id)
            return Response(response, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

class LessonAttachmentDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def get(self, request, attachment_id):
        try:
            lesson_attachment = find_lesson_attachment_by_id(attachment_id)
            return Response(lesson_attachment, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        
class LessonAttachmentListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def get(self, request):
        try:
            lesson_attachments = get_all_lesson_attachments()
            return paginate_queryset(lesson_attachments, request, LessonAttachmentSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)