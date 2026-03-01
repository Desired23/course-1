from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser
from .cloudinary_upload import upload_file_to_cloudinary, delete_file_from_cloudinary
class UploadFileView(APIView):
    parser_classes = [MultiPartParser, JSONParser]
    throttle_scope = 'upload'
    def post(self, request):
        file = request.FILES.getlist("files")
        if not file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            upload_result = upload_file_to_cloudinary(file)
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
