from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .services import (
    update_learning_progress,
    get_learning_progress,
    get_all_learning_progress_by_enrollment,
    delete_learning_progress
)


class LearningProgressView(APIView):
    def post(self, request):
        try:
            enrollment_id = request.data.get('enrollment_id')
            lesson_id = request.data.get('lesson_id')
            progress_data = request.data.get('progress_data', {})
            result = update_learning_progress(enrollment_id, lesson_id, progress_data)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def get(self, request):
        try:
            enrollment_id = request.query_params.get('enrollment_id')
            lesson_id = request.query_params.get('lesson_id')
            if enrollment_id and lesson_id:
                result = get_learning_progress(enrollment_id, lesson_id)
            elif enrollment_id:
                result = get_all_learning_progress_by_enrollment(enrollment_id)
            else:
                raise ValidationError("Cung cấp enrollment_id hoặc lesson_id.")
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def delete(self, request):
        try:
            enrollment_id = request.query_params.get('enrollment_id')
            lesson_id = request.query_params.get('lesson_id')
            if not enrollment_id or not lesson_id:
                raise ValidationError("Cung cấp enrollment_id và lesson_id.")
            delete_learning_progress(enrollment_id, lesson_id)
            return Response({"message": "Learning progress deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)