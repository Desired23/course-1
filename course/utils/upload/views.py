from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser
from .cloudinary_upload import upload_file_to_cloudinary, delete_file_from_cloudinary

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_UPLOAD_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
}

class UploadFileView(APIView):
    parser_classes = [MultiPartParser, JSONParser]
    throttle_scope = 'upload'
    def post(self, request):
        file = request.FILES.getlist("files")
        if not file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        for item in file:
            mime_type = getattr(item, 'content_type', '') or 'application/octet-stream'
            file_size = getattr(item, 'size', 0) or 0
            if file_size > MAX_UPLOAD_SIZE_BYTES:
                return Response({"detail": f"File {item.name} exceeds the 25MB limit."}, status=status.HTTP_400_BAD_REQUEST)
            if mime_type not in ALLOWED_UPLOAD_MIME_TYPES:
                return Response({"detail": f"File type {mime_type} is not allowed."}, status=status.HTTP_400_BAD_REQUEST)

        folder = request.data.get("folder") or "uploads"
        resource_type = request.data.get("resource_type") or "auto"
        delivery_type = request.data.get("delivery_type") or "upload"

        try:
            upload_result = upload_file_to_cloudinary(
                file,
                folder=folder,
                resource_type=resource_type,
                delivery_type=delivery_type,
            )
            return Response(upload_result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def delete(self, request):
        public_id = request.data.get("public_ids")
        if not public_id:
            return Response({"detail": "No public_id provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = delete_file_from_cloudinary(public_id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
