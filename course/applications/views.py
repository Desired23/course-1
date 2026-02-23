from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    submit_application,
    get_user_applications,
    get_application_detail,
    get_all_applications,
    review_application,
    resubmit_application,
)
from .serializers import ApplicationListSerializer
from utils.pagination import paginate_queryset


class ApplicationSubmitView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request):
        try:
            result = submit_application(request.user, request.data)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationUserView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request):
        try:
            application_id = request.query_params.get('application_id')
            if application_id:
                result = get_application_detail(int(application_id), user=request.user)
                return Response(result, status=status.HTTP_200_OK)
            results = get_user_applications(request.user)
            return paginate_queryset(results, request, ApplicationListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class ApplicationResubmitView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def put(self, request, application_id):
        try:
            result = resubmit_application(application_id, request.user, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request):
        try:
            application_id = request.query_params.get('application_id')
            if application_id:
                result = get_application_detail(int(application_id))
                return Response(result, status=status.HTTP_200_OK)
            filters = {
                'status': request.query_params.get('status'),
                'form_id': request.query_params.get('form_id'),
                'user_id': request.query_params.get('user_id'),
            }
            results = get_all_applications(filters)
            return paginate_queryset(results, request, ApplicationListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class ApplicationReviewView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request, application_id):
        try:
            result = review_application(application_id, request.user, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
