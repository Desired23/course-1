from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .models import Instructor
from .serializers import InstructorSerializers
from .services import (
    create_instructor,
    update_instructor,
    delete_instructor,
    get_instructors,
    get_instructor_by_id
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
class InstructorListView(APIView):
    print("InstructorListView")
    def get(self, request):
        instructors = get_instructors()
        return paginate_queryset(instructors, request, InstructorSerializers)

class InstructorDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]

    def get(self, request, instructor_id):
        try:
            instructor = get_instructor_by_id(instructor_id)
            return Response(instructor, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, instructor_id):
        try:
            updated_instructor = update_instructor(instructor_id, request.data)
            return Response(InstructorSerializers(updated_instructor).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, instructor_id):
        try:
            result = delete_instructor(instructor_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class InstructorCreateView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request):
        try:
            instructor = create_instructor(request.data)
            return Response(InstructorSerializers(instructor).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

